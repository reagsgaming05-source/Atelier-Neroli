// Le rapport de diagnostic part chez le support, joint à un courriel, par la main de
// la personne : il ne doit contenir ni nom de document, ni contenu, ni nom de personne.
const test = require('node:test');
const assert = require('node:assert/strict');
const d = require('../desktop/diagnostic');

const ID = { utilisateur: 'mdupont', poste: 'GREFFE-PC07' };

test('les chemins perdent le nom de la personne, du poste et du partage', () => {
  assert.equal(d.anonymiser('C:\\Users\\mdupont\\Documents\\x', ID), 'C:\\Users\\<utilisateur>\\Documents\\x');
  assert.equal(d.anonymiser('/Users/marie/Bureau', {}), '/Users/<utilisateur>/Bureau');
  assert.equal(d.anonymiser('\\\\SRV-COMMUNE\\greffe\\BlonayPDF\\data', {}), '\\\\<serveur>\\<partage>\\BlonayPDF\\data');
  assert.equal(d.anonymiser('Poste GREFFE-PC07 : MDupont connecté', ID), 'Poste <poste> : <utilisateur> connecté');
});

test('les noms de fichiers, les guillemets et les courriels disparaissent', () => {
  assert.equal(d.anonymiser('Impossible de lire Decision-Conseil-2026.pdf', {}), 'Impossible de lire <fichier>.pdf');
  assert.equal(d.anonymiser('Champ de formulaire « Nom du recourant » : introuvable', {}), 'Champ de formulaire « … » : introuvable');
  assert.equal(d.anonymiser('envoyé à marie.dupont@commune.ch', {}), 'envoyé à <courriel>');
});

test('numéros AVS, IBAN et longues suites de chiffres disparaissent ; les petits nombres restent', () => {
  assert.equal(d.anonymiser('AVS 756.1234.5678.97', {}), 'AVS <numéro AVS>');
  assert.match(d.anonymiser('compte CH93 0076 2011 6238 5295 7', {}), /<IBAN>/);
  assert.match(d.anonymiser('référence 210000000003139471430009017', {}), /<nombre>/);
  assert.equal(d.anonymiser('page 12 sur 40, 3 erreurs', {}), 'page 12 sur 40, 3 erreurs');
});

test('le rapport dit la version, le système, le rangement, la licence — et le journal nettoyé', () => {
  const t = d.rapport({
    maintenant: Date.parse('2026-10-01T10:00:00Z'),
    produit: { version: '2.1.0', canal: 'stable', construction: 'construite le 01.10.2026', commit: 'abc1234' },
    systeme: { plateforme: 'Windows', version: '10.0.26100', arch: 'x64', electron: '33.4.11', chrome: '130', locale: 'fr-CH' },
    donnees: { mode: 'comptes', pourquoi: 'sur un lecteur réseau' },
    licence: { etat: 'licence', id: 'BLP-2026-0042', postes: 10, majJusqu: '2027-10-01' },
    postes: 2,
    ident: ID,
    journal: [
      { quand: Date.parse('2026-10-01T09:00:05Z'), niveau: 'avert', contexte: 'Champ de formulaire « Nom du recourant »', msg: 'lecture impossible dans C:\\Users\\mdupont\\Desktop\\Recours-Martin.pdf', fois: 3 },
      { quand: Date.parse('2026-10-01T09:01:00Z'), niveau: 'info', contexte: 'Préférence de thème', msg: 'storage refused', fois: 1 },
    ],
    reseau: [],
  });
  assert.match(t, /version      : 2\.1\.0 \(stable\)/);
  assert.match(t, /Windows 10\.0\.26100, x64/);
  assert.match(t, /rangement    : comptes — sur un lecteur réseau/);
  assert.match(t, /état         : licence \(BLP-2026-0042\)/);
  assert.match(t, /2 entrée\(s\), dont 3 avertissement\(s\)/);
  assert.match(t, /\(×3\)/);
  assert.match(t, /aucune\)/, 'et il dit que rien n\'a tenté de sortir');
  assert.ok(!/mdupont|Recours-Martin|Nom du recourant|GREFFE-PC07/i.test(t), 'aucun nom ne subsiste : ' + t);
  assert.match(t, /poste-[0-9a-f]{6}/, 'le poste se reconnaît d\'un rapport à l\'autre par une empreinte');
});

test('deux rapports du même poste portent la même empreinte, deux postes ont deux empreintes', () => {
  assert.equal(d.empreinteCourte('GREFFE-PC07'), d.empreinteCourte('GREFFE-PC07'));
  assert.notEqual(d.empreinteCourte('GREFFE-PC07'), d.empreinteCourte('GREFFE-PC08'));
});
