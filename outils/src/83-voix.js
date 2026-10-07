  // =====================================================================
  //  Lecture à voix haute
  //  -------------------------------------------------------------------
  //  Le texte du document est dit par une voix installée sur le poste (celles de Windows ou de macOS) : rien ne part sur
  //  internet. Une voix qui passerait par un serveur (« localService » faux) n'est jamais proposée ; sans voix locale,
  //  l'outil le dit au lieu de promettre. Le texte vient de la même lecture de page que l'export Word : les titres,
  //  les paragraphes, les tableaux ligne par ligne, dans l'ordre de lecture ; un scan reconnu se lit par son texte reconnu.
  // =====================================================================
  const synthese = () => (typeof window !== 'undefined' && window.speechSynthesis) || null;
  function voixLocales() {
    const s = synthese();
    try { return s ? Array.from(s.getVoices() || []).filter(v => v.localService) : []; } catch (e) { signaler('Voix', e, 'info'); return []; }
  }
  // Un texte découpé en morceaux que la voix dit d'un souffle : une phrase, ou à défaut un groupe de mots (240 signes au plus).
  // « M. Dupont », « art. 5 » : un point après une abréviation ne finit pas la phrase.
  const ABREVIATIONS = /(?:^|[\s'’(])(?:M|Mme|Mmes|MM|Mlle|Dr|Pr|art|al|let|ch|no|p|pp|vol|etc|cf|env|resp|av|bd|St|Ste|Hr|Fr|Nr|Abs|Bst|Ziff|bzw|ca|usw|vgl)\.$/i;
  function morceauxAParler(texte) {
    const out = [];
    const phrases = [];
    String(texte || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+(?=\S)/).forEach(ph => {
      const prec = phrases[phrases.length - 1];
      if (prec != null && ABREVIATIONS.test(prec)) phrases[phrases.length - 1] = prec + ' ' + ph;
      else phrases.push(ph);
    });
    phrases.forEach(ph => {
      while (ph.length > 240) {
        let k = ph.lastIndexOf(' ', 240);
        if (k < 80) k = 240;
        out.push(ph.slice(0, k).trim());
        ph = ph.slice(k).trim();
      }
      if (ph) out.push(ph);
    });
    return out;
  }
  // Ce que chaque bloc de la page donne à dire : un titre, un paragraphe tels quels ; un tableau, une rangée à la fois.
  const segmentsAParler = b => b.t === 'tableau' ? b.lignes.map(r => r.filter(Boolean).join(', ')) : [b.s];

  const lecture = { jeton: 0, pause: false };
  function arreterLaLecture() {
    lecture.jeton++; lecture.pause = false;
    const s = synthese();
    if (s) { try { s.cancel(); } catch (e) { signaler('Voix', e, 'info'); } }
  }
  function dire(texte, voix, vitesse) {
    return new Promise(fin => {
      const u = new SpeechSynthesisUtterance(texte);
      if (voix) { u.voice = voix; u.lang = voix.lang; }
      u.rate = vitesse;
      u.onend = () => fin(true);
      u.onerror = () => fin(false);
      synthese().speak(u);
    });
  }
  // Lit les pages l'une après l'autre. Rend 'fin' (tout est dit), 'arret' (arrêtée ou remplacée) ou 'echec' (la voix a refusé).
  async function lireLesPages(pages, voix, vitesse, etat) {
    const mon = ++lecture.jeton;
    lecture.pause = false;
    let dit = 0;
    for (let i = 0; i < pages.length; i++) {
      if (mon !== lecture.jeton) return 'arret';
      etat(i, pages.length);
      allerPage(pages[i].id);
      const blocs = await vue.blocsDePage(pages[i]);
      for (const b of blocs) {
        for (const seg of segmentsAParler(b)) {
          for (const m of morceauxAParler(seg)) {
            if (mon !== lecture.jeton) return 'arret';
            const ok = await dire(m, voix, vitesse());
            if (mon !== lecture.jeton) return 'arret';
            if (!ok) return 'echec';
            dit++;
          }
        }
      }
    }
    return mon === lecture.jeton ? (dit ? 'fin' : 'vide') : 'arret';
  }

  function toolVoix() {
    const s = synthese();
    if (!s || typeof SpeechSynthesisUtterance === 'undefined') { toast('Ce poste n\'a pas de synthèse vocale : la lecture à voix haute n\'est pas disponible.', 'warn'); return; }
    const courante = pageCouranteId();
    const sel = selectedPages();
    const iCourante = Math.max(0, state.pages.findIndex(p => p.id === courante));
    const options = [['suite', 'De la page affichée à la fin'], ['une', 'La page affichée seulement']];
    if (sel.length > 1) options.push(['sel', 'Pages sélectionnées (' + sel.length + ')']);
    if (state.pages.length > 1) options.push(['tout', 'Tout le document (' + state.pages.length + ' pages)']);
    const choix = select('vx-pages', options, 'suite');
    const voixSel = select('vx-voix', [['', '…']], '');
    const vitesse = input('vx-vitesse', 'range', 10, { min: 6, max: 16, step: 1 });
    const vitesseTxt = document.createElement('span'); vitesseTxt.className = 'hint';
    const majVitesse = () => { vitesseTxt.textContent = formaterNombre(vitesse.value / 10, 1) + ' ×'; };
    vitesse.addEventListener('input', majVitesse); majVitesse();
    const etat = note('');
    let voix = [];
    const langue = () => (state.meta.langue || codeLangue() || 'fr').slice(0, 2).toLowerCase();
    function remplirLesVoix() {
      const garde = voixSel.value;
      voix = voixLocales();
      voixSel.replaceChildren();
      voix.forEach((v, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = v.name + ' (' + v.lang + ')'; voixSel.appendChild(o); });
      const meilleure = voix.findIndex(v => v.lang.toLowerCase().indexOf(langue() + '-ch') === 0);
      const bonne = meilleure >= 0 ? meilleure : voix.findIndex(v => v.lang.toLowerCase().indexOf(langue()) === 0);
      voixSel.value = garde && voixSel.querySelector('option[value="' + garde + '"]') ? garde : String(Math.max(0, bonne));
      if (!voix.length) {
        etat.textContent = 'Aucune voix n\'est installée sur ce poste. La lecture n\'utilise que les voix de l\'ordinateur (Windows : réglages « Heure et langue » ; macOS : « Accessibilité › Contenu énoncé ») : rien n\'est envoyé sur internet.';
      } else if (/^Aucune voix/.test(etat.textContent)) etat.textContent = '';
      const lire = document.getElementById('vx-lire'); if (lire) lire.disabled = !voix.length;
    }
    const surVoix = () => remplirLesVoix();
    if (s.addEventListener) s.addEventListener('voiceschanged', surVoix);
    const pagesALire = () => {
      const v = choix.value;
      if (v === 'tout') return state.pages.slice();
      if (v === 'sel') return state.pages.filter(p => state.selected.has(p.id));
      if (v === 'une') return state.pages.slice(iCourante, iCourante + 1);
      return state.pages.slice(iCourante);
    };
    const majPause = () => { const b = document.getElementById('vx-pause'); if (b) b.textContent = lecture.pause ? 'Reprendre' : 'Pause'; };
    const arreter = () => { arreterLaLecture(); majPause(); };
    dialog({
      aide: 'voix',
      title: 'Lire à voix haute', icon: IC.voix, libre: true, submitOnEnter: false,
      build: b => {
        b.append(field('Pages', choix, 'La lecture suit le texte du document, titres et tableaux compris, et fait défiler la page lue. Un scan se lit seulement une fois son texte reconnu.'));
        b.append(field('Voix', voixSel, 'Seules les voix installées sur ce poste sont proposées. La voix qui correspond à la langue du document est choisie d\'abord.'));
        b.append(field('Vitesse', (() => { const w = document.createElement('div'); w.className = 'row tight'; w.append(vitesse, vitesseTxt); return w; })(), 'De 0,6 fois la vitesse normale à 1,6 fois. Elle change au morceau suivant, sans recommencer.'));
        b.append(etat);
        remplirLesVoix();
      },
      onClose: () => { if (s.removeEventListener) s.removeEventListener('voiceschanged', surVoix); arreter(); },
      actions: [
        { label: 'Fermer', onClick: c => c() },
        { label: 'Arrêter', id: 'vx-arret', onClick: () => { arreter(); etat.textContent = 'Lecture arrêtée.'; } },
        { label: 'Pause', id: 'vx-pause', onClick: () => {
          const en = lecture.pause;
          try { if (en) s.resume(); else s.pause(); lecture.pause = !en; } catch (e) { signaler('Voix', e, 'info'); }
          majPause();
        } },
        { label: 'Lire', primary: true, id: 'vx-lire', onClick: async () => {
          const pages = pagesALire();
          if (!pages.length || !voix.length) return;
          arreterLaLecture();
          majPause();
          const r = await lireLesPages(pages, voix[+voixSel.value] || voix[0], () => vitesse.value / 10,
            (i, n) => {
              const rang = state.pages.indexOf(pages[i]) + 1, ordre = i + 1;
              etat.textContent = n > 1 ? 'Lecture : page ' + rang + ' (' + ordre + ' sur ' + n + ')…' : 'Lecture de la page…';
            });
          if (r === 'fin') { etat.textContent = 'Lecture terminée.'; setLast('Lecture à voix haute terminée'); }
          else if (r === 'vide') etat.textContent = 'Aucun texte à lire. Sur un scan, lancez d\'abord la reconnaissance de texte.';
          else if (r === 'echec') etat.textContent = 'La voix a refusé de lire ce texte. Essayez une autre voix.';
          majPause();
        } },
      ],
    });
    remplirLesVoix();       // les boutons existent maintenant : « Lire » se grise sans voix
  }
