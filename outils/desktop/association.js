/*
 * « Ouvrir les PDF avec Aktum PDF » : inscrire l'application, pour le compte Windows de la personne, comme candidate à l'ouverture des PDF.
 *
 * Ce que Windows laisse faire sans droits d'administrateur, et seulement cela :
 *   - un ProgID (HKCU\Software\Classes\AktumPDF.Document) avec sa commande d'ouverture, son icône et son nom ;
 *   - son ajout aux programmes proposés pour .pdf (HKCU\Software\Classes\.pdf\OpenWithProgids) — d'où « Ouvrir avec » au clic droit ;
 *   - une déclaration d'application (HKCU\Software\RegisteredApplications → Capabilities\FileAssociations) — d'où Paramètres ›
 *     Applications par défaut, où la personne choisit Aktum PDF en deux clics.
 * Ce qu'on ne fait JAMAIS : écrire dans …\FileExts\.pdf\UserChoice. Windows y pose une empreinte que seule sa propre boîte sait calculer, et
 * l'écriture directe est défaite au prochain démarrage de l'Explorateur : on se rend choisissable, on ne force pas le choix.
 *
 * L'application est portable : rien de tout cela n'est écrit sans que la personne le demande (un bouton dans les Préférences), et le même
 * bouton, inversé, efface exactement ces clés. Au lancement, si l'inscription existe mais pointe un autre chemin (le dossier a été déplacé),
 * elle est réécrite — sans cela, un double-clic ne ferait plus rien du tout, ce qui serait pire que d'ouvrir le navigateur.
 *
 * La décision (quelles clés, quelle commande, ce qui est à jour) est ici, séparée de ce qui touche au registre : `reg` est l'exécuteur
 * de « reg.exe », remplaçable par un faux pour l'éprouver sans Windows.
 */
const path = require('path');
const { execFile } = require('child_process');

const PROGID = 'AktumPDF.Document';
const CLE_APP = 'AktumPDF';
const CLASSES = 'HKCU\\Software\\Classes';
const NOM_AFFICHE = 'Aktum PDF';

// La commande d'ouverture : l'exécutable et le document passé en « %1 ».
const commandeDe = (exe) => '"' + exe + '" "%1"';

// Les écritures, dans l'ordre. Chacune : { cle, valeur?, type?, donnee } ; sans « valeur », c'est la valeur par défaut de la clé.
function ecritures(exe) {
  const nomExe = path.win32.basename(exe);
  const app = CLASSES + '\\Applications\\' + nomExe;
  return [
    { cle: CLASSES + '\\' + PROGID, donnee: 'Document PDF (' + NOM_AFFICHE + ')' },
    { cle: CLASSES + '\\' + PROGID, valeur: 'FriendlyTypeName', donnee: 'Document PDF (' + NOM_AFFICHE + ')' },
    { cle: CLASSES + '\\' + PROGID + '\\DefaultIcon', donnee: '"' + exe + '",0' },
    { cle: CLASSES + '\\' + PROGID + '\\shell\\open\\command', donnee: commandeDe(exe) },
    { cle: CLASSES + '\\.pdf\\OpenWithProgids', valeur: PROGID, type: 'REG_NONE', donnee: '' },
    { cle: app, valeur: 'FriendlyAppName', donnee: NOM_AFFICHE },
    { cle: app + '\\shell\\open\\command', donnee: commandeDe(exe) },
    { cle: app + '\\SupportedTypes', valeur: '.pdf', donnee: '' },
    { cle: 'HKCU\\Software\\' + CLE_APP + '\\Capabilities', valeur: 'ApplicationName', donnee: NOM_AFFICHE },
    { cle: 'HKCU\\Software\\' + CLE_APP + '\\Capabilities', valeur: 'ApplicationDescription', donnee: 'Lire, assembler et corriger des PDF, sur ce poste, sans rien envoyer' },
    { cle: 'HKCU\\Software\\' + CLE_APP + '\\Capabilities\\FileAssociations', valeur: '.pdf', donnee: PROGID },
    { cle: 'HKCU\\Software\\RegisteredApplications', valeur: CLE_APP, donnee: 'Software\\' + CLE_APP + '\\Capabilities' },
  ];
}
// Les arguments de « reg add » pour une écriture.
function argumentsAjout(e) {
  const a = ['add', e.cle];
  a.push(e.valeur ? '/v' : '/ve');
  if (e.valeur) a.push(e.valeur);
  a.push('/t', e.type || 'REG_SZ');
  // Une valeur vide s'écrit sans « /d » : un argument vide passerait mal la ligne de commande de reg.exe.
  if (e.donnee !== '') a.push('/d', e.donnee);
  a.push('/f');
  return a;
}
// Ce qu'on efface : exactement ce qu'on a écrit, rien d'autre (la valeur de .pdf\OpenWithProgids, pas la clé : d'autres programmes y sont).
function retraits(exe) {
  const nomExe = path.win32.basename(exe);
  return [
    ['delete', CLASSES + '\\' + PROGID, '/f'],
    ['delete', CLASSES + '\\.pdf\\OpenWithProgids', '/v', PROGID, '/f'],
    ['delete', CLASSES + '\\Applications\\' + nomExe, '/f'],
    ['delete', 'HKCU\\Software\\' + CLE_APP, '/f'],
    ['delete', 'HKCU\\Software\\RegisteredApplications', '/v', CLE_APP, '/f'],
  ];
}

