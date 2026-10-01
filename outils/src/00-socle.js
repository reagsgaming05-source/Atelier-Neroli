  'use strict';

  const APP = 'Aktum PDF';
  // Renseigné par build.js, depuis le numéro de version de outils/package.json.
  const APP_VERSION = '__VERSION__';
  // Renseigné par build.js : date de construction et commit.
  const APP_CONSTRUCTION = '__CONSTRUCTION__';
  // Vrai dans la version hébergée, qui charge ses composants depuis un CDN ;
  // build.js le passe à faux (et vide les adresses) dans tout ce qui est livré
  // aux postes : là, rien ne se charge de l'extérieur, et les messages d'erreur
  // ne doivent pas renvoyer l'utilisateur vers une connexion qu'on n'utilise pas.
  const EN_LIGNE = true;
  const CDN = {
    pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    pdflib: 'https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.11.0/dist/pdf-lib.min.js',
    pdflibFallback: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  };
  let pdfjs = null, PDFLib = null, JSZip = null;
  const FEAT = { encrypt: false, zip: false };

  // Le produit a changé de nom : ses réglages (tampons, thème, zoom…), enregistrés sous l'ancien
  // préfixe, sont repris sous le nouveau, une fois. // @garder-ancien-nom
  (function reprendreLesReglagesDAvant() {
    try {
      const anciens = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('blonay-') === 0) anciens.push(k); } // @garder-ancien-nom
      anciens.forEach(k => { const neuf = 'aktum-' + k.slice(7); if (localStorage.getItem(neuf) === null) localStorage.setItem(neuf, localStorage.getItem(k)); }); // @garder-ancien-nom
    } catch (_) { /* stockage refusé : les réglages repartent de zéro */ }
  })();

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = () => res(true);
      s.onerror = () => rej(new Error('Échec du chargement de ' + src));
      document.head.appendChild(s);
    });
  }

  function started() {
    $('#boot').remove();
    $('#app-toolbar').hidden = false;
    $('#app-main').hidden = false;
    $('#app-status').hidden = false;
    init();
    // La barre vient d'apparaître : c'est le premier moment où elle se mesure.
    surveillerLaBarre();
  }

  async function boot() {
    const msg = $('#boot-msg'), retry = $('#boot-retry');
    retry.hidden = true;
    msg.textContent = 'Chargement des composants PDF…';
    // Version hors ligne : les composants sont déjà dans la page.
    if (window.pdfjsLib && window.PDFLib) {
      pdfjs = window.pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = window.__aktumWorker || CDN.worker;
      PDFLib = window.PDFLib;
      FEAT.encrypt = typeof PDFLib.PDFDocument.prototype.encrypt === 'function';
      JSZip = window.JSZip || null;
      FEAT.zip = !!JSZip;
      started();
      return;
    }
    try {
      await loadScript(CDN.pdfjs);
      pdfjs = window.pdfjsLib;
      if (!pdfjs) throw new Error('pdf.js indisponible');
      pdfjs.GlobalWorkerOptions.workerSrc = CDN.worker;
      try {
        await loadScript(CDN.pdflib);
        if (!window.PDFLib) throw new Error('pdf-lib indisponible');
        FEAT.encrypt = typeof window.PDFLib.PDFDocument.prototype.encrypt === 'function';
      } catch (_) {
        await loadScript(CDN.pdflibFallback);
        FEAT.encrypt = false;
      }
      PDFLib = window.PDFLib;
      if (!PDFLib) throw new Error('pdf-lib indisponible');
      try { await loadScript(CDN.jszip); JSZip = window.JSZip; FEAT.zip = !!JSZip; } catch (_) { FEAT.zip = false; }
      started();
      // Cette page est la version d'essai : elle va chercher ses composants sur
      // internet. Les documents ne quittent pas le navigateur, mais l'adresse du
      // poste, elle, est vue de ces serveurs — pas pour des documents réels.
      const essai = $('#essai-ligne'); if (essai) essai.hidden = false;
      toast('Version d\'essai en ligne : elle charge ses composants depuis internet. Pour des documents réels, utilisez la version portable, qui ne charge rien.', 'warn');
    } catch (e) {
      console.error(e);
      msg.textContent = EN_LIGNE
        ? 'Les composants PDF n\'ont pas pu être chargés. Vérifiez votre connexion internet, puis réessayez.'
        : 'Cette copie du logiciel est incomplète : les composants PDF sont absents. Retéléchargez-la depuis l\'adresse où vous l\'avez obtenue.';
      retry.hidden = false;
      retry.onclick = boot;
    }
  }

