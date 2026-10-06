import { SectionTitle, TopBar } from '../components/ui';

export function About() {
  return (
    <>
      <TopBar title="À propos" backTo="/plus" />
      <div class="page">
        <div class="card center">
          <div class="ar" style={{ fontSize: '2rem', color: 'var(--primary)' }}>
            سَكِينَة
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>Sakina</div>
          <p class="muted" style={{ margin: '6px 0 0' }}>
            « La sérénité ». Une application gratuite, sans publicité et sans pistage, faite pour servir.
          </p>
        </div>

        <SectionTitle>Confidentialité</SectionTitle>
        <div class="card">
          <p style={{ margin: 0 }}>
            Sakina n’a ni compte, ni serveur, ni statistiques, ni publicité. Votre position, vos réglages, vos marque-pages et votre suivi
            restent dans la mémoire de votre navigateur. Les seules requêtes réseau servent à télécharger l’application elle-même, le texte
            du Coran et, si vous lancez la récitation, les fichiers audio depuis everyayah.com.
          </p>
        </div>

        <SectionTitle>Sources</SectionTitle>
        <div class="card stack small">
          <div>
            <b>Texte coranique</b> — texte uthmani de Tanzil.net (Creative Commons BY 3.0), dans l’encodage de Khaled Hosny pour la police
            Amiri Quran, via le projet fawazahmed0/quran-api. Le texte est reproduit sans modification.
          </div>
          <div>
            <b>Traductions</b> — Muhammad Hamidullah (Tanzil.net) et Rachid Maach (QuranEnc.com), à usage non commercial. Translittération :
            Tanzil.net.
          </div>
          <div>
            <b>Adhkar</b> — d’après « Hisn al-Muslim » de Sa‘id ibn ‘Ali ibn Wahf al-Qahtani. Traductions françaises du sens propres à
            l’application.
          </div>
          <div>
            <b>Hadiths</b> — 40 hadiths d’an-Nawawī, hadiths qudsi et récits de Ṣaḥīḥ al-Bukhārī et Ṣaḥīḥ Muslim : texte arabe et
            traduction française du projet hadith-api (fawazahmed0), reproduits sans modification avec leur numéro de référence.
          </div>
          <div>
            <b>Histoires des prophètes</b> — résumés rédigés pour l’application à partir des seuls versets cités, qui sont affichés en
            entier.
          </div>
          <div>
            <b>Horaires et qibla</b> — bibliothèque Adhan (Batoul Apps, licence MIT), algorithmes astronomiques de Jean Meeus.
          </div>
          <div>
            <b>Calendrier</b> — calendrier Umm al-Qura fourni par le navigateur.
          </div>
          <div>
            <b>Villes</b> — simplemaps.com World Cities (CC BY 4.0) via le paquet city-timezones.
          </div>
          <div>
            <b>Récitations</b> — everyayah.com.
          </div>
          <div>
            <b>Police</b> — Amiri Quran de Khaled Hosny (SIL Open Font License).
          </div>
        </div>

        <SectionTitle>Avertissement</SectionTitle>
        <div class="card small">
          Les horaires sont calculés astronomiquement et peuvent différer de quelques minutes de ceux de votre mosquée : en cas de doute,
          suivez votre mosquée. Le calendrier hégirien est une estimation ; le début des mois dépend de l’observation du croissant. Si vous
          trouvez une erreur dans un texte, merci de la signaler pour qu’elle soit corrigée au plus vite.
        </div>
        <p class="center small muted" style={{ marginTop: '20px' }}>
          Code source libre (licence MIT).
        </p>
      </div>
    </>
  );
}
