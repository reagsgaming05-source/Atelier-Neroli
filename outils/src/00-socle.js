  'use strict';

  const APP = 'Blonay PDF';
  const APP_VERSION = '2.0.0';
  // Renseigné par build.js : date de construction et commit.
  const APP_CONSTRUCTION = '__CONSTRUCTION__';
  const CDN = {
    pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    pdflib: 'https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.11.0/dist/pdf-lib.min.js',
    pdflibFallback: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  };
  let pdfjs = null, PDFLib = null, JSZip = null;
  const FEAT = { encrypt: false, zip: false };

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
  }

  async function boot() {
    const msg = $('#boot-msg'), retry = $('#boot-retry');
    retry.hidden = true;
    msg.textContent = 'Chargement des composants PDF…';
    // Version hors ligne : les composants sont déjà dans la page.
    if (window.pdfjsLib && window.PDFLib) {
      pdfjs = window.pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = window.__blonayWorker || CDN.worker;
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
    } catch (e) {
      console.error(e);
      msg.textContent = 'Les composants PDF n\'ont pas pu être chargés. Vérifiez votre connexion internet, puis réessayez.';
      retry.hidden = false;
      retry.onclick = boot;
    }
  }

