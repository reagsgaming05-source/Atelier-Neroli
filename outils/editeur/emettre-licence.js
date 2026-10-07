/*
 * Émet un fichier de licence signé — SUR VOTRE POSTE, avec la clé privée « licence » qui
 * ne quitte jamais ce poste (ni GitHub, ni le site, ni son hébergeur).
 *
 *   node editeur/emettre-licence.js --client "Commune de Exemple" --ide CHE-000.000.000 \
 *        --postes 10 [--modele site|interne] [--maj-jusqu 2027-10-01] [--id BLP-2026-0042] [--cle fichier.pem]
 *
 * Écrit « <id>.licence.json » dans le dossier courant : c'est le fichier que le client pose,
 * sous le nom « licence.json », à côté de l'exécutable. Garde-le aussi : le corps signé
 * à l'octet près permet de rejouer la vérification quand un client dit que son fichier ne marche pas.
 *
 * postes : 1, 10, ou 0 pour « illimité ». modele « interne » : un service qui ne paie pas
 * (le vôtre, les collègues) — mêmes fonctions, aucune échéance.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { signer, brute, lireCles } = require('../desktop/signature');
const { lireLeFichier, MODELES } = require('../desktop/licence');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const client = arg('client');
if (!client) { console.error('--client "Nom du client" est obligatoire'); process.exit(1); }
const modele = arg('modele', 'site');
if (!MODELES.includes(modele)) { console.error('--modele : ' + MODELES.join(' ou ')); process.exit(1); }
const postes = Number(arg('postes', '0'));
if (!Number.isInteger(postes) || postes < 0) { console.error('--postes : un entier (0 = illimité)'); process.exit(1); }
const aujourdhui = new Date();
const emise = aujourdhui.toISOString().slice(0, 10);
const plusUnAn = new Date(aujourdhui.getTime()); plusUnAn.setUTCFullYear(plusUnAn.getUTCFullYear() + 1);
const majJusqu = modele === 'interne' ? '' : arg('maj-jusqu', plusUnAn.toISOString().slice(0, 10));
if (majJusqu && !/^\d{4}-\d{2}-\d{2}$/.test(majJusqu)) { console.error('--maj-jusqu : AAAA-MM-JJ'); process.exit(1); }
const id = arg('id', 'BLP-' + aujourdhui.getFullYear() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase());

// La clé privée : --cle, ou la plus récente « licence-*.pem » du dossier des clés.
let fichierCle = arg('cle');
if (!fichierCle) {
  const dossier = process.env.AKTUM_CLES_DIR || path.join(os.homedir(), 'aktum-cles-privees');
  try { fichierCle = fs.readdirSync(dossier).filter((f) => /^licence-.*\.pem$/.test(f)).sort().pop(); if (fichierCle) fichierCle = path.join(dossier, fichierCle); } catch (e) { /* dit plus bas */ }
}
if (!fichierCle) { console.error('Aucune clé privée « licence » trouvée. Voir : node editeur/generer-cles.js licence'); process.exit(1); }
const pem = fs.readFileSync(fichierCle, 'utf8');
const publique = brute(crypto.createPublicKey(crypto.createPrivateKey(pem)));
const connue = lireCles().licence.find((c) => c.cle === publique);
if (!connue) { console.error('Cette clé privée ne correspond à aucune clé publique « licence » de desktop/cles-publiques.json : les applications refuseraient le fichier.'); process.exit(1); }

const corps = { v: 1, objet: 'licence', cle: connue.id, id, client, ide: arg('ide', ''), postes, modele, emise, majJusqu };
const signee = signer(corps, pem);
const sortie = path.join(process.cwd(), id + '.licence.json');
fs.writeFileSync(sortie, JSON.stringify(signee, null, 2) + '\n');
// Relire comme le fera l'application : ce qu'on remet au client doit passer.
const essai = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-licence-'));
fs.copyFileSync(sortie, path.join(essai, 'licence.json'));
const r = lireLeFichier(essai, lireCles().licence);
fs.rmSync(essai, { recursive: true, force: true });
if (!r.ok) { fs.unlinkSync(sortie); console.error('La licence émise ne passe pas la vérification : ' + r.raison); process.exit(1); }
// Le registre des licences émises : une ligne par émission, sur VOTRE poste (à côté des clés privées, jamais dans le dépôt ni sur le site). Il garde
// ce qui permet de répondre à « mon fichier ne marche pas » (le corps signé à l'octet près, son empreinte) et de tracer une réémission : même client,
// nouvelle date. Les noms de clients y sont : c'est une donnée de l'éditeur, à sauvegarder avec les clés, pas à publier.
try {
  const registre = path.join(process.env.AKTUM_CLES_DIR || path.join(os.homedir(), 'aktum-cles-privees'), 'registre-licences.jsonl');
  fs.mkdirSync(path.dirname(registre), { recursive: true });
  const emises = fs.existsSync(registre) ? fs.readFileSync(registre, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return {}; } }) : [];
  const reemission = emises.some((x) => x.client === client && x.ide === (arg('ide', '')));
  fs.appendFileSync(registre, JSON.stringify({ quand: aujourdhui.toISOString(), id, client, ide: arg('ide', ''), postes, modele, emise, majJusqu, reemission, cle: connue.id,
    empreinte: crypto.createHash('sha256').update(fs.readFileSync(sortie)).digest('hex'), corps: signee }) + '\n');
  console.log('Registre : ' + registre + (reemission ? '  (réémission pour un client déjà servi)' : ''));
} catch (e) { console.error('Le registre des licences n\'a pas pu être tenu : ' + e.message + ' — notez cette émission à la main.'); }
console.log('Licence ' + id + ' émise pour « ' + client + ' » : ' + (postes || 'postes illimités') + (postes ? ' postes' : '') + ', mises à jour jusqu’au ' + (majJusqu || '—') + '.');
console.log('Fichier : ' + sortie + '  (le client le pose sous le nom licence.json à côté de l’exécutable)');
