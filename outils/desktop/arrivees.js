/*
 * La boîte de réception du copieur : un dossier désigné une fois par la personne (le dossier où le copieur multifonction dépose ses
 * numérisations), surveillé tant que l'application tourne, dont les nouveaux documents sont annoncés — pour les ouvrir, les classer ou
 * les supprimer en un clic.
 *
 * Trois règles, dites aussi dans l'aide :
 *  - le dossier est CHOISI par la personne, la surveillance est AFFICHÉE (Préférences et boîte « Arrivées ») et s'arrête d'un clic ;
 *  - RIEN n'est déplacé ni supprimé sans un geste de la personne (et la suppression se confirme) ;
 *  - un fichier que le copieur est encore en train d'écrire n'est pas annoncé : on attend que sa taille et sa date ne bougent plus.
 *
 * La surveillance est un balayage régulier du dossier, pas fs.watch : sur un partage réseau (SMB), fs.watch rate des événements ou en invente,
 * un balayage de quelques secondes ne se trompe pas et ne coûte rien. La boîte ne parle jamais à la page de chemins : elle reçoit des NOMS de
 * fichiers, vérifiés contre ce que le dossier contient à l'instant (jamais un chemin fourni par la page), et le dossier de classement est
 * choisi dans une boîte du système, côté processus principal.
 *
 * Ce module est sans Electron : il s'éprouve avec un dossier temporaire (test/arrivees.test.js).
 */
const fs = require('fs');
const path = require('path');

const EXTENSIONS = ['.pdf', '.tif', '.tiff', '.jpg', '.jpeg', '.png'];
const STABLE_MS = 3000;       // un fichier modifié depuis moins de ça est encore en cours d'écriture
const INTERVALLE_MS = 4000;
const MAX_FICHIERS = 500;     // au-delà, la liste se tait : un dossier de 40 000 scans n'est pas une boîte de réception

// Un nom qui n'existe pas encore dans le dossier : « scan.pdf », puis « scan (2).pdf », « scan (3).pdf »…
function nomLibre(dossier, nom) {
  const ext = path.extname(nom), base = nom.slice(0, nom.length - ext.length);
  let n = 1, candidat = nom;
  while (fs.existsSync(path.join(dossier, candidat))) { n++; candidat = base + ' (' + n + ')' + ext; }
  return candidat;
}

