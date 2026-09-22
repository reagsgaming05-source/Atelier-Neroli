// Pose l'icône et les informations de fichier sur un exécutable Windows.
//   node poser-icone.js <chemin.exe> <chemin.ico>
// Nécessite le paquet npm resedit ; aucun outil Windows n'est requis.
const fs = require('fs');
const { NtExecutable, NtExecutableResource, Resource, Data } = require('resedit');

const [, , cible, icone] = process.argv;
if (!cible || !icone) {
  console.error('usage : node poser-icone.js <chemin.exe> <chemin.ico>');
  process.exit(1);
}
const exe = NtExecutable.from(fs.readFileSync(cible));
const res = NtExecutableResource.from(exe);
const ico = Data.IconFile.from(fs.readFileSync(icone));
Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1036, ico.icons.map(i => i.data));

const vi = Resource.VersionInfo.createEmpty();
vi.lang = 1036;
vi.setFileVersion(1, 0, 3, 0);
vi.setProductVersion(1, 0, 3, 0);
vi.setStringValues({ lang: 1036, codepage: 1200 }, {
  FileDescription: 'Blonay PDF',
  ProductName: 'Blonay PDF',
  CompanyName: 'Atelier Neroli',
  InternalName: 'Blonay PDF',
  OriginalFilename: 'Blonay PDF.exe',
  LegalCopyright: 'Outil local, aucun envoi de donnees',
  Comments: 'Organiser, annoter et proteger des PDF, hors ligne',
});
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
fs.writeFileSync(cible, Buffer.from(exe.generate()));

const relu = NtExecutableResource.from(NtExecutable.from(fs.readFileSync(cible)));
const groupe = Resource.IconGroupEntry.fromEntries(relu.entries)[0];
const info = Resource.VersionInfo.fromEntries(relu.entries)[0].getStringValues({ lang: 1036, codepage: 1200 });
console.log('icônes posées :', groupe.icons.length, '| nom du fichier :', info.ProductName);
