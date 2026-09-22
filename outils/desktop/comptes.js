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

const crypto = require('crypto');

const FICHE = 'compte.json';
// Coût de scrypt : environ un dixième de seconde sur un poste de bureau.
// Assez pour rendre les essais en série pénibles, assez peu pour que la
// connexion reste instantanée à l'usage.
const COUT = { N: 16384, r: 8, p: 1, longueur: 32 };
const MINIMUM = 4;

function empreinte(motDePasse, selHex) {
  const sel = Buffer.from(selHex, 'hex');
  return crypto.scryptSync(String(motDePasse), sel, COUT.longueur,
    { N: COUT.N, r: COUT.r, p: COUT.p }).toString('hex');
}

// Ce qu'on écrit dans la fiche du compte. Jamais le mot de passe lui-même.
function sceller(motDePasse) {
  const selHex = crypto.randomBytes(16).toString('hex');
  return { algo: 'scrypt', N: COUT.N, r: COUT.r, p: COUT.p, sel: selHex, empreinte: empreinte(motDePasse, selHex) };
}

function protege(fiche) {
  const m = fiche && fiche.motDePasse;
  return !!(m && m.sel && m.empreinte);
}

// Comparaison à temps constant : une comparaison ordinaire s'arrête au premier
// caractère qui diffère, et ce temps-là se mesure.
function verifier(motDePasse, fiche) {
  if (!protege(fiche)) return false;
  const m = fiche.motDePasse;
  let calcule;
  try {
    calcule = crypto.scryptSync(String(motDePasse), Buffer.from(m.sel, 'hex'), COUT.longueur,
      { N: m.N || COUT.N, r: m.r || COUT.r, p: m.p || COUT.p }).toString('hex');
  } catch (e) { return false; }
  const a = Buffer.from(calcule, 'hex');
  const b = Buffer.from(String(m.empreinte), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Ce qu'on refuse, et pourquoi — le message part tel quel dans la fenêtre.
function motDePasseAcceptable(motDePasse) {
  const m = String(motDePasse == null ? '' : motDePasse);
  if (m.length < MINIMUM) return 'Le mot de passe doit faire au moins ' + MINIMUM + ' caractères.';
  if (m.length > 200) return 'Ce mot de passe est trop long.';
  return '';
}

module.exports = { FICHE, MINIMUM, sceller, verifier, protege, motDePasseAcceptable };
