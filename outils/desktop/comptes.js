// Les comptes : un nom, un mot de passe, et une connexion qui tient.
//
// Au premier lancement, chacune crée son compte — prénom, nom, mot de passe.
// Ensuite elle se connecte une fois, et l'application se rouvre sur ses
// affaires tant qu'elle ne se déconnecte pas. Les comptes se créent au fur et
// à mesure : rien à préparer, aucune liste à écrire d'avance.
//
// Le mot de passe n'est pas enregistré. Ce qui est gardé, c'est une empreinte
// calculée par scrypt, lente à dessein : même en lisant le fichier, on ne
// remonte pas au mot de passe. Un sel par compte fait que deux personnes ayant
// choisi le même mot de passe n'ont pas la même empreinte.
//
// Ce que cela protège : personne ne peut ouvrir le compte d'une autre depuis
// l'application. Ce que cela ne protège pas : les fichiers eux-mêmes restent
// lisibles pour qui ouvre le dossier du partage dans l'Explorateur. Le verrou
// est sur la porte de l'application, pas sur celle du dossier — seuls les
// droits NTFS ferment celle-là.
//
// Trois choses tiennent aux règles autour du mot de passe, et non à sa
// cryptographie, qui était saine :
//  - une règle qui refuse « 12345678 » et ses cousins, et un coût de scrypt
//    à la hauteur de ce qu'on recommande aujourd'hui (N = 2^17) ;
//  - un frein : trois essais gratuits, puis des attentes qui doublent, retenues
//    dans la fiche pour qu'un redémarrage ne les remette pas à zéro ;
//  - une issue quand on a oublié : un code de récupération, montré une seule
//    fois à la création et jamais gardé qu'en empreinte, et une trace écrite
//    de chaque changement de mot de passe.

const crypto = require('crypto');

const FICHE = 'compte.json';
// Coût de scrypt pour un mot de passe : N = 2^17, ce que recommande l'OWASP.
// Un dixième de seconde, c'était ce qu'on pouvait croire en 2^14 ; la
// connexion se fait une fois, et cela rend les essais en série huit fois plus
// chers à qui lirait le fichier. memoire : 128 · N · r = 128 Mio, plus la marge.
const COUT = { N: 131072, r: 8, p: 1, longueur: 32, memoire: 256 * 1024 * 1024 };
// Le code de récupération a 99 bits au hasard : il n'a pas besoin d'être lent
// pour résister, seulement de ne pas coûter une seconde de plus à chaque essai.
const COUT_CODE = { N: 16384, r: 8, p: 1, longueur: 32, memoire: 64 * 1024 * 1024 };
const MINIMUM = 8;

// Les mots de passe que n'importe qui essaie en premier. Peu, exprès : une
// liste de dix mille ferait croire que le reste est bon.
const COURANTS = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234',
  'password', 'password1', 'passw0rd', 'motdepasse', 'motdepasse1', 'mot2passe',
  'azertyui', 'azertyuiop', 'azerty123', 'azerty1234', 'qwertyui', 'qwertyuiop', 'qwerty123',
  'abcd1234', 'abcdefgh', 'aaaaaaaa', 'bonjour1', 'bonjour123', 'soleil123', 'commune1', 'commune123',
  'secretariat', 'secretariat1', 'administrateur', 'welcome1', 'bienvenue', 'changeme', 'letmein1',
]);

function empreinte(secret, selHex, cout) {
  const c = cout || COUT;
  return crypto.scryptSync(String(secret), Buffer.from(selHex, 'hex'), c.longueur,
    { N: c.N, r: c.r, p: c.p, maxmem: c.memoire }).toString('hex');
}

// Ce qu'on écrit dans la fiche du compte. Jamais le mot de passe lui-même.
function sceller(secret, cout) {
  const c = cout || COUT;
  const selHex = crypto.randomBytes(16).toString('hex');
  return { algo: 'scrypt', N: c.N, r: c.r, p: c.p, sel: selHex, empreinte: empreinte(secret, selHex, c) };
}

function protege(fiche) {
  const m = fiche && fiche.motDePasse;
  return !!(m && m.sel && m.empreinte);
}