// L'exécuteur réel : reg.exe, sans fenêtre.
function regReel(args) {
  return new Promise((resolve) => {
    execFile('reg', args, { windowsHide: true, timeout: 8000, encoding: 'utf8' }, (err, stdout) => {
      resolve({ ok: !err, code: err ? (err.code === undefined ? 1 : err.code) : 0, sortie: String(stdout || '') });
    });
  });
}
// La valeur d'une ligne de « reg query » : « (Par défaut)    REG_SZ    "C:\...\a.exe" "%1" ».
function valeurDeLaSortie(sortie) {
  for (const l of String(sortie).split(/\r?\n/)) {
    const m = /^\s+\S.*?\s+REG_(?:SZ|EXPAND_SZ)\s+(.*)$/.exec(l);
    if (m) return m[1].trim();
  }
  return '';
}

// Peut-on proposer l'inscription ici ? Seulement sous Windows, et pas depuis un support qu'on débranche : l'inscription resterait, morte.
function possible(plateforme, exe, amovible) {
  if (plateforme !== 'win32') return { ok: false, raison: 'Cette inscription ne concerne que Windows.' };
  if (!exe || !path.win32.isAbsolute(exe)) return { ok: false, raison: 'Le chemin de l\u2019application est inconnu.' };
  if (amovible) return { ok: false, raison: 'L\u2019application est sur un support amovible (clé USB, disque externe) : l\u2019inscription resterait sur ce poste, pointant vers un support absent. Copiez le dossier sur le poste ou sur un partage, puis recommencez de là.' };
  return { ok: true, raison: '' };
}

// L'état : inscrit (le ProgID est là), à jour (sa commande est celle de CET exécutable).
async function etat(exe, reg) {
  reg = reg || regReel;
  const r = await reg(['query', CLASSES + '\\' + PROGID + '\\shell\\open\\command', '/ve']);
  if (!r.ok) return { inscrit: false, aJour: false, commande: '' };
  const commande = valeurDeLaSortie(r.sortie);
  return { inscrit: !!commande, aJour: commande.toLowerCase() === commandeDe(exe).toLowerCase(), commande };
}
// Écrire. Rend { ok, erreur } ; en cas d'échec au milieu, ce qui a été écrit est retiré : jamais d'inscription à moitié.
async function inscrire(exe, reg) {
  reg = reg || regReel;
  for (const e of ecritures(exe)) {
    const r = await reg(argumentsAjout(e));
    if (!r.ok) { await retirer(exe, reg); return { ok: false, erreur: 'Windows a refusé d\u2019écrire « ' + e.cle + ' » (code ' + r.code + ').' }; }
  }
  return { ok: true, erreur: '' };
}
// Effacer. Une clé déjà absente n'est pas une erreur.
async function retirer(exe, reg) {
  reg = reg || regReel;
  for (const a of retraits(exe)) await reg(a);
  return { ok: true, erreur: '' };
}
// Au lancement : une inscription qui existe mais pointe ailleurs est réécrite ; sans inscription, on n'écrit RIEN.
async function reparerAuLancement(exe, reg) {
  const e = await etat(exe, reg);
  if (!e.inscrit || e.aJour) return { repare: false, etat: e };
  const r = await inscrire(exe, reg);
  return { repare: r.ok, etat: e, erreur: r.erreur };
}

module.exports = { PROGID, CLE_APP, commandeDe, ecritures, argumentsAjout, retraits, valeurDeLaSortie, possible, etat, inscrire, retirer, reparerAuLancement, regReel };
