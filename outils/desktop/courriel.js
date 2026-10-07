/*
 * « Envoyer par courriel » : joindre le PDF à un nouveau message, dans le client de messagerie de la personne — qui décide de l'envoyer.
 *
 * Un lien « mailto: » ne sait pas joindre de fichier (la spécification n'a que des champs d'en-tête), et ce logiciel n'ouvre aucune
 * connexion : le seul chemin sans module natif est de piloter Outlook par COM, depuis PowerShell, sans droits d'administrateur. Le message
 * est préparé et AFFICHÉ, jamais envoyé. Rien ne passe par ce logiciel hors du poste.
 *
 * Quand ce chemin manque — pas d'Outlook (ou le nouvel Outlook, sans COM), PowerShell bridé par la stratégie du parc, macOS, Linux —, le
 * repli est honnête : le PDF est écrit dans un dossier de travail et ce dossier est ouvert, avec une phrase qui dit quoi faire.
 *
 * Le sujet et le chemin du fichier passent par l'ENVIRONNEMENT du processus, jamais par le texte du script : aucun nom de fichier ne peut
 * y glisser une commande. Les codes de sortie : 0 message affiché, 3 Outlook indisponible, 4 échec à la préparation du message.
 */
const { execFile } = require('child_process');

const SCRIPT_OUTLOOK = [
  "$ErrorActionPreference = 'Stop'",
  "try { $o = New-Object -ComObject Outlook.Application } catch { exit 3 }",
  "try { $m = $o.CreateItem(0); $m.Subject = $env:AKTUM_SUJET; [void]$m.Attachments.Add($env:AKTUM_PJ); $m.Display() } catch { exit 4 }",
  "exit 0",
].join('; ');
const CODES = { AFFICHE: 0, SANS_OUTLOOK: 3, ECHEC: 4 };

// Un sujet utile : le nom du document, sans son extension, sur une ligne.
function sujetDe(nom) {
  return String(nom || '').replace(/\.pdf$/i, '').replace(/[\r\n\u0000-\u001f]+/g, ' ').trim().slice(0, 200);
}
const argumentsPowerShell = () => ['-NoProfile', '-NonInteractive', '-Command', SCRIPT_OUTLOOK];

// L'exécuteur réel de PowerShell : { code } — -1 quand le programme lui-même est introuvable ou bridé.
function powershellReel(args, env) {
  return new Promise((resolve) => {
    execFile('powershell.exe', args, { env, windowsHide: true, timeout: 30000 }, (err) => {
      if (!err) return resolve({ code: 0 });
      resolve({ code: typeof err.code === 'number' ? err.code : -1 });
    });
  });
}
/**
 * Préparer le message. Rend { mode: 'outlook' } quand il est affiché, sinon { mode: 'dossier', raison } : à l'appelant d'ouvrir le dossier.
 * `plateforme`, `exec` et `env` se remplacent pour l'essai.
 */
async function preparer(chemin, nom, o) {
  o = o || {};
  const plateforme = o.plateforme || process.platform;
  if (plateforme !== 'win32') return { mode: 'dossier', raison: 'Ce poste n\u2019a pas d\u2019Outlook à piloter.' };
  const exec = o.exec || powershellReel;
  const env = Object.assign({}, o.env || process.env, { AKTUM_PJ: chemin, AKTUM_SUJET: sujetDe(nom) });
  const r = await exec(argumentsPowerShell(), env);
  if (r.code === CODES.AFFICHE) return { mode: 'outlook' };
  if (r.code === CODES.SANS_OUTLOOK) return { mode: 'dossier', raison: 'Outlook n\u2019est pas disponible sur ce poste (ou c\u2019est le nouvel Outlook, qu\u2019un autre programme ne peut pas piloter).' };
  if (r.code === -1) return { mode: 'dossier', raison: 'PowerShell n\u2019a pas pu être lancé sur ce poste.' };
  return { mode: 'dossier', raison: 'Outlook n\u2019a pas pu préparer le message.' };
}

module.exports = { SCRIPT_OUTLOOK, CODES, sujetDe, argumentsPowerShell, preparer };
