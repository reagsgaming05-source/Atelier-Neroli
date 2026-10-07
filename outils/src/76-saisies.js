  // =====================================================================
  //  Les données saisies dans un formulaire : contrôles, CSV, XFDF
  //  -------------------------------------------------------------------
  //  Ce que la personne a tapé dans les champs se contrôle (un nombre entier, une date, une longueur) avant d'être écrit,
  //  se sort en CSV (une ligne d'en-têtes = les noms des champs, une ligne de valeurs : le même fichier alimente « Remplir en
  //  série ») ou en XFDF (le format d'échange d'Adobe), et se relit de l'un ou de l'autre. Aucun script n'est écrit dans le PDF :
  //  les contrôles se font ici, à la saisie, pas dans le lecteur du destinataire.
  // =====================================================================
  // @debut-saisies
  const FORMATS_DE_CHAMP = [['', 'Libre'], ['entier', 'Nombre entier'], ['decimal', 'Nombre décimal'], ['date', 'Date (jj.mm.aaaa)'], ['courriel', 'Adresse de courriel']];
  const normaliserCle = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const aSaisir = f => f && f.kind !== 'button' && f.kind !== 'signature' && f.kind !== 'other';

  function dateValide(t) {
    const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(String(t).trim());
    if (!m) return false;
    const j = +m[1], mo = +m[2], a = +m[3];
    const d = new Date(Date.UTC(a, mo - 1, j));
    return d.getUTCFullYear() === a && d.getUTCMonth() === mo - 1 && d.getUTCDate() === j;
  }
  // Ce qui cloche dans une valeur, dit en clair ; une chaîne vide si tout va bien. f : un champ lu (voir detectForm).
  function validerChamp(f, v) {
    if (!f || f.kind !== 'text') return '';
    const t = String(v == null ? '' : v).trim();
    if (f.maxLen && t.length > f.maxLen) return tr('trop long') + ' (' + f.maxLen + ' ' + tr('signes au plus') + ')';
    if (!t) return '';
    const nu = t.replace(/['’\s]/g, '');
    if (f.format === 'entier' && !/^[-+]?\d+$/.test(nu)) return tr('un nombre entier est attendu');
    if (f.format === 'decimal' && !/^[-+]?\d+([.,]\d+)?$/.test(nu)) return tr('un nombre est attendu');
    if (f.format === 'date' && !dateValide(t)) return tr('une date jj.mm.aaaa est attendue');
    if (f.format === 'courriel' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return tr('une adresse de courriel est attendue');
    return '';
  }

  // Une valeur de case, telle qu'un autre logiciel l'écrit : « Oui », « Yes », « 1 », « x »…
  const estCoche = v => /^(1|oui|yes|on|true|vrai|x|ja|wahr|coch[eé]e?)$/i.test(String(v == null ? '' : v).trim());

  const csvCellule = t => { const s = String(t == null ? '' : t); return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  // Les valeurs des champs (valeurs : nom -> valeur ; champs : ceux de detectForm) : en-têtes, puis une ligne.
  function saisiesEnCsv(champs, valeurs) {
    const cs = champs.filter(aSaisir);
    const val = f => { const v = valeurs[f.name] !== undefined ? valeurs[f.name] : f.value; return f.kind === 'check' ? (v ? 'Oui' : 'Non') : (Array.isArray(v) ? v.join(' | ') : (v == null ? '' : v)); };
    return '﻿' + cs.map(f => csvCellule(f.name)).join(';') + '\r\n' + cs.map(f => csvCellule(val(f))).join(';') + '\r\n';
  }
  // Les valeurs d'un CSV relu : ses en-têtes sont les noms des champs, sa première ligne de données les valeurs.
  function saisiesDepuisCsv(champs, csv) {
    const sortie = {}, inconnus = [];
    const cles = new Map(champs.filter(aSaisir).map(f => [normaliserCle(f.name), f]));
    const ligne = (csv && csv.lignes && csv.lignes[0]) || [];
    (csv ? csv.entetes : []).forEach((e, i) => {
      const f = cles.get(normaliserCle(e));
      if (!f) { if (String(e).trim()) inconnus.push(e); return; }
      const v = ligne[i] == null ? '' : ligne[i];
      sortie[f.name] = f.kind === 'check' ? estCoche(v) : (f.kind === 'list' && f.multiSelect ? String(v).split('|').map(x => x.trim()).filter(Boolean) : v);
    });
    return { valeurs: sortie, inconnus };
  }

  const xmlEchappe = t => String(t == null ? '' : t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const XFDF_ESPACE = 'http://ns.adobe.com/xfdf/';
  // XFDF : le format d'échange de données de formulaire d'Adobe. Une case se dit « Yes » ou « Off ».
  function saisiesEnXfdf(champs, valeurs) {
    const cs = champs.filter(aSaisir);
    const corps = cs.map(f => {
      const v = valeurs[f.name] !== undefined ? valeurs[f.name] : f.value;
      const lignes = f.kind === 'check' ? ['<value>' + (v ? 'Yes' : 'Off') + '</value>']
        : (Array.isArray(v) ? v : [v == null ? '' : v]).map(x => '<value>' + xmlEchappe(x) + '</value>');
      return '<field name="' + xmlEchappe(f.name) + '">' + lignes.join('') + '</field>';
    }).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<xfdf xmlns="' + XFDF_ESPACE + '" xml:space="preserve">\n<fields>\n' + corps + '\n</fields>\n</xfdf>\n';
  }
  function saisiesDepuisXfdf(champs, texte) {
    const doc = new DOMParser().parseFromString(String(texte), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return { valeurs: {}, inconnus: [], erreur: true };
    const par = new Map(champs.filter(aSaisir).map(f => [f.name, f]));
    const sortie = {}, inconnus = [];
    // un champ imbriqué (« adresse.rue ») se nomme par ses ancêtres, séparés par un point
    const parcourir = (noeud, prefixe) => {
      Array.from(noeud.children).forEach(c => {
        if (c.localName !== 'field') return;
        const nom = prefixe + c.getAttribute('name');
        const vs = Array.from(c.children).filter(x => x.localName === 'value').map(x => x.textContent);
        const fils = Array.from(c.children).some(x => x.localName === 'field');
        if (fils) parcourir(c, nom + '.');
        if (!vs.length) return;
        const f = par.get(nom);
        if (!f) { inconnus.push(nom); return; }
        sortie[f.name] = f.kind === 'check' ? estCoche(vs[0]) : (f.kind === 'list' && f.multiSelect ? vs : vs[0]);
      });
    };
    const racine = Array.from(doc.getElementsByTagName('fields'))[0];
    if (racine) parcourir(racine, '');
    return { valeurs: sortie, inconnus, erreur: false };
  }

  // @fin-saisies
