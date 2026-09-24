/* Décompte DGEO — interface locale (vanilla JS, aucune dépendance externe). */
(() => {
  "use strict";
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const c of [].concat(children).flat(Infinity)) if (c !== null && c !== undefined) n.append(c.nodeType ? c : document.createTextNode(String(c)));
    return n;
  };
  const fmt = (x) => (x === null || x === undefined || Number.isNaN(Number(x))) ? "" : Number(x).toFixed(2);
  const num = (v) => { const s = String(v ?? "").replace(/'/g, "").replace(",", ".").trim(); if (s === "") return null; const n = Number(s); return Number.isFinite(n) ? n : null; };
  // Rubriques de chaque type : envoyées par le serveur avec le dossier (models.py), jamais
  // recopiées ici. Une copie à la main avait oublié « Nourriture » pour la course.
  const rubriquesDu = (type) => (dossier && dossier.rubriques && dossier.rubriques[type]) || [];
  // Une valeur hors de la liste s'affiche telle quelle : sinon la liste montrait sa première
  // option (« Transport ») alors que la pièce et l'Excel gardaient autre chose.
  const optionsRubrique = (rubs, valeur) => (valeur && !rubs.includes(valeur) ? rubs.concat([valeur]) : rubs);
  // Le motif d'exclusion dit pourquoi une pièce n'est pas comptée ; la sorte ne le répète plus :
  // « Reçu de carte (exclu) » restait affiché sur un reçu que l'on venait de cocher « compté ».
  const KINDS = { billet: "Billet / ticket", facture: "Facture", recepisse: "Récépissé (bulletin de versement)", recu_carte: "Reçu de carte", taux_change: "Taux de change", autre: "Autre" };
  const CATS = { plein: "Plein tarif (adulte)", demi: "Demi-tarif (adulte)", enfant: "Élève / enfant", invite: "Invité·e (gratuit)", autre: "Autre" };
  // sortes jamais comptées et leur motif : envoyés par le serveur (rules.NON_REMBOURSABLES)
  const motifs = () => (dossier && dossier.motifs_exclusion) || {};
  const MODES = [["direct", "Prix par personne"], ["prorata", "Partagé (règle de trois)"]];
  const MODE_COURT = { direct: "Prix par personne", prorata: "Montant partagé" };
  // Dates : champs de date comme dans la caisse ; le dossier garde « jj.mm.aaaa » (format de l'Excel).
  const versIso = (s) => { const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(s || "").trim()); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
  const depuisIso = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? `${m[3]}.${m[2]}.${m[1]}` : null; };
  const ens = (n) => (n > 1 ? `${n} enseignant·e·s titré·e·s` : `${n} enseignant·e titré·e`);
  // lignes du décompte, retouches et montants : static/lignes.js (testé sans la page)
  const L = window.DgeoLignes;
  const titresDe = L.titres, personnesDe = L.personnes;
  const nonTitresDe = (eff) => (eff.moniteurs_js || 0) + (eff.autres || 0);

  let dossier = null;
  let fichier = null; // dernier PDF choisi : « Réanalyser avec toutes les pages » le renvoie
  let garderPages = false; // prochain envoi : sans retirer de page
  let autoRows = []; // lignes telles que le serveur les calcule
  let retouches = {}; // retouches à la main : { « rubrique|mode » : { champ : { valeur, base } } }
  let recomputeTimer = null;
  const cartes = new Map(); // id de pièce → éléments de sa fiche mis à jour après chaque calcul

  // ------------------------------------------------------------ envoi du dossier
  // La zone est un bouton : Tab l'atteint, Entrée l'ouvre. Le fichier choisi part aussitôt à
  // l'analyse — il fallait encore trouver « Analyser le dossier », grisé jusque-là.
  const drop = $("#drop"), fileInput = $("#file");
  drop.addEventListener("click", () => fileInput.click());
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files[0]) choisir(e.dataTransfer.files[0]); });
  fileInput.addEventListener("change", () => { const f = fileInput.files[0]; fileInput.value = ""; if (f) choisir(f); });
  function choisir(f) {
    fichier = f;
    $("#fname").textContent = `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} Mo)`;
    analyser(f);
  }

  async function analyser(f) {
    $("#upload-error").innerHTML = "";
    await sauvegarderMaintenant(); // le décompte ouvert reste gardé : il se reprend plus haut
    drop.disabled = true;
    $("#progress").classList.add("on");
    const fd = new FormData();
    fd.append("file", f);
    if ($("#type-select").value) fd.append("type_activite", $("#type-select").value);
    // lu par la passerelle de Compta Blonay, qui retire sinon la pièce comptable de la caisse
    if (garderPages) fd.append("garder_toutes_les_pages", "1");
    garderPages = false;
    let nouveau = false;
    try {
      const r = await fetch("/api/analyse", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
      ouvrir(await r.json(), null);
      nouveau = true;
      planifierSauvegarde(0);
      $("#sec-dossier").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      $("#upload-error").append(el("div", { class: "error" }, `Le dossier n'a pas pu être lu : ${err.message}. Choisissez à nouveau le fichier pour réessayer.`));
    } finally {
      $("#progress").classList.remove("on");
      drop.disabled = false;
    }
    const liste = await chargerListe();
    if (nouveau) signalerDejaCommence(liste);
  }
  // Le même dossier déposé une seconde fois (par erreur, ou pour corriger) repartait de zéro sans
  // rien dire : le décompte déjà commencé, avec ses effectifs et ses corrections, est proposé.
  function signalerDejaCommence(liste) {
    const b = $("#bandeau-doublon");
    b.innerHTML = "";
    const avant = dossier.numero ? liste.find((x) => x.id !== dossier.id && x.numero === dossier.numero) : null;
    b.hidden = !avant;
    if (!avant) return;
    b.append(
      el("div", {}, [el("b", {}, `Un décompte ${avant.numero} est déjà commencé sur ce PC`), ` (modifié ${depuis(avant.enregistre)}${avant.total != null ? `, CHF ${fmt(avant.total)}` : ""}). Celui-ci repart de la lecture du PDF : effectifs et corrections sont à refaire.`]),
      el("button", { type: "button", class: "small", onclick: () => reprendre(avant.id) }, "Reprendre celui déjà commencé"),
    );
  }

  fetch("/api/health").then(r => r.json()).then(h => {
    const s = $("#status");
    if (h.tesseract) { s.textContent = `v${h.version}`; s.title = "Lecture des scans sur ce PC (Tesseract) : prête"; }
    else { s.textContent = "⚠ Lecture des scans indisponible"; s.title = `Tesseract introuvable : seuls les PDF qui contiennent déjà du texte peuvent être lus · v${h.version}`; }
  }).catch(() => { $("#status").textContent = "serveur injoignable"; });

  // ------------------------------------------------------------ décomptes gardés et repris
  // Effectifs, corrections et retouches n'existaient que dans la page : fermer Compta Blonay,
  // recharger ou déposer un autre PDF les perdait sans un mot. L'état part au serveur à chaque
  // modification (rangé à côté du PDF analysé) et la liste ci-dessus permet de reprendre.
  let saveTimer = null;
  let aGarder = false;
  const propre = (r) => { const o = Object.assign({}, r); delete o._cle; delete o._marques; delete o._modeAuto; return o; };
  const etatAGarder = () => ({ version: 1, dossier: Object.assign({}, dossier, { rows: dossier.rows.map(propre) }), auto_rows: autoRows, retouches });
  const heure = (iso) => { const t = Date.parse(iso); return t ? new Date(t).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" }) : ""; };
  function planifierSauvegarde(delai = 700) {
    if (!dossier) return;
    aGarder = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(sauvegarderMaintenant, delai);
  }
  async function sauvegarderMaintenant() {
    clearTimeout(saveTimer);
    if (!dossier || !aGarder) return;
    aGarder = false;
    try {
      const r = await fetch(`/api/dossiers/${dossier.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(etatAGarder()) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
      const j = await r.json();
      $("#save-state").textContent = `✓ Décompte gardé sur ce PC à ${heure(j.enregistre)} : il se reprend plus tard, même après avoir fermé Compta Blonay.`;
    } catch (err) {
      aGarder = true;
      $("#save-state").textContent = `⚠ Décompte pas encore gardé (${err.message}) : nouvel essai à la prochaine modification.`;
    }
  }
  // en quittant (fermeture, rechargement), la dernière modification part quand même
  window.addEventListener("pagehide", () => {
    if (dossier && aGarder && navigator.sendBeacon) navigator.sendBeacon(`/api/dossiers/${dossier.id}`, new Blob([JSON.stringify(etatAGarder())], { type: "text/plain;charset=UTF-8" }));
  });

  const depuis = (iso) => {
    const t = Date.parse(iso);
    if (!t) return "";
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "à l'instant";
    if (m < 60) return `il y a ${m} min`;
    if (m < 24 * 60) return `il y a ${Math.round(m / 60)} h`;
    return `le ${new Date(t).toLocaleDateString("fr-CH")}`;
  };
  async function chargerListe() {
    const box = $("#reprendre");
    let liste = [];
    try { const r = await fetch("/api/dossiers"); if (r.ok) liste = await r.json(); } catch (e) { /* liste indisponible : rien à proposer */ }
    box.innerHTML = "";
    box.hidden = !liste.length;
    if (!liste.length) return liste;
    box.append(el("div", { class: "titre" }, "Décomptes commencés sur ce PC"));
    for (const x of liste.slice(0, 6)) {
      const ouvert = !!dossier && dossier.id === x.id;
      const nom = x.numero || x.filename || x.id;
      box.append(el("div", { class: "item" + (ouvert ? " ouvert" : "") }, [
        el("span", { class: "quoi" }, [el("b", {}, nom), ` · ${x.type_activite === "camp" ? "Camp" : "Course d'école"}${x.classe ? " " + x.classe : ""}${x.activite ? " · " + x.activite : ""}`]),
        el("span", { class: "legend" }, `${x.total != null ? `CHF ${fmt(x.total)} · ` : ""}modifié ${depuis(x.enregistre)}`),
        ouvert
          ? el("span", { class: "legend" }, "ouvert ci-dessous")
          : el("button", { type: "button", class: "small", onclick: () => reprendre(x.id) }, "Reprendre"),
        ouvert ? null : el("button", { type: "button", class: "small danger", title: "Retirer de cette liste (le PDF analysé reste sur ce PC)", "aria-label": `Retirer ${nom} de la liste`, onclick: () => oublier(x, nom) }, "✕"),
      ]));
    }
    return liste;
  }
  async function reprendre(id, discret) {
    await sauvegarderMaintenant();
    try {
      const r = await fetch(`/api/dossiers/${id}`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
      const etat = await r.json();
      ouvrir(etat.dossier, etat);
      $("#save-state").textContent = `✓ Décompte repris tel qu'il était ${depuis(etat.enregistre)}.`;
      recomputeRows(); // les rubriques et le calcul du serveur d'aujourd'hui
      if (!discret) $("#sec-dossier").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      if (!discret) $("#upload-error").append(el("div", { class: "error" }, `Ce décompte n'a pas pu être repris : ${err.message}`));
    }
    chargerListe();
  }
  async function oublier(x, nom) {
    if (!confirm(`Retirer « ${nom} » de la liste des décomptes commencés ?\n\nSes effectifs et ses corrections ne pourront plus être repris. Le PDF reste sur ce PC.`)) return;
    await fetch(`/api/dossiers/${x.id}`, { method: "DELETE" }).catch(() => {});
    chargerListe();
  }
  function ouvrir(d, etat) {
    dossier = d;
    autoRows = (etat && etat.auto_rows) || d.rows || [];
    retouches = (etat && etat.retouches) || {};
    $("#bandeau-doublon").hidden = true;
    try { sessionStorage.setItem("dgeo.ouvert", d.id); } catch (e) { /* ignore */ }
    renderAll();
  }
  // Après « Recharger l'application » (Ctrl+R), le décompte ouvert revient tout seul.
  chargerListe().then(() => {
    let id = null;
    try { id = sessionStorage.getItem("dgeo.ouvert"); } catch (e) { /* ignore */ }
    if (id && !dossier) reprendre(id, true);
  });

  // ------------------------------------------------------------ rendu
  function renderAll() {
    $("#sec-dossier").hidden = false; $("#sec-pieces").hidden = false; $("#sec-rows").hidden = false;
    renderBandeauPages(); renderDossier(); renderPieces(); renderRows();
    if (dossier.ocr_engine) $("#status").title += ` · pages lues : ${dossier.ocr_engine}`;
  }

  function onChange(recompute) {
    planifierSauvegarde();
    if (!recompute) return;
    clearTimeout(recomputeTimer);
    recomputeTimer = setTimeout(recomputeRows, 250);
  }

  // Page(s) retirée(s) par la passerelle de Compta Blonay avant l'analyse (la pièce comptable de
  // la caisse ouvre le dossier scanné). Cela ne se voyait que dans une note de la barre latérale,
  // masquée à 1440 px ; si c'était le formulaire, on ne comprenait pas pourquoi il manquait.
  function renderBandeauPages() {
    const b = $("#bandeau-pages");
    b.innerHTML = "";
    const info = dossier.pages_retirees;
    b.hidden = !(info && info.pages && info.pages.length);
    if (b.hidden) return;
    const n = info.pages.length, s = n > 1 ? "s" : "";
    const quoi = `Page${s} ${info.pages.join(", ")} sur ${info.total} retirée${s} avant l'analyse`;
    const pourquoi = info.supposee
      ? " : le scan n'a aucun texte lisible, et Compta Blonay a supposé que la première page était la pièce comptable de la caisse."
      : ` : c'est la pièce comptable de la caisse (« PIÈCE COMPTABLE » lu sur la page).`;
    const sansFormulaire = !(dossier.pages || []).some((p) => p.kind === "form");
    b.append(el("div", {}, [el("b", {}, quoi), pourquoi]));
    if (sansFormulaire) b.append(el("div", {}, "Le formulaire n'a pas été trouvé dans ce qui reste : si c'était lui, réanalysez avec toutes les pages."));
    b.append(el("button", { type: "button", class: "small", onclick: reanalyserTout }, "Réanalyser avec toutes les pages"));
  }
  function reanalyserTout() {
    garderPages = true;
    if (fichier) { analyser(fichier); return; }
    alert("Choisissez à nouveau le fichier PDF du dossier : il sera lu avec toutes ses pages.");
    fileInput.click();
  }

  function field(label, key, opts = {}) {
    if (opts.date) {
      const iso = versIso(dossier[key]);
      const input = el("input", { type: "date", value: iso, onchange: (e) => { dossier[key] = depuisIso(e.target.value); onChange(opts.recompute); } });
      const lu = dossier[key] && !iso ? el("span", { class: "legend" }, `lu sur le formulaire : « ${dossier[key]} »`) : null;
      return el("label", { class: "f" }, [label, input, lu]);
    }
    const input = opts.select
      ? el("select", { onchange: (e) => { dossier[key] = e.target.value; onChange(opts.recompute); if (opts.rerender) opts.rerender(); } }, opts.select.map(([v, t]) => el("option", { value: v, selected: dossier[key] === v ? "" : null }, t)))
      : el("input", { type: opts.type || "text", value: dossier[key] ?? "", placeholder: opts.placeholder || "", onchange: (e) => { dossier[key] = opts.type === "number" ? num(e.target.value) : e.target.value; onChange(opts.recompute); } });
    return el("label", { class: "f" }, [label, input]);
  }

  function renderDossier() {
    const g = $("#dossier-fields"); g.innerHTML = "";
    g.append(
      field("N° de dossier (course / camp n°)", "numero", { placeholder: "ex. ANS100325" }),
      // les rubriques des pièces dépendent du type : les fiches sont redessinées, sinon les
      // rubriques du camp (Hébergement, Nourriture, Cuisinière) restaient inaccessibles
      field("Type d'activité (modèle Excel)", "type_activite", { select: [["course", "Course d'école"], ["camp", "Camp"]], recompute: true, rerender: () => {
        // Les rubriques absentes du nouveau modèle repassent à « Autre », comme le serveur le
        // fait : sinon la fiche montrait la première rubrique de la liste alors que la pièce en
        // gardait une autre, et le classeur partait sur « Autre ».
        const dispo = rubriquesDu(dossier.type_activite);
        for (const p of dossier.pieces) if (!dispo.includes(p.rubrique)) p.rubrique = "Autre";
        renderPieces();
      } }),
      field("Classe(s)", "classe"),
      field("Enseignant·e responsable", "enseignant"),
      field("Nom de l'activité", "activite"),
      field("Premier jour", "date_debut", { date: true }),
      field("Dernier jour", "date_fin", { date: true }),
      field("Date du décompte (en bas de l'Excel)", "date_decompte", { date: true }),
      field("Budget accordé (pour information)", "budget", { type: "number" }),
    );
    const e = $("#effectifs"); e.innerHTML = "";
    const eff = dossier.effectifs;
    const effField = (label, key, aide) => el("label", { class: "f" }, [aide ? el("span", {}, [label, " ", el("small", {}, aide)]) : label, el("input", { type: "number", min: 0, value: eff[key] ?? 0, onchange: (ev) => { eff[key] = Math.max(0, parseInt(ev.target.value || "0", 10)); renderEffCalc(); onChange(true); } })]);
    // « titré » est le mot du formulaire DGEO ; il est dit ici ce qu'il veut dire : payé par l'État
    e.append(
      el("div", { class: "groupe etat" }, [el("div", { class: "titre" }, "Payé·e·s par l'État — « titré·e·s »"), el("div", { class: "champs" }, [effField("Enseignant·e·s DGEO", "enseignants_dgeo"), effField("Enseignant·e·s J+S", "enseignants_js")])]),
      el("div", { class: "groupe" }, [el("div", { class: "titre" }, "Pas payé·e·s par l'État — « non titré·e·s »"), el("div", { class: "champs" }, [effField("Moniteurs·trices J+S", "moniteurs_js"), effField("Autres accompagnant·e·s", "autres", "(parents, aides…)")])]),
      el("div", { class: "groupe" }, [el("div", { class: "titre" }, "Classe"), el("div", { class: "champs" }, [effField("Élèves", "eleves")])]),
    );
    renderEffCalc();
    const hasEur = dossier.pieces.some(p => p.currency === "EUR");
    if (hasEur) g.append(field("Taux EUR → CHF (ex. 0.95)", "taux_eur_chf", { type: "number", recompute: true }));
    const noms = $("#noms");
    noms.innerHTML = "";
    if (dossier.noms_enseignants.length || dossier.noms_accompagnants.length) {
      noms.append(el("span", {}, `Noms lus sur le formulaire — enseignant·e·s : ${dossier.noms_enseignants.join(", ") || "–"} · accompagnant·e·s : ${dossier.noms_accompagnants.join(", ") || "–"}`));
    }
    if (dossier.form_expenses && dossier.form_expenses.length) {
      const lines = dossier.form_expenses.map(x => `${x.categorie || "?"} · ${x.descriptif || ""}${x.pieces ? " (n° " + x.pieces + ")" : ""}${x.paye_commune != null ? " · commune " + fmt(x.paye_commune) : ""}${x.paye_enseignant != null ? " · enseignant·e " + fmt(x.paye_enseignant) : ""}`);
      noms.append(el("div", { style: "margin-top:4px" }, `Tableau des dépenses du formulaire : ${lines.join(" — ")}${dossier.form_total != null ? " — total " + fmt(dossier.form_total) : ""}`));
    }
    renderWarnings();
  }

  // Effectifs retenus, avec la règle écrite en clair ; les cases du modèle (F11, D11, E11, G11)
  // restent en infobulle pour qui veut comparer avec l'Excel.
  function renderEffCalc() {
    const eff = dossier.effectifs;
    const t = titresDe(eff), non = nonTitresDe(eff), total = personnesDe(eff);
    const c = $("#effectifs-calc"); c.innerHTML = "";
    const chiffre = (label, v, case_) => el("span", { title: `Case ${case_} du modèle Excel` }, [`${label} : `, el("b", {}, String(v))]);
    c.append(
      el("div", { class: "chiffres" }, [chiffre("Titré·e·s", t, "F11"), chiffre("Non titré·e·s", non, "D11"), chiffre("Élèves", eff.eleves || 0, "E11"), chiffre("Total des personnes", total, "G11")]),
      el("div", { class: "regle" }, total
        ? `Un montant partagé (repas, car, hébergement…) compte pour l'État : montant ÷ ${total} personne${total > 1 ? "s" : ""} × ${ens(t)}. Un billet à prix par personne : un tarif adulte par enseignant·e titré·e, plein tarif d'abord.`
        : "Remplissez les effectifs : sans eux, aucun montant ne peut être partagé."),
    );
  }

  function renderWarnings() {
    const w = $("#warnings"); w.innerHTML = "";
    for (const m of dossier.warnings || []) w.append(el("div", {}, m.replace(/^\[calcul\]\s*/, "")));
  }

  function thumbStyle(p) {
    const page = dossier.pages.find(x => x.number === p.page);
    if (!page) return "";
    const [x0, y0, x1, y1] = p.bbox;
    const W = 230, H = 170, pad = 12;
    const bw = Math.max(1, x1 - x0 + 2 * pad), bh = Math.max(1, y1 - y0 + 2 * pad);
    const scale = Math.min(W / bw, H / bh);
    return `background-image:url('${page.url}');background-size:${page.width * scale}px ${page.height * scale}px;background-position:${-(x0 - pad) * scale}px ${-(y0 - pad) * scale}px;`;
  }

  // Numéros de la colonne « N° pièce » du formulaire (« 1 », « 2-3 », « 1, 4 »).
  function numerosDuFormulaire() {
    const set = new Set();
    for (const x of dossier.form_expenses || []) {
      for (const part of String(x.pieces || "").split(/[,;/]+/)) {
        const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(part);
        if (m) { for (let i = +m[1]; i <= +m[2] && i - +m[1] < 100; i++) set.add(String(i)); } else if (/^\s*\d+\s*$/.test(part)) set.add(String(+part));
      }
    }
    return set;
  }
  const resultatDe = (p) => { const r = dossier.resultats || {}; return r[p.id] || r[String(p.id)] || null; };

  function renderPieces() {
    const c = $("#pieces"); c.innerHTML = "";
    cartes.clear();
    const rubs = rubriquesDu(dossier.type_activite);
    const form = numerosDuFormulaire();
    for (const p of dossier.pieces) c.append(renderPiece(p, rubs, form));
    majComptePieces();
  }
  function majComptePieces() {
    const included = dossier.pieces.filter(p => p.include).length;
    $("#pieces-count").textContent = `— ${dossier.pieces.length} lu${dossier.pieces.length > 1 ? "s" : ""}, ${included} compté${included > 1 ? "s" : ""}`;
  }

  // Bandeau en tête de fiche : compté ou pas, et ce que la pièce rapporte à l'État. Une pièce
  // écartée n'était qu'un peu plus pâle, avec une phrase rouge tout en bas ; et le résultat d'une
  // pièce ne se lisait nulle part (le « 2 titrés retenus » s'affichait loin, dans les effectifs).
  function majEtatPiece(p) {
    const c = cartes.get(p.id);
    if (!c) return;
    const res = resultatDe(p);
    c.carte.classList.toggle("ecartee", !p.include);
    let nouveau;
    if (!p.include) nouveau = el("div", { class: "etat-piece ecarte" }, [el("b", {}, "✕ Pas compté"), p.exclusion_reason ? ` — ${p.exclusion_reason}` : ""]);
    else if (res && res.montant == null && res.texte) nouveau = el("div", { class: "etat-piece doute" }, [el("b", {}, "⚠ Coché, mais pas encore compté"), ` — ${res.texte}`]);
    else nouveau = el("div", { class: "etat-piece compte" }, [el("b", {}, "✓ Compté"), res && res.texte ? [" — pour l'État : ", el("span", { class: "calcul" }, res.texte)] : " — calcul en cours…"]);
    c.etat.replaceWith(nouveau);
    c.etat = nouveau;
    majAideNumero(p);
  }
  // Le numéro doit être celui écrit sur le papier : il part dans le libellé Excel « (Pce 4) ».
  function majAideNumero(p) {
    const c = cartes.get(p.id);
    if (!c) return;
    c.aideNum.textContent = "";
    c.num.classList.toggle("manque", !!p.include && !p.numero);
    if (!p.include) return;
    if (!p.numero) c.aideNum.textContent = "Écrivez le n° inscrit sur le ticket : il figurera dans le libellé Excel « (Pce …) ».";
    else if (c.form.size && !c.form.has(p.numero)) c.aideNum.textContent = `Le n° ${p.numero} n'est pas dans la colonne « N° pièce » du formulaire (${[...c.form].join(", ")}) : vérifiez sur le papier.`;
  }

  function renderPiece(p, rubs, form) {
    const card = el("div", { class: "piece" + (p.include ? "" : " ecartee"), "data-piece": p.id });
    const etat = el("div", { class: "etat-piece" });
    const left = el("div", {}, [
      el("div", { class: "thumb", style: thumbStyle(p), title: "Agrandir", onclick: () => openViewer(p) }),
      el("div", { class: "thumb-cap" }, [el("span", {}, `page ${p.page}`), el("a", { href: "#", onclick: (e) => { e.preventDefault(); openViewer(p); } }, "voir la page")]),
    ]);
    // Le motif d'exclusion vient du serveur (rules.NON_REMBOURSABLES) et ne se reconnaît pas au
    // texte affiché ici : on se fonde sur la sorte précédente. Corriger un récépissé mal reconnu
    // ne rendait jamais la pièce au décompte.
    const kindSel = el("select", { "aria-label": "Sorte de justificatif", onchange: (e) => {
      const avant = p.kind;
      p.kind = e.target.value;
      if (motifs()[p.kind]) { p.include = false; p.exclusion_reason = motifs()[p.kind]; }
      else if (motifs()[avant]) { p.include = true; p.exclusion_reason = null; }
      onChange(true); renderPieces();
    } },
      Object.entries(KINDS).map(([v, t]) => el("option", { value: v, selected: p.kind === v ? "" : null }, t)));
    const includeCb = el("input", { type: "checkbox", onchange: (e) => { p.include = e.target.checked; if (p.include) p.exclusion_reason = null; else if (!p.exclusion_reason) p.exclusion_reason = "Décoché à la main"; majEtatPiece(p); majComptePieces(); onChange(true); } });
    includeCb.checked = !!p.include;
    const numInput = el("input", { class: "num-input", value: p.numero || "", placeholder: "?", "aria-label": "N° écrit sur le ticket",
      title: "N° écrit sur le ticket : le même que dans la colonne « N° pièce » du formulaire ; il est repris dans le libellé Excel « (Pce …) »",
      onchange: (e) => { p.numero = e.target.value.trim(); majAideNumero(p); onChange(true); } });
    const head = el("div", { class: "head" }, [
      el("label", { class: "num" }, ["Justificatif n°", numInput]),
      kindSel,
      el("label", { class: "compter" }, [includeCb, "Compter dans le décompte"]),
      el("button", { type: "button", class: "small danger", title: "Retirer ce justificatif de la liste", "aria-label": "Retirer ce justificatif de la liste", onclick: () => { if (confirm("Retirer ce justificatif de la liste ?\n\nPour le garder visible sans le compter, décochez plutôt « Compter dans le décompte ».")) { dossier.pieces = dossier.pieces.filter(x => x !== p); onChange(true); renderPieces(); } } }, "✕"),
    ]);
    const aideNum = el("div", { class: "aide-num" });
    const f = (label, key, opts = {}) => {
      let input;
      if (opts.select) input = el("select", { onchange: (e) => { p[key] = e.target.value; if (opts.after) opts.after(); onChange(true); if (opts.rerender) renderPieces(); } }, opts.select.map(([v, t]) => el("option", { value: v, selected: p[key] === v ? "" : null }, t)));
      else if (opts.date) input = el("input", { type: "date", value: versIso(p[key]), onchange: (e) => { p[key] = depuisIso(e.target.value); onChange(false); } });
      else input = el("input", { type: opts.type || "text", step: opts.type === "number" ? "0.01" : null, value: p[key] ?? "", onchange: (e) => { p[key] = opts.type === "number" ? num(e.target.value) : e.target.value; onChange(opts.type === "number"); } });
      return el("label", { class: "f" }, [label, input]);
    };
    const fields = el("div", { class: "fields" }, [
      f("Fournisseur", "vendor"),
      f("Date", "date", { date: true }),
      // changer la devise redessine la fiche (les champs « Montant CHF imprimé » et « Taux »
      // n'apparaissent qu'en EUR) et suit les tarifs, comme dans l'application fenêtrée
      f("Devise", "currency", { select: [["CHF", "CHF"], ["EUR", "EUR"]], rerender: true, after: () => { for (const fl of p.fares) fl.currency = p.currency; renderDossier(); } }),
      f("Total du justificatif", "total", { type: "number" }),
      ...(p.currency === "EUR" ? [f("Montant CHF imprimé (si présent)", "total_chf", { type: "number" }), f("Taux sur le justificatif", "rate", { type: "number" })] : []),
      f("Rubrique du décompte", "rubrique", { select: optionsRubrique(rubs, p.rubrique).map(r => [r, r]) }),
      f("Calcul", "mode", { select: MODES }),
    ]);
    // tarifs
    const fares = el("div", { class: "fares" });
    const table = el("table", {}, [el("thead", {}, el("tr", {}, ["Qté", "Catégorie", "Prix unitaire", "Libellé lu", ""].map(t => el("th", {}, t)))), el("tbody")]);
    const tb = $("tbody", table);
    for (const fl of p.fares) {
      tb.append(el("tr", {}, [
        el("td", {}, el("input", { class: "qty", type: "number", min: 0, value: fl.qty, "aria-label": "Quantité", onchange: (e) => { fl.qty = parseInt(e.target.value || "0", 10); onChange(true); } })),
        el("td", {}, el("select", { "aria-label": "Catégorie", onchange: (e) => { fl.category = e.target.value; onChange(true); } }, Object.entries(CATS).map(([v, t]) => el("option", { value: v, selected: fl.category === v ? "" : null }, t)))),
        el("td", {}, el("input", { class: "price", type: "number", step: "0.01", value: fl.unit_price, "aria-label": "Prix unitaire", onchange: (e) => { fl.unit_price = num(e.target.value) || 0; onChange(true); } })),
        el("td", {}, el("input", { class: "label", value: fl.label, title: fl.source_line || "", "aria-label": "Libellé lu", onchange: (e) => { fl.label = e.target.value; onChange(false); } })),
        el("td", {}, el("button", { type: "button", class: "small danger", "aria-label": "Retirer ce tarif", onclick: () => { p.fares = p.fares.filter(x => x !== fl); onChange(true); renderPieces(); } }, "✕")),
      ]));
    }
    fares.append(el("div", { class: "legend", style: "margin:6px 0 2px" }, p.fares.length
      ? "Prix par personne lus sur le billet. L'État paie un tarif adulte par enseignant·e titré·e : les plein tarifs d'abord, puis les demi-tarifs."
      : "Aucun prix par personne lu : le total est partagé (règle de trois). Si le billet porte des prix par personne, ajoutez-les :"));
    if (p.fares.length) fares.append(table);
    fares.append(
      el("button", { type: "button", class: "small", style: "margin-top:4px", onclick: () => { p.fares.push({ label: "Adulte", category: "plein", qty: 1, unit_price: 0, currency: p.currency || "CHF", source_line: "" }); if (p.mode !== "direct") p.mode = "direct"; onChange(true); renderPieces(); } }, "+ Ajouter un prix par personne"),
    );
    const notes = el("div", { class: "notes" });
    for (const n of p.notes || []) notes.append(el("div", {}, `• ${n}`));
    card.append(etat, left, el("div", { class: "body" }, [head, aideNum, fields, fares, notes]));
    cartes.set(p.id, { carte: card, etat, aideNum, num: numInput, form });
    majEtatPiece(p);
    return card;
  }

  // ------------------------------------------------------------ lignes du décompte
  // Calcul du serveur + retouches à la main (lignes.js). Les lignes suivent toujours le calcul ;
  // une retouche ne remplace que son champ, reste marquée, et dit si le calcul a changé depuis.
  const lignesEffectives = () => L.effectives(autoRows, retouches);
  function retoucher(r, champ, valeur) { L.retoucher(retouches, autoRows, r._cle, champ, valeur); renderRows(); planifierSauvegarde(); }
  function reprendreCalcul(cle, champ) { L.reprendre(retouches, cle, champ); renderRows(); planifierSauvegarde(); }
  function changerRubriqueLigne(r, rub) {
    // La rubrique appartient aux justificatifs : changer celle d'une ligne change celle de ses
    // justificatifs, et tout suit (fiches, lignes, Excel). Les retouches de la ligne la suivent.
    for (const p of dossier.pieces) if ((r.pieces || []).includes(p.id)) p.rubrique = rub;
    L.deplacer(retouches, r._cle, `${rub}|${r._modeAuto}`);
    renderPieces(); onChange(true);
  }
  const rowAmount = (r) => L.montant(r, dossier.effectifs);
  function explication(r) {
    const eff = dossier.effectifs, t = titresDe(eff), tot = personnesDe(eff);
    const numeros = (r.pieces || []).map((id) => { const p = dossier.pieces.find((x) => x.id === id); return p ? (p.numero || "?") : null; }).filter(Boolean);
    const quels = numeros.length ? ` · justificatif${numeros.length > 1 ? "s" : ""} n° ${numeros.join(", ")}` : "";
    if (r.mode === "direct") {
      const detail = r.formule ? r.formule.replace(/\s*\*\s*/g, " × ") : "";
      return (detail ? `${detail} = ${fmt(r.cout_direct)} : un tarif adulte par enseignant·e titré·e` : `${fmt(r.cout_direct)} : montant tapé à la main`) + quels;
    }
    if (r.cout_total == null) return `Montant payé à remplir${quels}`;
    if (!tot) return `Remplissez les effectifs (section 2) pour partager ce montant${quels}`;
    return `${fmt(r.cout_total)} ÷ ${tot} personne${tot > 1 ? "s" : ""} × ${ens(t)} = ${fmt(rowAmount(r))}${quels}`;
  }
  // « modifié à la main ↺ » sous un champ retouché, en orange si le calcul a changé depuis
  function marque(r, champ, montrer) {
    const m = r._marques[champ];
    if (!m) return null;
    const auto = montrer(m.auto);
    return el("div", { class: "retouche" + (m.perimee ? " perimee" : "") }, [
      m.perimee ? `modifié à la main — le calcul donne maintenant ${auto}` : "modifié à la main",
      " ",
      el("button", { type: "button", class: "lien", title: `Reprendre la valeur calculée : ${auto}`, "aria-label": `Reprendre la valeur calculée : ${auto}`, onclick: () => reprendreCalcul(r._cle, champ) }, "↺ reprendre le calcul"),
    ]);
  }

  function renderRows() {
    const lignes = lignesEffectives();
    dossier.rows = lignes.map(propre);
    const tb = $("#rows-table tbody"); tb.innerHTML = "";
    const rubs = rubriquesDu(dossier.type_activite);
    for (const r of lignes) {
      const perimee = Object.values(r._marques).some((m) => m.perimee);
      const tr = el("tr", { class: "ligne" + (perimee ? " perimee" : "") }, [
        el("td", {}, el("select", { "aria-label": "Rubrique", onchange: (e) => changerRubriqueLigne(r, e.target.value) }, optionsRubrique(rubs, r.rubrique).map(x => el("option", { value: x, selected: r.rubrique === x ? "" : null }, x)))),
        el("td", {}, [
          el("select", { "aria-label": "Calcul", title: "Montant partagé : le montant payé est réparti entre toutes les personnes (règle de trois). Prix par personne : la part de l'État est tapée ou vient des tarifs du billet.", onchange: (e) => {
            const m = e.target.value;
            // Passage en prix par personne : la part de l'État part du montant actuel. Passage en
            // montant partagé : la colonne H attend le montant GLOBAL payé, pas la part de l'État ;
            // la recopier appliquait la règle de trois une seconde fois.
            if (m === "direct" && r.cout_direct == null) L.retoucher(retouches, autoRows, r._cle, "cout_direct", Math.round(rowAmount(r) * 100) / 100);
            retoucher(r, "mode", m);
          } }, Object.entries(MODE_COURT).map(([v, t]) => el("option", { value: v, selected: r.mode === v ? "" : null }, t))),
          marque(r, "mode", (v) => `« ${MODE_COURT[v] || v} »`),
        ]),
        el("td", { class: "num" }, r.mode === "prorata"
          ? [el("input", { class: "num", type: "number", step: "0.01", value: fmt(r.cout_total), "aria-label": "Montant payé", title: "Montant global payé (hébergement, car, repas…) : il est partagé entre toutes les personnes", onchange: (e) => retoucher(r, "cout_total", num(e.target.value)) }), marque(r, "cout_total", fmt)]
          : el("span", { class: "legend", title: "Coût total des billets, écrit dans l'Excel pour information : l'État ne paie que les tarifs adultes des enseignant·e·s titré·e·s" }, r.cout_total != null ? `${fmt(r.cout_total)} (info)` : "–")),
        el("td", { class: "num" }, r.mode === "direct"
          ? [el("input", { class: "num", type: "number", step: "0.01", value: fmt(r.cout_direct), "aria-label": "Part de l'État", title: r.formule ? `Écrit dans l'Excel comme formule : =ROUND(${r.formule.replace(/\s+/g, "")},2)` : "Montant tapé à la main", onchange: (e) => retoucher(r, "cout_direct", num(e.target.value)) }), marque(r, "cout_direct", fmt)]
          : el("b", {}, fmt(rowAmount(r)))),
      ]);
      const lib = el("input", { class: "libelle", value: r.libelle, "aria-label": "Libellé dans l'Excel", onchange: (e) => retoucher(r, "libelle", e.target.value) });
      const detail = el("tr", { class: "detail" + (perimee ? " perimee" : "") }, el("td", { colspan: 4 }, [
        el("label", { class: "lib" }, [el("span", { class: "legend" }, "Libellé dans l'Excel"), lib]),
        marque(r, "libelle", (v) => `« ${v} »`),
        el("div", { class: "explication" }, ["= ", explication(r)]),
      ]));
      tb.append(tr, detail);
    }
    if (!lignes.length) tb.append(el("tr", {}, el("td", { colspan: 4, class: "legend" }, "Aucune ligne : aucun justificatif compté, ou aucun·e enseignant·e titré·e.")));
    const total = L.total(lignes, dossier.effectifs);
    dossier.total = total;
    $("#total").textContent = `CHF ${fmt(total)}`;
    renderRetouchesInfo(lignes);
    const n = L.nombre(retouches);
    $("#btn-recompute").hidden = !n;
    $("#rows-state").textContent = n
      ? `${n} retouche${n > 1 ? "s" : ""} à la main (marquée${n > 1 ? "s" : ""}) ; tout le reste suit vos corrections.`
      : "Lignes calculées d'après les justificatifs comptés.";
  }
  function renderRetouchesInfo(lignes) {
    const box = $("#retouches-info"); box.innerHTML = "";
    const perimees = lignes.filter((r) => Object.values(r._marques).some((m) => m.perimee)).length;
    if (perimees) box.append(el("div", { class: "bandeau doute" }, `Vos corrections de justificatifs ont changé ${perimees > 1 ? `${perimees} lignes` : "une ligne"} que vous aviez retouchée${perimees > 1 ? "s" : ""} à la main : en orange, ce que donne maintenant le calcul. Gardez votre retouche, ou cliquez sur « ↺ reprendre le calcul ».`));
    for (const cle of L.orphelines(autoRows, retouches)) {
      const [rub, mode] = cle.split("|");
      box.append(el("div", { class: "bandeau info" }, [
        `La ligne « ${rub} · ${MODE_COURT[mode] || mode} » que vous aviez retouchée n'existe plus après vos dernières corrections. Votre retouche reviendra avec elle. `,
        el("button", { type: "button", class: "small", onclick: () => { delete retouches[cle]; renderRows(); planifierSauvegarde(); } }, "Oublier cette retouche"),
      ]));
    }
  }

  // ------------------------------------------------------------ recalcul
  async function recomputeRows() {
    try {
      const r = await fetch("/api/recompute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({}, dossier, { rows: [] })) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
      const d = await r.json();
      autoRows = d.rows; dossier.warnings = d.warnings; dossier.taux_eur_chf = d.taux_eur_chf; dossier.rubriques = d.rubriques; dossier.motifs_exclusion = d.motifs_exclusion; dossier.resultats = d.resultats;
      renderWarnings(); renderRows();
      for (const p of dossier.pieces) majEtatPiece(p);
      planifierSauvegarde();
    } catch (err) { alert("Le calcul n'a pas pu être refait : " + err.message); }
  }
  $("#btn-recompute").addEventListener("click", () => {
    const n = L.nombre(retouches);
    if (!n || !confirm(`Annuler vos ${n > 1 ? `${n} retouches` : "retouche"} des lignes et revenir au calcul d'après les justificatifs ?`)) return;
    retouches = {};
    renderRows(); planifierSauvegarde();
  });
  $("#btn-excel").addEventListener("click", async () => {
    const btn = $("#btn-excel"); btn.disabled = true;
    try {
      await sauvegarderMaintenant();
      const r = await fetch("/api/excel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({}, dossier, { rows: dossier.rows.map(propre) })) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
      const blob = await r.blob();
      const cd = r.headers.get("Content-Disposition") || "";
      // filename* (RFC 5987) d'abord : il porte le nom complet, filename n'en a qu'une version ASCII
      const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
      const m = /filename="?([^";]+)"?/.exec(cd);
      const nom = utf8 ? decodeURIComponent(utf8[1]) : (m ? m[1] : "decompte.xlsx");
      const a = el("a", { href: URL.createObjectURL(blob), download: nom });
      document.body.append(a); a.click(); a.remove();
    } catch (err) { alert("Le fichier Excel n'a pas pu être créé : " + err.message); } finally { btn.disabled = false; }
  });
  $("#btn-add-piece").addEventListener("click", () => {
    const id = Math.max(0, ...dossier.pieces.map(p => p.id)) + 1;
    const page = dossier.pages.find(p => p.kind === "pieces") || dossier.pages[0];
    dossier.pieces.push({ id, numero: "", page: page ? page.number : 1, bbox: [0, 0, page ? page.width : 100, page ? page.height : 100], kind: "facture", vendor: "", date: null, currency: "CHF", total: null, total_chf: null, rate: null, fares: [], rubrique: "Autre", mode: "prorata", include: true, exclusion_reason: null, notes: ["Ajouté à la main"], text: "" });
    renderPieces(); onChange(true);
    const c = cartes.get(id);
    if (c) { c.carte.scrollIntoView({ behavior: "smooth", block: "center" }); c.num.focus(); }
  });

  // ------------------------------------------------------------ visionneuse
  const viewer = $("#viewer"), vImg = $("#viewer-img"), vHl = $("#viewer-hl");
  let vPage = 1, vPiece = null;
  function openViewer(p) { vPiece = p || null; vPage = p ? p.page : 1; showPage(); viewer.classList.add("open"); }
  function showPage() {
    const page = dossier.pages.find(x => x.number === vPage);
    if (!page) return;
    $("#viewer-title").textContent = `Page ${vPage} / ${dossier.pages.length}` + (page.kind === "form" ? " — formulaire" : page.kind === "decompte" ? " — décompte DGEO joint" : "") + (vPiece && vPiece.page === vPage ? ` — justificatif n° ${vPiece.numero || "?"}` : "");
    const placer = () => {
      if (vPiece && vPiece.page === vPage) {
        const s = vImg.clientWidth / page.width;
        const [x0, y0, x1, y1] = vPiece.bbox;
        Object.assign(vHl.style, { left: (x0 * s - 6) + "px", top: (y0 * s - 6) + "px", width: ((x1 - x0) * s + 12) + "px", height: ((y1 - y0) * s + 12) + "px" });
        vHl.hidden = false;
        $("#viewer-wrap").scrollTo({ top: Math.max(0, y0 * s - 40) });
      } else vHl.hidden = true;
    };
    vImg.onload = placer;
    vImg.src = page.url;
    // même page déjà affichée : « load » ne se déclenche pas, le cadre serait resté sur la pièce
    // précédente
    if (vImg.complete && vImg.naturalWidth) placer();
    $("#viewer-text").textContent = vPiece && vPiece.page === vPage ? vPiece.text : "";
  }
  $("#viewer-close").addEventListener("click", () => viewer.classList.remove("open"));
  viewer.addEventListener("click", (e) => { if (e.target === viewer) viewer.classList.remove("open"); });
  $("#viewer-prev").addEventListener("click", () => { if (vPage > 1) { vPage--; showPage(); } });
  $("#viewer-next").addEventListener("click", () => { if (vPage < dossier.pages.length) { vPage++; showPage(); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") viewer.classList.remove("open"); });
})();