class Surveillance {
  /**
   * @param {object} o
   * @param {(e:{total:number,nouveaux:number,noms:string[]})=>void} o.onChange  appelé quand l'ensemble des nouveaux documents change
   * @param {number} [o.vusJusqua]  la date (ms) à laquelle la personne a regardé la boîte pour la dernière fois
   * @param {(ts:number)=>void} [o.onVu]
   * @param {()=>number} [o.maintenant]  l'horloge (remplaçable pour l'essai)
   */
  constructor(o) {
    this.onChange = o.onChange || (() => {});
    this.onVu = o.onVu || (() => {});
    this.vusJusqua = o.vusJusqua || 0;
    this.maintenant = o.maintenant || Date.now;
    this.intervalle = o.intervalleMs || INTERVALLE_MS;
    this.stable = o.stableMs == null ? STABLE_MS : o.stableMs;
    this.dossier = '';
    this.minuteur = null;
    this.precedent = new Map();   // nom -> taille au balayage d'avant
    this.derniere = '';           // la signature des nouveaux annoncés
    this.enCours = false;
    this.liste = [];
  }
  demarrer(dossier) {
    const st = fs.statSync(dossier);
    if (!st.isDirectory()) throw new Error('ce n\'est pas un dossier');
    this.arreter();
    this.dossier = dossier;
    this.precedent = new Map(); this.derniere = '';
    this.minuteur = setInterval(() => { this.sonder().catch(() => {}); }, this.intervalle);
    if (this.minuteur.unref) this.minuteur.unref();
    return this.sonder();
  }
  arreter() {
    if (this.minuteur) clearInterval(this.minuteur);
    this.minuteur = null; this.dossier = ''; this.liste = []; this.precedent = new Map(); this.derniere = '';
  }
  actif() { return !!this.dossier; }
  // Un balayage : la liste des documents du dossier, chacun dit « stable » quand le copieur a fini de l'écrire, « nouveau » quand il est
  // arrivé après le dernier regard de la personne.
  async sonder() {
    if (!this.dossier || this.enCours) return this.liste;
    this.enCours = true;
    const dossier = this.dossier;
    try {
      let noms;
      try { noms = await fs.promises.readdir(dossier); } catch (e) { this.liste = []; this.erreur = e && e.code ? String(e.code) : 'erreur'; return this.liste; }
      this.erreur = '';
      noms = noms.filter((n) => EXTENSIONS.includes(path.extname(n).toLowerCase())).slice(0, MAX_FICHIERS);
      const maintenant = this.maintenant();
      const liste = [], vu = new Map();
      for (const nom of noms) {
        let st;
        try { st = await fs.promises.stat(path.join(dossier, nom)); } catch (e) { continue; }   // parti entre-temps
        if (!st.isFile()) continue;
        vu.set(nom, st.size);
        const calme = maintenant - st.mtimeMs >= this.stable;
        liste.push({ nom, taille: st.size, mtimeMs: st.mtimeMs, stable: calme, nouveau: st.mtimeMs > this.vusJusqua });
      }
      // Un fichier dont la taille a changé depuis le balayage d'avant n'est pas stable, même si sa date est ancienne (copieur qui écrit en place).
      liste.forEach((f) => { if (this.precedent.has(f.nom) && this.precedent.get(f.nom) !== vu.get(f.nom)) f.stable = false; });
      this.precedent = vu;
      liste.sort((a, b) => b.mtimeMs - a.mtimeMs);
      this.liste = liste;
      const nouveaux = liste.filter((f) => f.stable && f.nouveau).map((f) => f.nom);
      const signature = nouveaux.join('\n');
      if (signature !== this.derniere) {
        this.derniere = signature;
        this.onChange({ total: liste.length, nouveaux: nouveaux.length, noms: nouveaux });
      }
      return liste;
    } finally { this.enCours = false; }
  }
  // La personne regarde la boîte : ce qui est là n'est plus « nouveau ».
  marquerVu() {
    this.vusJusqua = this.maintenant();
    this.liste.forEach((f) => { f.nouveau = false; });
    this.derniere = '';
    this.onVu(this.vusJusqua);
    this.onChange({ total: this.liste.length, nouveaux: 0, noms: [] });
  }
  // Un nom reçu de la page : seulement un nom que le dossier contient maintenant, sans aucun séparateur de chemin.
  cheminDe(nom) {
    if (!this.dossier || typeof nom !== 'string' || !nom || nom !== path.basename(nom) || /[\\/]/.test(nom)) return null;
    if (!EXTENSIONS.includes(path.extname(nom).toLowerCase())) return null;
    const c = path.join(this.dossier, nom);
    return fs.existsSync(c) ? c : null;
  }
  // Classer : déplacer vers un dossier d'affaire. Rend { ok, chemin } ou { ok:false, erreur }.
  classer(nom, versDossier) {
    const source = this.cheminDe(nom);
    if (!source) return { ok: false, erreur: 'Ce document n\'est plus dans la boîte (quelqu\'un l\'a peut-être déjà classé).' };
    try { if (!fs.statSync(versDossier).isDirectory()) return { ok: false, erreur: 'Le dossier de classement n\'existe pas.' }; } catch (e) { return { ok: false, erreur: 'Le dossier de classement n\'existe pas.' }; }
    const cible = path.join(versDossier, nomLibre(versDossier, nom));
    try {
      try { fs.renameSync(source, cible); }
      catch (e) {
        // Un autre disque (ou un autre partage) : on copie, on vérifie la taille, puis seulement on retire l'original.
        if (!e || e.code !== 'EXDEV') throw e;
        fs.copyFileSync(source, cible);
        if (fs.statSync(cible).size !== fs.statSync(source).size) { fs.unlinkSync(cible); throw new Error('la copie est incomplète'); }
        fs.unlinkSync(source);
      }
    } catch (e) { return { ok: false, erreur: 'Le document n\'a pas pu être déplacé : ' + (e && e.message ? e.message : e) }; }
    this.liste = this.liste.filter((f) => f.nom !== nom);
    return { ok: true, chemin: cible };
  }
  supprimer(nom) {
    const source = this.cheminDe(nom);
    if (!source) return { ok: false, erreur: 'Ce document n\'est plus dans la boîte.' };
    try { fs.unlinkSync(source); } catch (e) { return { ok: false, erreur: 'Le document n\'a pas pu être supprimé : ' + (e && e.message ? e.message : e) }; }
    this.liste = this.liste.filter((f) => f.nom !== nom);
    return { ok: true };
  }
}

module.exports = { Surveillance, EXTENSIONS, STABLE_MS, INTERVALLE_MS, MAX_FICHIERS, nomLibre };
