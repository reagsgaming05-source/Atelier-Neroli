import QRCode from "qrcode";
import {
  chargeUtileQrFacture,
  formaterIban,
  formaterReference,
  type Adresse,
  type QrFacture,
} from "@/lib/qr-facture";

/**
 * La section paiement d'une QR-facture, telle qu'on la détache en bas d'une
 * facture suisse : un récépissé à gauche, la section paiement à droite, et le
 * code QR avec la croix suisse au milieu.
 *
 * Les dimensions sont normatives et exprimées en millimètres : 210 × 105 mm en
 * tout, un code QR de 46 × 46 mm, une croix de 7 × 7 mm. C'est ce que la
 * machine de tri de la banque attend, et c'est pourquoi rien ici n'est en
 * pixels ni en rem.
 */

const MM = (n: number) => `${n}mm`;

/** Le code QR, en SVG, avec la croix suisse au centre. */
async function CodeQr({ texte }: { texte: string }) {
  // Niveau de correction M : imposé par la norme, et c'est lui qui laisse
  // assez de redondance pour que la croix au centre ne gêne pas la lecture.
  const qr = QRCode.create(texte, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const data = qr.modules.data;

  // Un seul chemin plutôt que des milliers de rectangles : le SVG reste léger
  // et l'impression ne laisse pas de filets blancs entre les modules.
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (data[y * n + x]) d += `M${x},${y}h1v1h-1z`;
    }
  }

  // La croix occupe 7 mm sur les 46 mm du code, centrée.
  const cote = (7 / 46) * n;
  const debut = (n - cote) / 2;
  const blanc = cote * 1.12; // le liseré blanc autour du carré noir
  const debutBlanc = (n - blanc) / 2;
  const barreLongue = cote * 0.62;
  const barreCourte = cote * 0.19;

  return (
    <svg
      // Déclaré explicitement : sans lui, le SVG n'est pas un document
      // autonome et ne se relit pas hors de la page — ni comme image, ni par
      // un lecteur de code QR.
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${n} ${n}`}
      width={MM(46)}
      height={MM(46)}
      role="img"
      aria-label="Code QR de paiement (QR-facture suisse)"
      shapeRendering="crispEdges"
    >
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#000" />
      <rect x={debutBlanc} y={debutBlanc} width={blanc} height={blanc} fill="#fff" />
      <rect x={debut} y={debut} width={cote} height={cote} fill="#000" />
      <rect
        x={(n - barreCourte) / 2}
        y={(n - barreLongue) / 2}
        width={barreCourte}
        height={barreLongue}
        fill="#fff"
      />
      <rect
        x={(n - barreLongue) / 2}
        y={(n - barreCourte) / 2}
        width={barreLongue}
        height={barreCourte}
        fill="#fff"
      />
    </svg>
  );
}

function LignesAdresse({ adresse }: { adresse: Adresse }) {
  const rue = [adresse.rue, adresse.numero].filter(Boolean).join(" ");
  const ville = [adresse.npa, adresse.localite].filter(Boolean).join(" ");
  return (
    <>
      <div>{adresse.nom}</div>
      {rue ? <div>{rue}</div> : null}
      {ville ? <div>{ville}</div> : null}
    </>
  );
}

const Titre = ({ children }: { children: React.ReactNode }) => (
  <div className="qrb-titre">{children}</div>
);

export async function SectionPaiement({ facture }: { facture: QrFacture }) {
  const texte = chargeUtileQrFacture(facture);
  const montant = facture.montant == null ? null : facture.montant.toFixed(2);
  const monnaie = facture.monnaie ?? "CHF";
  const iban = formaterIban(facture.iban);
  const reference = facture.reference ? formaterReference(facture.reference) : null;

  return (
    <section className="qr-bulletin" aria-label="Section paiement">
      {/* ---------------- Récépissé : 62 mm ---------------- */}
      <div className="qrb-recepisse">
        <div className="qrb-entete">Récépissé</div>
        <div className="qrb-bloc">
          <Titre>Compte / Payable à</Titre>
          <div>{iban}</div>
          <LignesAdresse adresse={facture.creancier} />
        </div>
        {reference ? (
          <div className="qrb-bloc">
            <Titre>Référence</Titre>
            <div>{reference}</div>
          </div>
        ) : null}
        <div className="qrb-bloc">
          <Titre>Payable par</Titre>
          {facture.debiteur ? (
            <LignesAdresse adresse={facture.debiteur} />
          ) : (
            <div className="qrb-champ qrb-champ-petit" aria-hidden />
          )}
        </div>
        <div className="qrb-montant">
          <div>
            <Titre>Monnaie</Titre>
            <div>{monnaie}</div>
          </div>
          <div>
            <Titre>Montant</Titre>
            <div>{montant ?? <span className="qrb-champ qrb-champ-montant" aria-hidden />}</div>
          </div>
        </div>
        <div className="qrb-acceptation">Point de dépôt</div>
      </div>

      {/* ---------------- Section paiement : 148 mm ---------------- */}
      <div className="qrb-paiement">
        <div className="qrb-colonne-gauche">
          <div className="qrb-entete">Section paiement</div>
          <div className="qrb-code">
            <CodeQr texte={texte} />
          </div>
          <div className="qrb-montant qrb-montant-large">
            <div>
              <Titre>Monnaie</Titre>
              <div>{monnaie}</div>
            </div>
            <div>
              <Titre>Montant</Titre>
              <div>{montant ?? <span className="qrb-champ qrb-champ-montant" aria-hidden />}</div>
            </div>
          </div>
        </div>
        <div className="qrb-colonne-droite">
          <div className="qrb-bloc">
            <Titre>Compte / Payable à</Titre>
            <div>{iban}</div>
            <LignesAdresse adresse={facture.creancier} />
          </div>
          {reference ? (
            <div className="qrb-bloc">
              <Titre>Référence</Titre>
              <div>{reference}</div>
            </div>
          ) : null}
          {facture.message ? (
            <div className="qrb-bloc">
              <Titre>Informations supplémentaires</Titre>
              <div>{facture.message}</div>
            </div>
          ) : null}
          <div className="qrb-bloc">
            <Titre>Payable par</Titre>
            {facture.debiteur ? (
              <LignesAdresse adresse={facture.debiteur} />
            ) : (
              <div className="qrb-champ qrb-champ-grand" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
