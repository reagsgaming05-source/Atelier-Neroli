// Aides communes aux tests : formulaire « PIÈCE COMPTABLE » synthétique (mots positionnés)
function makeForm(opts) {
  const w = (str, x, y) => ({ str, x, y: y + (opts.dy || 0), h: 10 });
  const words = [
    w('PIECE', 79, 82), w('COMPTABLE', 114, 82), w(opts.no, 349, 79), w('fe', 534, 79),
    w('DOIT', 79, 114), w('-', 118, 114), w('du', 141, 114), w('compte', 158, 114),
    w('SOMME', 338, 112), w('AVOIR', 410, 112), w('-', 462, 112), w('du', 487, 112), w('compte', 504, 112),
    w('Libellé', 342, 220), w('Total', 78, 390),
  ];
  let y = 142;
  for (const line of opts.lines || []) {
    if (line.doit) line.doit.split(' ').forEach((s, i) => words.push(w(s, 155 + i * 31, y)));
    if (line.somme) line.somme.split(' ').forEach((s, i) => words.push(w(s, 332 + i * 24, y)));
    if (line.avoir) line.avoir.split(' ').forEach((s, i) => words.push(w(s, 454 + i * 28, y)));
    y += 14;
  }
  if (opts.total) opts.total.split(' ').forEach((s, i) => words.push(w(s, 332 + i * 24, 388)));
  let ly = 261;
  for (const l of opts.libelle || []) { l.split(' ').forEach((s, i) => words.push(w(s, 78 + i * 40, ly))); ly += 14; }
  if (opts.date) opts.date.split(' ').forEach((s, i) => words.push(w(s, 56 + i * 14, 425)));
  return words;
}

module.exports = { makeForm };
