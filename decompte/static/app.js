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
    for (const c of [].concat(children)) if (c !== null && c !== undefined) n.append(c.nodeType ? c : document.createTextNode(String(c)));
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
  const KINDS = { billet: "Billet / ticket", facture: "Facture", recepisse: "Récépissé (exclu)", recu_carte: "Reçu de carte (exclu)", taux_change: "Taux de change (exclu)", autre: "Autre" };
  const CATS = { plein: "Plein tarif (adulte)", demi: "Demi-tarif (adulte)", enfant: "Élève / enfant", invite: "Invité (gratuit)", autre: "Autre" };
  const NON_REMB = ["recepisse", "recu_carte", "taux_change"];

  let dossier = null;
  let file = null;
  let rowsManual = false;
  let recomputeTimer = null;

  // ------------------------------------------------------------ upload
  const drop = $("#drop"), fileInput = $("#file"), btnAnalyse = $("#btn-analyse");
  drop.addEventListener("click", () => fileInput.click());
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener("change", () => { if (fileInput.files[0]) setFile(fileInput.files[0]); });
  function setFile(f) { file = f; $("#fname").textContent = `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} Mo)`; btnAnalyse.disabled = false; }

  btnAnalyse.addEventListener("click", async () => {
    if (!file) return;
    $("#upload-error").innerHTML = "";
    btnAnalyse.disabled = true;
    $("#progress").classList.add("on");
    const fd = new FormData();
    fd.append("file", file);
    if ($("#type-select").value) fd.append("type_activite", $("#type-select").value);
    try {
      const r = await fetch("/api/analyse", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json()).detail || r.statusText);
      dossier = await r.json();
      rowsManual = false;
      renderAll();
      $("#sec-dossier").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      $("#upload-error").append(el("div", { class: "error" }, `Erreur : ${err.message}`));
    } finally {
      $("#progress").classList.remove("on");
      btnAnalyse.disabled = false;
    }
  });

  fetch("/api/health").then(r => r.json()).then(h => {
    $("#status").innerHTML = h.tesseract ? `OCR local : <b>Tesseract ✓</b> · v${h.version}` : `<b>⚠ Tesseract introuvable</b> — installez-le (voir README) · v${h.version}`;
  }).catch(() => { $("#status").textContent = "serveur injoignable"; });

  // ------------------------------------------------------------ rendu
  function renderAll() {
    $("#sec-dossier").hidden = false; $("#sec-pieces").hidden = false; $("#sec-rows").hidden = false;
    renderDossier(); renderPieces(); renderRows();
  }

  function field(label, key, opts = {}) {
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
        for (const r of dossier.rows) if (!dispo.includes(r.rubrique)) r.rubrique = "Autre";
        renderPieces(); renderRows();
      } }),
      field("Classe(s)", "classe"),
      field("Enseignant-e responsable", "enseignant"),
      field("Nom de l'activité", "activite"),
      field("Date début (jj.mm.aaaa)", "date_debut"),
      field("Date fin (jj.mm.aaaa)", "date_fin"),
      field("Date du décompte (bas de l'Excel)", "date_decompte", { placeholder: "jj.mm.aaaa" }),
      field("Budget accordé (info)", "budget", { type: "number" }),
    );
    const e = $("#effectifs"); e.innerHTML = "";
    const eff = dossier.effectifs;
    const effField = (label, key) => el("label", { class: "f" }, [label, el("input", { type: "number", min: 0, value: eff[key] ?? 0, onchange: (ev) => { eff[key] = Math.max(0, parseInt(ev.target.value || "0", 10)); renderEffCalc(); onChange(true); } })]);
    e.append(effField("Élèves", "eleves"), effField("Enseignants DGEO (titrés)", "enseignants_dgeo"), effField("Enseignants J&S (titrés)", "enseignants_js"), effField("Moniteurs J+S (non titrés)", "moniteurs_js"), effField("Autres accompagnants (non titrés)", "autres"));
    renderEffCalc();
    const hasEur = dossier.pieces.some(p => p.currency === "EUR");
    if (hasEur) {
      g.append(field("Taux EUR → CHF (ex. 0.95)", "taux_eur_chf", { type: "number", recompute: true }));
    }
    const noms = $("#noms");
    noms.innerHTML = "";
    if (dossier.noms_enseignants.length || dossier.noms_accompagnants.length) {
      noms.append(el("span", {}, `Noms lus sur le formulaire — enseignants : ${dossier.noms_enseignants.join(", ") || "–"} · accompagnants : ${dossier.noms_accompagnants.join(", ") || "–"}`));
    }
    if (dossier.form_expenses && dossier.form_expenses.length) {
      const lines = dossier.form_expenses.map(x => `${x.categorie || "?"} · ${x.descriptif || ""}${x.pieces ? " (pce " + x.pieces + ")" : ""}${x.paye_commune != null ? " · commune " + fmt(x.paye_commune) : ""}${x.paye_enseignant != null ? " · enseignant " + fmt(x.paye_enseignant) : ""}`);
      noms.append(el("div", { style: "margin-top:4px" }, `Tableau des dépenses du formulaire : ${lines.join(" — ")}${dossier.form_total != null ? " — total " + fmt(dossier.form_total) : ""}`));
    }
    renderWarnings();
  }

  function renderEffCalc() {
    const eff = dossier.effectifs;
    const titres = (eff.enseignants_dgeo || 0) + (eff.enseignants_js || 0);
    const non = (eff.moniteurs_js || 0) + (eff.autres || 0);
    const total = (eff.eleves || 0) + titres + non;
    $("#effectifs-calc").innerHTML = `<span>Acc. titrés (F11) : <b>${titres}</b></span><span>Acc. non titrés (D11) : <b>${non}</b></span><span>Élèves (E11) : <b>${eff.eleves || 0}</b></span><span>Total (G11) : <b>${total}</b></span>`;
  }

  function renderWarnings() {
    const w = $("#warnings"); w.innerHTML = "";
    for (const m of dossier.warnings || []) w.append(el("div", {}, m.replace(/^\[calcul\]\s*/, "")));
    if (dossier.ocr_engine) w.append(el("div", { class: "legend", style: "background:none;border:none;padding:2px 0" }, `Moteur de lecture : ${dossier.ocr_engine}`));
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

  function renderPieces() {
    const c = $("#pieces"); c.innerHTML = "";
    const rubs = rubriquesDu(dossier.type_activite);
    const included = dossier.pieces.filter(p => p.include).length;
    $("#pieces-count").textContent = `— ${dossier.pieces.length} pièce(s) détectée(s), ${included} retenue(s)`;
    for (const p of dossier.pieces) c.append(renderPiece(p, rubs));
  }

  function renderPiece(p, rubs) {
    const card = el("div", { class: "piece" + (p.include ? "" : " excluded") });
    const left = el("div", {}, [
      el("div", { class: "thumb", style: thumbStyle(p), title: "Agrandir", onclick: () => openViewer(p) }),
      el("div", { class: "thumb-cap" }, [el("span", {}, `page ${p.page}`), el("a", { href: "#", onclick: (e) => { e.preventDefault(); openViewer(p); } }, "voir la page")]),
    ]);
    // Le motif d'exclusion vient du serveur (rules.NON_REMBOURSABLES) et ne se reconnaît pas au
    // texte affiché ici : on se fonde sur la sorte précédente. Corriger un récépissé mal reconnu
    // ne rendait jamais la pièce au décompte.
    const kindSel = el("select", { onchange: (e) => {
      const avant = p.kind;
      p.kind = e.target.value;
      if (NON_REMB.includes(p.kind)) { p.include = false; p.exclusion_reason = KINDS[p.kind]; }
      else if (NON_REMB.includes(avant)) { p.include = true; p.exclusion_reason = null; }
      onChange(true); renderPieces();
    } },
      Object.entries(KINDS).map(([v, t]) => el("option", { value: v, selected: p.kind === v ? "" : null }, t)));
    const includeCb = el("input", { type: "checkbox", onchange: (e) => { p.include = e.target.checked; if (p.include) p.exclusion_reason = null; onChange(true); renderPieces(); } });
    includeCb.checked = !!p.include;
    const head = el("div", { class: "head" }, [
      el("span", { class: "num" }, "Pièce"),
      el("input", { class: "num-input", value: p.numero || String(p.id), title: "N° de pièce (tel qu'écrit sur le dossier)", onchange: (e) => { p.numero = e.target.value.trim() || String(p.id); onChange(true); } }),
      kindSel,
      el("label", { style: "display:flex;align-items:center;gap:6px;margin-left:auto" }, [includeCb, "Retenir cette pièce"]),
      el("button", { class: "small danger", title: "Supprimer la pièce de la liste", onclick: () => { if (confirm("Supprimer cette pièce de la liste ?")) { dossier.pieces = dossier.pieces.filter(x => x !== p); onChange(true); renderPieces(); } } }, "✕"),
    ]);
    const f = (label, key, opts = {}) => el("label", { class: "f" }, [label,
      opts.select
        ? el("select", { onchange: (e) => { p[key] = e.target.value; if (opts.after) opts.after(); onChange(true); if (opts.rerender) renderPieces(); } }, opts.select.map(([v, t]) => el("option", { value: v, selected: p[key] === v ? "" : null }, t)))
        : el("input", { type: opts.type || "text", step: opts.type === "number" ? "0.01" : null, value: p[key] ?? "", onchange: (e) => { p[key] = opts.type === "number" ? num(e.target.value) : e.target.value; onChange(true); } })]);
    const fields = el("div", { class: "fields" }, [
      f("Fournisseur", "vendor"),
      f("Date", "date"),
      // changer la devise redessine la fiche (les champs « Montant CHF imprimé » et « Taux »
      // n'apparaissent qu'en EUR) et suit les tarifs, comme dans l'application fenêtrée
      f("Devise", "currency", { select: [["CHF", "CHF"], ["EUR", "EUR"]], rerender: true, after: () => { for (const fl of p.fares) fl.currency = p.currency; renderDossier(); } }),
      f("Total de la pièce", "total", { type: "number" }),
      ...(p.currency === "EUR" ? [f("Montant CHF imprimé (si présent)", "total_chf", { type: "number" }), f("Taux sur la pièce", "rate", { type: "number" })] : []),
      f("Rubrique Excel", "rubrique", { select: optionsRubrique(rubs, p.rubrique).map(r => [r, r]) }),
      f("Mode de calcul", "mode", { select: [["direct", "Saisie directe (tarifs adultes)"], ["prorata", "Règle de trois (montant global)"]] }),
    ]);
    // tarifs
    const fares = el("div", { class: "fares" });
    const table = el("table", {}, [el("thead", {}, el("tr", {}, ["Qté", "Catégorie", "Prix unitaire", "Libellé lu", ""].map(t => el("th", {}, t)))), el("tbody")]);
    const tb = $("tbody", table);
    for (const fl of p.fares) {
      tb.append(el("tr", {}, [
        el("td", {}, el("input", { class: "qty", type: "number", min: 0, value: fl.qty, onchange: (e) => { fl.qty = parseInt(e.target.value || "0", 10); onChange(true); } })),
        el("td", {}, el("select", { onchange: (e) => { fl.category = e.target.value; onChange(true); } }, Object.entries(CATS).map(([v, t]) => el("option", { value: v, selected: fl.category === v ? "" : null }, t)))),
        el("td", {}, el("input", { class: "price", type: "number", step: "0.01", value: fl.unit_price, onchange: (e) => { fl.unit_price = num(e.target.value) || 0; onChange(true); } })),
        el("td", {}, el("input", { class: "label", value: fl.label, title: fl.source_line || "", onchange: (e) => { fl.label = e.target.value; } })),
        el("td", {}, el("button", { class: "small danger", onclick: () => { p.fares = p.fares.filter(x => x !== fl); onChange(true); renderPieces(); } }, "✕")),
      ]));
    }
    fares.append(
      el("div", { class: "legend", style: "margin:6px 0 2px" }, p.fares.length ? "Tarifs par personne lus sur la pièce (mode « saisie directe » : on retient jusqu'à N titrés tarifs adultes, plein tarif d'abord)" : "Aucun tarif par personne lu → montant global (règle de trois), ou ajoutez les tarifs :"),
      table,
      el("button", { class: "small", style: "margin-top:4px", onclick: () => { p.fares.push({ label: "Adulte", category: "plein", qty: 1, unit_price: 0, currency: p.currency || "CHF", source_line: "" }); if (p.mode !== "direct") p.mode = "direct"; onChange(true); renderPieces(); } }, "+ Ajouter un tarif"),
    );
    const notes = el("div", { class: "notes" });
    if (!p.include && p.exclusion_reason) notes.append(el("div", { class: "reason" }, `Exclue : ${p.exclusion_reason}`));
    for (const n of p.notes || []) notes.append(el("div", {}, `• ${n}`));
    card.append(left, el("div", { class: "body" }, [head, fields, fares, notes]));
    return card;
  }

  function rowAmount(r) {
    if (r.mode === "direct") return Number(r.cout_direct || 0);
    const eff = dossier.effectifs;
    const titres = (eff.enseignants_dgeo || 0) + (eff.enseignants_js || 0);
    const total = (eff.eleves || 0) + titres + (eff.moniteurs_js || 0) + (eff.autres || 0);
    if (!total || r.cout_total == null) return 0;
    return Number(r.cout_total) / total * titres;
  }
  const round005 = (x) => Math.round(Math.round(x / 0.05) * 0.05 * 100) / 100;

  function renderRows() {
    const tb = $("#rows-table tbody"); tb.innerHTML = "";
    const rubs = rubriquesDu(dossier.type_activite);
    for (const r of dossier.rows) {
      const tr = el("tr", {}, [
        el("td", {}, el("select", { onchange: (e) => { r.rubrique = e.target.value; rowsManual = true; renderRows(); } }, optionsRubrique(rubs, r.rubrique).map(x => el("option", { value: x, selected: r.rubrique === x ? "" : null }, x)))),
        el("td", {}, el("input", { value: r.libelle, onchange: (e) => { r.libelle = e.target.value; rowsManual = true; } })),
        // mode de la ligne : règle de trois sur le coût total (H) ou part État saisie directement (I)
        el("td", {}, el("select", { title: "Règle de trois : coût total (H) / total participants × titrés, formule du modèle. Saisie directe : tarifs adultes connus, part État en I.", onchange: (e) => {
          const m = e.target.value;
          if (m === "direct" && (r.cout_direct == null)) r.cout_direct = Math.round(rowAmount(r) * 100) / 100;
          // Passage en règle de trois : la colonne H attend le montant GLOBAL payé, pas la part de
          // l'État (colonne I). La recopier revenait à appliquer la règle de trois une seconde fois
          // et le montant s'effondrait en silence : la case reste à remplir.
          r.mode = m; rowsManual = true; renderRows(); // le détail des tarifs (formule Excel) est conservé pour un retour en saisie directe
        } }, [["prorata", "Règle de trois (H)"], ["direct", "Saisie directe (I)"]].map(([v, t]) => el("option", { value: v, selected: r.mode === v ? "" : null }, t)))),
        el("td", { class: "num" }, r.mode === "prorata"
          ? el("input", { class: "num", type: "number", step: "0.01", value: fmt(r.cout_total), title: "Montant global payé (hébergement, bus, activité au prix de groupe…) : l'Excel calcule la part État par la règle de trois", onchange: (e) => { r.cout_total = num(e.target.value); rowsManual = true; renderRows(); } })
          : el("span", { class: "legend", title: "Coût total des billets, écrit en H à titre d'information ; la part État est saisie directement en I" }, r.cout_total != null ? fmt(r.cout_total) : "–")),
        el("td", { class: "num" }, r.mode === "direct"
          ? el("input", { class: "num", type: "number", step: "0.01", value: fmt(r.cout_direct), title: r.formule ? `Écrit dans l'Excel comme formule : =ROUND(${r.formule.replace(/\s+/g, "")},2)` : "Montant saisi directement", onchange: (e) => { r.cout_direct = num(e.target.value); r.formule = ""; rowsManual = true; renderRows(); } })
          : el("span", { class: "legend", title: "Formule Excel du modèle : H / total participants × titrés" }, "formule")),
        el("td", { class: "num" }, fmt(rowAmount(r))),
      ]);
      tb.append(tr);
    }
    if (!dossier.rows.length) tb.append(el("tr", {}, el("td", { colspan: 6, class: "legend" }, "Aucune ligne : aucune pièce retenue ou aucun accompagnant titré.")));
    const total = round005(dossier.rows.reduce((s, r) => s + rowAmount(r), 0));
    dossier.total = total;
    $("#total").textContent = `CHF ${fmt(total)}`;
    $("#rows-state").textContent = rowsManual ? "Lignes modifiées à la main — « Recalculer » les régénère depuis les pièces." : "Lignes calculées automatiquement depuis les pièces retenues.";
  }

  // ------------------------------------------------------------ recalcul
  function onChange(recompute) {
    if (!recompute) return;
    clearTimeout(recomputeTimer);
    recomputeTimer = setTimeout(recomputeRows, 250);
  }
  async function recomputeRows() {
    if (rowsManual) { renderRows(); return; }
    try {
      const r = await fetch("/api/recompute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dossier) });
      if (!r.ok) throw new Error((await r.json()).detail || r.statusText);
      const d = await r.json();
      dossier.rows = d.rows; dossier.warnings = d.warnings; dossier.total = d.total; dossier.taux_eur_chf = d.taux_eur_chf; dossier.rubriques = d.rubriques;
      renderWarnings(); renderRows();
    } catch (err) { alert("Recalcul impossible : " + err.message); }
  }
  $("#btn-recompute").addEventListener("click", () => { rowsManual = false; recomputeRows(); });
  $("#btn-excel").addEventListener("click", async () => {
    const btn = $("#btn-excel"); btn.disabled = true;
    try {
      const r = await fetch("/api/excel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dossier) });
      if (!r.ok) throw new Error((await r.json()).detail || r.statusText);
      const blob = await r.blob();
      const cd = r.headers.get("Content-Disposition") || "";
      // filename* (RFC 5987) d'abord : il porte le nom complet, filename n'en a qu'une version ASCII
      const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
      const m = /filename="?([^";]+)"?/.exec(cd);
      const nom = utf8 ? decodeURIComponent(utf8[1]) : (m ? m[1] : "decompte.xlsx");
      const a = el("a", { href: URL.createObjectURL(blob), download: nom });
      document.body.append(a); a.click(); a.remove();
    } catch (err) { alert("Génération impossible : " + err.message); } finally { btn.disabled = false; }
  });
  $("#btn-add-piece").addEventListener("click", () => {
    const id = Math.max(0, ...dossier.pieces.map(p => p.id)) + 1;
    const page = dossier.pages.find(p => p.kind === "pieces") || dossier.pages[0];
    dossier.pieces.push({ id, numero: String(id), page: page ? page.number : 1, bbox: [0, 0, page ? page.width : 100, page ? page.height : 100], kind: "facture", vendor: "", date: null, currency: "CHF", total: null, total_chf: null, rate: null, fares: [], rubrique: "Autre", mode: "prorata", include: true, exclusion_reason: null, notes: ["Pièce ajoutée à la main"], text: "" });
    renderPieces(); onChange(true);
  });

  // ------------------------------------------------------------ visionneuse
  const viewer = $("#viewer"), vImg = $("#viewer-img"), vHl = $("#viewer-hl");
  let vPage = 1, vPiece = null;
  function openViewer(p) { vPiece = p || null; vPage = p ? p.page : 1; showPage(); viewer.classList.add("open"); }
  function showPage() {
    const page = dossier.pages.find(x => x.number === vPage);
    if (!page) return;
    $("#viewer-title").textContent = `Page ${vPage} / ${dossier.pages.length}` + (page.kind === "form" ? " — formulaire" : page.kind === "decompte" ? " — décompte DGEO joint" : "") + (vPiece && vPiece.page === vPage ? ` — pièce ${vPiece.numero}` : "");
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
