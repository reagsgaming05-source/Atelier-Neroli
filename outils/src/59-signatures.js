  // =====================================================================
  //  Vérifier les signatures d'un PDF reçu
  //  -------------------------------------------------------------------
  //  Une décision signée par un chef de service, un contrat reçu d'un
  //  fournisseur : avant de s'y fier, on veut savoir si le contenu signé est
  //  celui qui a été signé, ce qui a pu être ajouté ensuite, et qui a signé.
  //  Tout se fait sur le poste, avec les fonctions de cryptographie du moteur
  //  d'affichage (WebCrypto) : rien n'est envoyé nulle part.
  //
  //  Ce que ce contrôle établit, preuve à l'appui :
  //   - le contenu signé n'a pas changé depuis la signature (empreinte et
  //     signature recalculées, pas seulement lues) ;
  //   - si des données ont été ajoutées au fichier après cette signature ;
  //   - qui est le signataire d'après son certificat, la chaîne de certificats
  //     jointe, et la validité du certificat à la date de la signature.
  //  Ce qu'il n'établit PAS, et dit :
  //   - que l'autorité qui a délivré le certificat est digne de confiance : ce
  //     logiciel ne porte aucune liste d'autorités reconnues. Un certificat
  //     « auto-signé » peut être fabriqué par n'importe qui, au nom de n'importe qui ;
  //   - que le certificat n'a pas été révoqué (il faudrait interroger l'autorité) ;
  //   - la valeur légale de la signature (loi fédérale sur la signature
  //     électronique) : seule une validation par un prestataire reconnu en donne une.
  // =====================================================================
  // @debut-signatures
  // --- ASN.1 : DER, et BER à longueur indéfinie (certains signataires en produisent) ---
  function derNoeud(u8, pos, limite) {
    if (pos >= limite) throw new Error('fin des données inattendue');
    const b0 = u8[pos];
    let tag = b0 & 0x1f, p = pos + 1;
    if (tag === 0x1f) { tag = 0; let b; do { if (p >= limite) throw new Error('étiquette tronquée'); b = u8[p++]; tag = (tag << 7) | (b & 0x7f); } while (b & 0x80); }
    if (p >= limite) throw new Error('longueur absente');
    const l0 = u8[p++];
    let len = 0, indefini = false;
    if (l0 < 0x80) len = l0;
    else if (l0 === 0x80) indefini = true;
    else {
      const n = l0 & 0x7f;
      if (n > 4) throw new Error('longueur trop grande');
      for (let i = 0; i < n; i++) { if (p >= limite) throw new Error('longueur tronquée'); len = len * 256 + u8[p++]; }
    }
    const n = { u8, classe: b0 >> 6, cons: !!(b0 & 0x20), tag, octet: b0, debut: pos, valeur: p, fin: 0, finValeur: 0, indefini, enfants: null };
    if (indefini) {
      if (!n.cons) throw new Error('longueur indéfinie sur un type simple');
      const enfants = [];
      let q = p;
      for (;;) {
        if (q + 1 >= limite) throw new Error('fin de contenu manquante');
        if (u8[q] === 0 && u8[q + 1] === 0) { n.finValeur = q; q += 2; break; }
        const e = derNoeud(u8, q, limite);
        enfants.push(e);
        q = e.fin;
      }
      n.enfants = enfants; n.fin = q;
    } else {
      if (p + len > limite) throw new Error('longueur au-delà des données');
      n.fin = n.finValeur = p + len;
      if (n.cons) {
        const enfants = [];
        let q = p;
        while (q < n.fin) { const e = derNoeud(u8, q, n.fin); enfants.push(e); q = e.fin; }
        n.enfants = enfants;
      }
    }
    return n;
  }
  const derContenu = n => n.u8.subarray(n.valeur, n.finValeur);
  const derBrut = n => n.u8.subarray(n.debut, n.fin);
  const derHex = u8 => Array.from(u8, b => b.toString(16).padStart(2, '0')).join('');
  function derOid(n) {
    const b = derContenu(n);
    if (!b.length) return '';
    const out = [Math.floor(b[0] / 40), b[0] % 40];
    let v = 0;
    for (let i = 1; i < b.length; i++) { v = v * 128 + (b[i] & 0x7f); if (!(b[i] & 0x80)) { out.push(v); v = 0; } }
    return out.join('.');
  }
  function derTexte(n) {
    const b = derContenu(n);
    if (n.tag === 30) { let s = ''; for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode(b[i] * 256 + b[i + 1]); return s; }
    if (n.tag === 12) return new TextDecoder('utf-8').decode(b);
    return Array.from(b, c => String.fromCharCode(c)).join('');
  }
  function derDate(n) {
    const t = derTexte(n);
    const m = n.tag === 23 ? /^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z$/.exec(t) : /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z$/.exec(t);
    if (!m) return null;
    const an = n.tag === 23 ? (+m[1] >= 50 ? 1900 + +m[1] : 2000 + +m[1]) : +m[1];
    return new Date(Date.UTC(an, +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
  }
  const egaux = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  const OID_NOMS = { '2.5.4.3': 'CN', '2.5.4.10': 'O', '2.5.4.11': 'OU', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.5': 'numéro de série', '2.5.4.42': 'prénom', '2.5.4.4': 'nom', '1.2.840.113549.1.9.1': 'courriel' };
  function nomLire(n) {
    const champs = {};
    const liste = [];
    (n.enfants || []).forEach(rdn => (rdn.enfants || []).forEach(atv => {
      const o = OID_NOMS[derOid(atv.enfants[0])] || derOid(atv.enfants[0]);
      const v = derTexte(atv.enfants[1]);
      if (!(o in champs)) champs[o] = v;
      liste.push(o + '=' + v);
    }));
    return { champs, texte: liste.join(', '), octets: derBrut(n) };
  }

  const HACHAGES = {
    '1.3.14.3.2.26': 'SHA-1', '2.16.840.1.101.3.4.2.1': 'SHA-256', '2.16.840.1.101.3.4.2.2': 'SHA-384', '2.16.840.1.101.3.4.2.3': 'SHA-512',
    '2.16.840.1.101.3.4.2.4': 'SHA-224',
  };
  // Algorithme de signature -> { famille, hachage }
  const SIGNATURES = {
    '1.2.840.113549.1.1.1': { famille: 'rsa' }, '1.2.840.113549.1.1.5': { famille: 'rsa', hachage: 'SHA-1' },
    '1.2.840.113549.1.1.11': { famille: 'rsa', hachage: 'SHA-256' }, '1.2.840.113549.1.1.12': { famille: 'rsa', hachage: 'SHA-384' },
    '1.2.840.113549.1.1.13': { famille: 'rsa', hachage: 'SHA-512' }, '1.2.840.113549.1.1.14': { famille: 'rsa', hachage: 'SHA-224' },
    '1.2.840.113549.1.1.10': { famille: 'pss' },
    '1.2.840.10045.4.1': { famille: 'ecdsa', hachage: 'SHA-1' }, '1.2.840.10045.4.3.2': { famille: 'ecdsa', hachage: 'SHA-256' },
    '1.2.840.10045.4.3.3': { famille: 'ecdsa', hachage: 'SHA-384' }, '1.2.840.10045.4.3.4': { famille: 'ecdsa', hachage: 'SHA-512' },
    '1.2.840.10045.2.1': { famille: 'ecdsa' },
  };
  const COURBES = { '1.2.840.10045.3.1.7': ['P-256', 32], '1.3.132.0.34': ['P-384', 48], '1.3.132.0.35': ['P-521', 66] };

  // Un certificat X.509 : de quoi nommer le signataire et vérifier la chaîne.
  function certLire(u8) {
    const c = derNoeud(u8, 0, u8.length);
    const [tbs, alg, sig] = c.enfants;
    let i = tbs.enfants[0].octet === 0xa0 ? 1 : 0;
    const serie = derHex(derContenu(tbs.enfants[i]));
    const sigAlg = tbs.enfants[i + 1], emetteur = tbs.enfants[i + 2], validite = tbs.enfants[i + 3], sujet = tbs.enfants[i + 4], spki = tbs.enfants[i + 5];
    const e = nomLire(emetteur), s = nomLire(sujet);
    return {
      brut: u8, tbs: derBrut(tbs), sigAlg: alg, signature: derContenu(sig).subarray(1), serie,
      emetteur: e, sujet: s, du: derDate(validite.enfants[0]), au: derDate(validite.enfants[1]),
      spki, autoSigne: egaux(e.octets, s.octets), algSigne: derOid(sigAlg.enfants[0]),
    };
  }

  // Vérifier une signature avec la clé publique d'un certificat : { ok } ou { ok: false, raison }.
  async function verifierAvecCle(spkiNoeud, sigAlgNoeud, hachageParDefaut, donnees, signature) {
    const subtle = (globalThis.crypto || {}).subtle;
    if (!subtle) return { ok: false, raison: 'La cryptographie du navigateur n\'est pas disponible dans ce contexte.', indisponible: true };
    const algCle = spkiNoeud.enfants[0];
    const oidCle = derOid(algCle.enfants[0]);
    const oidSig = sigAlgNoeud ? derOid(sigAlgNoeud.enfants[0]) : '';
    const info = SIGNATURES[oidSig] || {};
    const spki = derBrut(spkiNoeud);
    try {
      if (oidCle === '1.2.840.113549.1.1.1' || oidCle === '1.2.840.113549.1.1.10') {
        let hachage = info.hachage || hachageParDefaut;
        if (oidSig === '1.2.840.113549.1.1.10') {
          // RSASSA-PSS : le hachage et la longueur du sel sont dans les paramètres.
          let sel = 20;
          hachage = 'SHA-1';
          const params = sigAlgNoeud.enfants[1];
          (params && params.enfants || []).forEach(p => {
            if (p.octet === 0xa0) hachage = HACHAGES[derOid(p.enfants[0].enfants[0])] || hachage;
            if (p.octet === 0xa2) { const v = derContenu(p.enfants[0]); sel = Array.from(v).reduce((a, b) => a * 256 + b, 0); }
          });
          if (!hachage || hachage === 'SHA-224') return { ok: false, raison: 'Hachage non pris en charge par ce logiciel.', nonPrisEnCharge: true };
          const cle = await subtle.importKey('spki', spki, { name: 'RSA-PSS', hash: hachage }, false, ['verify']);
          const ok = await subtle.verify({ name: 'RSA-PSS', saltLength: sel }, cle, signature, donnees);
          return { ok };
        }
        if (!hachage || hachage === 'SHA-224') return { ok: false, raison: 'Hachage non pris en charge par ce logiciel.', nonPrisEnCharge: true };
        const cle = await subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: hachage }, false, ['verify']);
        return { ok: await subtle.verify('RSASSA-PKCS1-v1_5', cle, signature, donnees) };
      }
      if (oidCle === '1.2.840.10045.2.1') {
        const courbe = COURBES[derOid(algCle.enfants[1])];
        const hachage = info.hachage || hachageParDefaut;
        if (!courbe || !hachage || hachage === 'SHA-224') return { ok: false, raison: 'Courbe ou hachage non pris en charge par ce logiciel.', nonPrisEnCharge: true };
        // La signature ECDSA est un couple (r, s) en DER ; le moteur attend r et s mis bout à bout.
        const rs = derNoeud(signature, 0, signature.length).enfants.map(x => derContenu(x));
        const brute = new Uint8Array(courbe[1] * 2);
        rs.forEach((v, k) => { let t = v; while (t.length > courbe[1] && t[0] === 0) t = t.subarray(1); brute.set(t, k * courbe[1] + courbe[1] - t.length); });
        const cle = await subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: courbe[0] }, false, ['verify']);
        return { ok: await subtle.verify({ name: 'ECDSA', hash: hachage }, cle, brute, donnees) };
      }
      return { ok: false, raison: 'Type de clé non pris en charge par ce logiciel (' + oidCle + ').', nonPrisEnCharge: true };
    } catch (e) { return { ok: false, raison: 'La vérification a échoué : ' + (e && e.message ? e.message : e) }; }
  }

  // La chaîne de certificats jointe : chaque certificat est-il signé par le suivant ?
  async function chaineLire(signataire, certs) {
    const chaine = [{ cert: signataire, signeParLeSuivant: null }];
    let courant = signataire;
    for (let i = 0; i < 10 && !courant.autoSigne; i++) {
      const parent = certs.find(c => c !== courant && egaux(c.sujet.octets, courant.emetteur.octets));
      if (!parent) break;
      const r = await verifierAvecCle(parent.spki, courant.sigAlg, null, courant.tbs, courant.signature);
      chaine[chaine.length - 1].signeParLeSuivant = r.ok;
      chaine.push({ cert: parent, signeParLeSuivant: null });
      courant = parent;
    }
    const dernier = chaine[chaine.length - 1].cert;
    if (dernier.autoSigne) {
      const r = await verifierAvecCle(dernier.spki, dernier.sigAlg, null, dernier.tbs, dernier.signature);
      chaine[chaine.length - 1].signeParLeSuivant = r.ok;
    }
    return { chaine, racine: dernier.autoSigne ? dernier : null };
  }

  // Le contenu d'une signature CMS (PKCS#7) et son contrôle contre les octets signés.
  async function verifierCms(cms, donnees, sousFiltre) {
    const subtle = (globalThis.crypto || {}).subtle;
    let ci;
    try { ci = derNoeud(cms, 0, cms.length); } catch (e) { return { etat: 'illisible', raison: 'La signature n\'est pas lisible (' + e.message + ').' }; }
    try {
      if (derOid(ci.enfants[0]) !== '1.2.840.113549.1.7.2') return { etat: 'illisible', raison: 'Ce n\'est pas une signature PKCS#7.' };
      const sd = ci.enfants[1].enfants[0].enfants;
      let i = 3;
      const certsBruts = [];
      if (sd[i].octet === 0xa0) { (sd[i].enfants || []).forEach(n => { if (n.tag === 16 && n.classe === 0) certsBruts.push(derBrut(n)); }); i++; }
      if (sd[i].octet === 0xa1) i++;
      const encap = sd[2];
      const infos = sd[i].enfants;
      if (!infos.length) return { etat: 'illisible', raison: 'La signature ne contient aucun signataire.' };
      const si = infos[0].enfants;
      let k = 1;
      const sid = si[k++];
      const digestAlg = si[k++];
      let attrs = null;
      if (si[k].octet === 0xa0) attrs = si[k++];
      const sigAlg = si[k++];
      const signature = derContenu(si[k++]);
      let nonSignes = null;
      if (si[k] && si[k].octet === 0xa1) nonSignes = si[k];

      const certs = [];
      certsBruts.forEach(b => { try { certs.push(certLire(b)); } catch (e) { /* un certificat illisible n'empêche pas les autres */ } });
      // Le certificat du signataire : par émetteur et numéro de série, ou par identifiant de clé.
      let signataire = null;
      if (sid.octet === 0x30) {
        const serie = derHex(derContenu(sid.enfants[1]));
        const emetteur = derBrut(sid.enfants[0]);
        signataire = certs.find(c => c.serie === serie && egaux(c.emetteur.octets, emetteur)) || null;
      } else signataire = certs[0] || null;
      if (!signataire) return { etat: 'illisible', raison: 'Le certificat du signataire n\'est pas joint à la signature.' };

      const hachage = HACHAGES[derOid(digestAlg.enfants[0])];
      if (!hachage || hachage === 'SHA-224') return { etat: 'non-pris-en-charge', raison: 'Algorithme de hachage non pris en charge par ce logiciel.', signataire, certs };

      const res = { signataire, certs, hachage, horodatage: !!(nonSignes && (nonSignes.enfants || []).some(a => derOid(a.enfants[0]) === '1.2.840.113549.1.9.16.2.14')), dateSignature: null };
      const empreinte = new Uint8Array(await subtle.digest(hachage, donnees));
      let aSigner;
      if (attrs) {
        let md = null;
        attrs.enfants.forEach(a => {
          const o = derOid(a.enfants[0]);
          const v = a.enfants[1].enfants[0];
          if (o === '1.2.840.113549.1.9.4') md = derContenu(v);
          if (o === '1.2.840.113549.1.9.5') res.dateSignature = derDate(v);
        });
        if (!md) return Object.assign(res, { etat: 'illisible', raison: 'La signature ne porte pas l\'empreinte du document.' });
        if (!egaux(Array.from(md), Array.from(empreinte))) return Object.assign(res, { etat: 'alteree', raison: 'Le contenu signé a été modifié depuis la signature : son empreinte n\'est plus celle qui a été signée.' });
        // Ce qui est signé : les attributs, ré-étiquetés en SET (DER).
        if (attrs.indefini) return Object.assign(res, { etat: 'non-pris-en-charge', raison: 'Encodage des attributs signés non pris en charge.' });
        aSigner = new Uint8Array(derBrut(attrs));
        aSigner[0] = 0x31;
      } else {
        // Ancien format (adbe.pkcs7.sha1) : l'empreinte est dans le contenu encapsulé.
        if (sousFiltre === 'adbe.pkcs7.sha1' && encap.enfants[1]) {
          const cont = derContenu(encap.enfants[1].enfants[0]);
          if (!egaux(Array.from(cont), Array.from(empreinte))) return Object.assign(res, { etat: 'alteree', raison: 'Le contenu signé a été modifié depuis la signature : son empreinte n\'est plus celle qui a été signée.' });
          aSigner = cont;
        } else aSigner = donnees;
      }
      const v = await verifierAvecCle(signataire.spki, sigAlg, hachage, aSigner, signature);
      if (v.nonPrisEnCharge || v.indisponible) return Object.assign(res, { etat: 'non-pris-en-charge', raison: v.raison });
      if (!v.ok) return Object.assign(res, { etat: 'alteree', raison: v.raison || 'La signature ne correspond pas au certificat joint : elle a été falsifiée ou le fichier a été altéré.' });
      Object.assign(res, await chaineLire(signataire, certs));
      return Object.assign(res, { etat: 'intacte' });
    } catch (e) { return { etat: 'illisible', raison: 'La signature n\'a pas pu être lue (' + (e && e.message ? e.message : e) + ').' }; }
  }

  // Les signatures d'un fichier PDF, dans l'ordre où elles ont été apposées, chacune contrôlée.
  async function verifierLesSignatures(octets) {
    const { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFString, PDFNumber } = PDFLib;
    const doc = await PDFDocument.load(octets, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
    const texte = v => { try { return v instanceof PDFHexString || v instanceof PDFString ? v.decodeText() : ''; } catch (e) { return ''; } };
    const trouvees = [];
    doc.context.enumerateIndirectObjects().forEach(([ref, obj]) => {
      if (!(obj instanceof PDFDict) || !obj.has(PDFName.of('ByteRange')) || !obj.has(PDFName.of('Contents'))) return;
      const br = obj.lookup(PDFName.of('ByteRange'));
      const ct = obj.lookup(PDFName.of('Contents'));
      if (!(br instanceof PDFArray) || br.size() !== 4 || !(ct instanceof PDFHexString)) return;
      const r = [0, 1, 2, 3].map(j => { const x = br.lookup(j); return x instanceof PDFNumber ? x.asNumber() : NaN; });
      trouvees.push({ ref, dict: obj, br: r, contents: ct.asBytes() });
    });
    trouvees.sort((a, b) => a.br[2] - b.br[2]);
    // Le champ qui porte cette valeur, pour le nommer.
    const champs = new Map();
    doc.context.enumerateIndirectObjects().forEach(([, obj]) => {
      if (obj instanceof PDFDict && obj.has(PDFName.of('V')) && obj.get(PDFName.of('V')) && String(obj.get(PDFName.of('FT'))) === '/Sig') champs.set(String(obj.get(PDFName.of('V'))), texte(obj.lookup(PDFName.of('T'))));
    });
    // Certification : la première signature porte-t-elle un contrôle de modification (DocMDP) ?
    let mdpRef = null, mdpP = 0;
    try {
      const perms = doc.catalog.lookup(PDFName.of('Perms'));
      if (perms instanceof PDFDict) {
        mdpRef = String(perms.get(PDFName.of('DocMDP')));
        const v = perms.lookup(PDFName.of('DocMDP'));
        const refs = v instanceof PDFDict ? v.lookup(PDFName.of('Reference')) : null;
        const r0 = refs instanceof PDFArray && refs.size() ? refs.lookup(0) : null;
        const tp = r0 instanceof PDFDict ? r0.lookup(PDFName.of('TransformParams')) : null;
        const p = tp instanceof PDFDict ? tp.lookup(PDFName.of('P')) : null;
        mdpP = p instanceof PDFNumber ? p.asNumber() : 2;
      }
    } catch (e) { /* pas de certification lisible */ }

    const sortie = [];
    for (let n = 0; n < trouvees.length; n++) {
      const t = trouvees[n];
      const [a, b, c, d] = t.br;
      const s = {
        champ: champs.get(String(t.ref)) || '', nom: texte(t.dict.lookup(PDFName.of('Name'))), raison: texte(t.dict.lookup(PDFName.of('Reason'))),
        lieu: texte(t.dict.lookup(PDFName.of('Location'))), dateDeclaree: texte(t.dict.lookup(PDFName.of('M'))),
        sousFiltre: (() => { const f = t.dict.lookup(PDFName.of('SubFilter')); return f ? String(f).replace(/^\//, '') : ''; })(),
        certification: mdpRef === String(t.ref) ? mdpP : 0,
        plage: t.br, octetsApres: 0, suivieDe: [], problemes: [],
      };
      // La plage doit désigner le fichier, avec un seul trou : la valeur de la signature elle-même.
      const coherente = a === 0 && b > 0 && c >= a + b && d >= 0 && c + d <= octets.length && octets[a + b] === 0x3c && octets[c - 1] === 0x3e;
      let ok = coherente;
      if (coherente) {
        const hex = Array.from(octets.subarray(a + b + 1, c - 1), x => String.fromCharCode(x)).join('').replace(/\s+/g, '');
        ok = hex.length === t.contents.length * 2 && hex.toLowerCase() === derHex(t.contents);
      }
      if (!ok) {
        sortie.push(Object.assign(s, { etat: 'illisible', raison: 'La plage d\'octets annoncée par la signature ne correspond pas à sa valeur : le fichier est incohérent ou a été manipulé.' }));
        continue;
      }
      s.octetsApres = octets.length - (c + d);
      // Une fin de ligne après le dernier « %%EOF » n'est pas un ajout.
      if (s.octetsApres > 0 && Array.from(octets.subarray(c + d)).every(x => x === 0x0a || x === 0x0d || x === 0x20 || x === 0x00)) s.octetsApres = 0;
      const donnees = new Uint8Array(b + d);
      donnees.set(octets.subarray(a, a + b), 0);
      donnees.set(octets.subarray(c, c + d), b);
      const r = await verifierCms(t.contents, donnees, s.sousFiltre);
      Object.assign(s, r);
      // Les signatures suivantes qui couvrent celle-ci : ce qui s'est ajouté après elle est peut-être elles.
      for (let m = n + 1; m < trouvees.length; m++) if (trouvees[m].br[2] + trouvees[m].br[3] >= c + d && trouvees[m].br[0] === 0) s.suivieDe.push(m);
      sortie.push(s);
    }
    sortie.forEach(s => { s.suivieDe = s.suivieDe.map(m => sortie[m]); });
    return sortie;
  }
  // @fin-signatures

  // Ce que l'on dit de chaque signature, en phrases pour un secrétariat.
  function direSignature(s) {
    const lignes = [];
    const sig = s.signataire;
    const quand = d => d ? d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '';
    const qui = sig ? (sig.sujet.champs.CN || sig.sujet.champs.O || sig.sujet.texte) : (s.nom || 'signataire inconnu');
    let verdict, gravite;
    if (s.etat === 'intacte') {
      if (s.octetsApres > 0) {
        const suite = s.suivieDe.length;
        verdict = 'La signature est intacte : le contenu qu\'elle couvre n\'a pas changé. Mais le fichier a reçu des ajouts après elle'
          + (suite ? ' (au moins ' + (suite > 1 ? 'les signatures suivantes' : 'la signature suivante') + ', ce qui est normal ; ce logiciel ne sait pas dire s\'il y en a eu d\'autres).' : ' (' + fmtSize(s.octetsApres) + ') : un formulaire rempli, une annotation, une version corrigée ? Ce logiciel ne sait pas dire lesquels.');
        gravite = suite ? 'ok' : 'warn';
      } else { verdict = 'La signature est intacte : le document est tel qu\'il était au moment de la signature.'; gravite = 'ok'; }
    } else if (s.etat === 'alteree') { verdict = (s.raison || 'Le document ne correspond plus à la signature.'); gravite = 'error'; }
    else if (s.etat === 'non-pris-en-charge') { verdict = 'Cette signature n\'a pas pu être contrôlée : ' + (s.raison || 'algorithme non pris en charge') + ' Aucune conclusion ne peut en être tirée.'; gravite = 'warn'; }
    else { verdict = s.raison || 'La signature n\'a pas pu être lue.'; gravite = 'error'; }
    lignes.push({ gravite, texte: verdict });
    if (sig) {
      let identite = 'Signé par « ' + qui + ' »' + (sig.sujet.champs.O && sig.sujet.champs.CN ? ' (' + sig.sujet.champs.O + ')' : '') + (s.dateSignature ? ', le ' + quand(s.dateSignature) : (s.dateDeclaree ? ' (date déclarée : ' + s.dateDeclaree + ')' : '')) + '.';
      lignes.push({ gravite: 'info', texte: identite });
      if (s.raison) lignes.push({ gravite: 'info', texte: 'Motif indiqué : ' + s.raison + (s.lieu ? ' — lieu : ' + s.lieu : '') + '.' });
      if (s.etat === 'intacte') {
        const dateRef = s.dateSignature || null;
        if (dateRef && (dateRef < sig.du || dateRef > sig.au)) lignes.push({ gravite: 'error', texte: 'Le certificat n\'était pas valide à la date de la signature (valable du ' + sig.du.toLocaleDateString('fr-CH') + ' au ' + sig.au.toLocaleDateString('fr-CH') + ').' });
        else if (!dateRef) lignes.push({ gravite: 'warn', texte: 'La date de signature ne figure pas dans la signature elle-même : elle n\'est pas prouvée.' });
        if (sig.au < new Date()) lignes.push({ gravite: 'info', texte: 'Le certificat a expiré depuis (le ' + sig.au.toLocaleDateString('fr-CH') + ') ; cela ne remet pas en cause une signature faite pendant sa validité.' });
        const chaine = s.chaine || [];
        if (sig.autoSigne) lignes.push({ gravite: 'warn', texte: 'Le certificat est « auto-signé » : il n\'a été délivré par aucune autorité. N\'importe qui peut en fabriquer un au nom de n\'importe qui : la signature prouve que le document n\'a pas changé, pas qui l\'a signé.' });
        else if (s.racine) lignes.push({ gravite: 'warn', texte: 'Chaîne jointe de ' + chaine.length + ' certificats, jusqu\'à l\'autorité « ' + (s.racine.sujet.champs.CN || s.racine.sujet.texte) + ' ». Ce logiciel ne contient aucune liste d\'autorités reconnues : il ne peut pas dire si elle l\'est. Comparez-la à celle de votre administration.' });
        else lignes.push({ gravite: 'warn', texte: 'La chaîne de certificats est incomplète (' + chaine.length + ' certificat' + (chaine.length > 1 ? 's' : '') + ' joint' + (chaine.length > 1 ? 's' : '') + ', jusqu\'à « ' + (chaine[chaine.length - 1].cert.sujet.champs.CN || '?') + ' ») : l\'autorité qui a délivré le certificat ne peut pas être identifiée ici.' });
        if (chaine.some(c => c.signeParLeSuivant === false)) lignes.push({ gravite: 'error', texte: 'Un certificat de la chaîne n\'est pas signé par celui qui est censé l\'avoir délivré : la chaîne est incohérente.' });
        lignes.push({ gravite: 'info', texte: 'Révocation du certificat non vérifiée (cela demanderait de joindre l\'autorité par internet, ce que ce logiciel ne fait jamais). ' + (s.horodatage ? 'La signature porte un horodatage d\'une autorité de temps ; il n\'est pas vérifié ici.' : '') });
      }
    }
    if (s.certification) lignes.push({ gravite: s.octetsApres > 0 ? 'warn' : 'info', texte: 'Document certifié par cette signature : modifications autorisées ensuite — ' + ({ 1: 'aucune', 2: 'remplissage de formulaire et signatures', 3: 'formulaires, signatures et annotations' }[s.certification] || 'selon le niveau déclaré') + '.' });
    return { titre: (s.champ ? 'Signature « ' + s.champ + ' »' : 'Signature') + ' — ' + qui, lignes };
  }

  async function toolSignatures() {
    const signes = state.sources.filter(s => s.proprietes && s.proprietes.signatures);
    if (!signes.length) {
      dialog({ title: 'Vérifier les signatures', icon: IC.info, build: b => b.append(note('Aucune signature numérique n\'a été trouvée dans les documents ouverts.')) });
      return;
    }
    let courante = signes[0];
    const picker = select('sg-doc', signes.map(s => [s.id, s.name]), courante.id);
    const zone = document.createElement('div');
    const montrer = async () => {
      zone.replaceChildren(note('Contrôle en cours…'));
      let sigs;
      try { sigs = await verifierLesSignatures(courante.bytes instanceof Uint8Array ? courante.bytes : new Uint8Array(courante.bytes)); } catch (e) { signaler('Vérification des signatures', e, 'erreur'); zone.replaceChildren(note('Le contrôle a échoué : ' + (e && e.message ? e.message : e), 'warn')); return; }
      zone.replaceChildren();
      if (!sigs.length) { zone.append(note('Ce document annonce une signature, mais aucune valeur de signature n\'a pu être lue.', 'warn')); return; }
      sigs.forEach(s => {
        const r = direSignature(s);
        zone.append(groupOf(r.titre, r.lignes.map(l => note(l.texte, l.gravite === 'error' || l.gravite === 'warn' ? 'warn' : ''))));
      });
    };
    picker.addEventListener('change', () => { courante = signes.find(s => String(s.id) === picker.value); montrer(); });
    dialog({
      title: 'Vérifier les signatures', icon: IC.info, wide: true,
      build: b => {
        if (signes.length > 1) b.append(field('Document', picker));
        b.append(zone);
        b.append(note('Ce contrôle est fait sur ce poste, avec les fonctions de cryptographie du navigateur : rien n\'est envoyé. Il établit que le contenu signé n\'a pas changé et ce que le certificat dit du signataire. Il ne dit pas si l\'autorité est reconnue, ni si le certificat a été révoqué, et n\'a pas la valeur d\'une validation au sens de la loi fédérale sur la signature électronique.'));
      },
    });
    montrer();
  }