// Comparaison à temps constant : une comparaison ordinaire s'arrête au premier
// caractère qui diffère, et ce temps-là se mesure. Le coût est celui de la
// fiche : un compte scellé avant le durcissement se vérifie encore.
function verifierScelle(secret, scelle) {
  if (!(scelle && scelle.sel && scelle.empreinte)) return false;
  let calcule;
  try {
    calcule = empreinte(secret, scelle.sel, { N: scelle.N || 16384, r: scelle.r || 8, p: scelle.p || 1, longueur: 32,
      memoire: Math.max(64 * 1024 * 1024, 144 * (scelle.N || 16384) * (scelle.r || 8)) });
  } catch (e) { return false; }
  const a = Buffer.from(calcule, 'hex');
  const b = Buffer.from(String(scelle.empreinte), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const verifier = (motDePasse, fiche) => protege(fiche) && verifierScelle(motDePasse, fiche.motDePasse);

// Une empreinte posée avec un coût plus faible que le coût actuel se refait,
// à la première connexion réussie : le mot de passe est alors sous les yeux.
function aRehacher(fiche) {
  const m = fiche && fiche.motDePasse;
  return !!(m && (Number(m.N) || 0) < COUT.N);
}

// Ce qu'on refuse, et pourquoi — le message part tel quel dans la fenêtre.
// `nom` : un mot de passe qui est le nom du compte n'en est pas un.
function motDePasseAcceptable(motDePasse, nom) {
  const m = String(motDePasse == null ? '' : motDePasse);
  if (m.length < MINIMUM) return 'Le mot de passe doit faire au moins ' + MINIMUM + ' caractères.';
  if (m.length > 200) return 'Ce mot de passe est trop long.';
  if (/^(.)\1+$/.test(m)) return 'Ce mot de passe répète le même caractère : choisissez-en un autre.';
  if (COURANTS.has(m.toLowerCase())) return 'Ce mot de passe est l’un des premiers qu’on essaie : choisissez-en un autre.';
  const sans = String(nom || '').toLowerCase().replace(/\s+/g, '');
  if (sans.length >= 4 && m.toLowerCase().replace(/\s+/g, '') === sans) return 'Le mot de passe ne peut pas être votre nom.';
  return '';
}

// ---------------------------------------------------------------------------
//  Le frein
// ---------------------------------------------------------------------------
const FREIN = { gratuits: 3, base: 5000, plafond: 15 * 60 * 1000 };

// Combien de millisecondes encore avant le prochain essai permis.
function attente(fiche, maintenant) {
  const n = Number(fiche && fiche.echecs) || 0;
  if (n < FREIN.gratuits) return 0;
  const dernier = Date.parse(fiche.dernierEchec) || 0;
  const delai = Math.min(FREIN.base * Math.pow(2, n - FREIN.gratuits), FREIN.plafond);
  return Math.max(0, dernier + delai - (maintenant == null ? Date.now() : maintenant));
}
const noterEchec = (fiche, maintenant) => Object.assign({}, fiche, { echecs: (Number(fiche && fiche.echecs) || 0) + 1, dernierEchec: new Date(maintenant == null ? Date.now() : maintenant).toISOString() });
function effacerEchecs(fiche) { const f = Object.assign({}, fiche); delete f.echecs; delete f.dernierEchec; return f; }
function messageAttente(ms) {
  const s = Math.ceil(ms / 1000);
  const duree = s < 90 ? s + ' secondes' : Math.ceil(s / 60) + ' minutes';
  return 'Trop d’essais. Patientez ' + duree + ' avant de réessayer.';
}

// ---------------------------------------------------------------------------
//  Le code de récupération
// ---------------------------------------------------------------------------
// Sans 0, O, 1, I, L : on le recopie à la main depuis une feuille.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function codeDeRecuperation() {
  let s = '';
  const octets = crypto.randomBytes(40);
  for (let i = 0; s.length < 20; i++) {
    // Rejet : 256 n'est pas un multiple de 31, on écarte le reste pour ne pas biaiser.
    if (octets[i] < 248) s += ALPHABET[octets[i] % ALPHABET.length];
  }
  return s.match(/.{5}/g).join('-');
}
// Majuscules, sans tirets ni espaces : on le recopie comme on peut.
const normaliserCode = (c) => String(c == null ? '' : c).toUpperCase().replace(/[^A-Z0-9]/g, '');
function scellerCode(code) { return sceller(normaliserCode(code), COUT_CODE); }
function verifierCode(code, fiche) {
  const n = normaliserCode(code);
  return n.length === 20 && !!(fiche && fiche.recuperation) && verifierScelle(n, fiche.recuperation);
}

// ---------------------------------------------------------------------------
//  La trace
// ---------------------------------------------------------------------------
// Qui a changé quoi, et quand. Les douze derniers événements, dans la fiche :
// la procédure de réinitialisation ouvre une fenêtre où le compte appartient au
// premier arrivé, et sans trace personne ne le saurait jamais.
function noterEvenement(fiche, quoi, poste, maintenant) {
  const liste = (Array.isArray(fiche && fiche.evenements) ? fiche.evenements : []).slice(-11);
  liste.push({ quand: new Date(maintenant == null ? Date.now() : maintenant).toISOString(), quoi, poste: String(poste || '') });
  return Object.assign({}, fiche, { evenements: liste });
}
function dernierChangement(fiche) {
  const l = (fiche && fiche.evenements) || [];
  for (let i = l.length - 1; i >= 0; i--) if (/^mot de passe/.test(l[i].quoi)) return l[i];
  return null;
}

module.exports = {
  FICHE, MINIMUM, COUT, COURANTS, FREIN,
  sceller, verifier, verifierScelle, protege, aRehacher, motDePasseAcceptable,
  attente, noterEchec, effacerEchecs, messageAttente,
  codeDeRecuperation, normaliserCode, scellerCode, verifierCode,
  noterEvenement, dernierChangement,
};
