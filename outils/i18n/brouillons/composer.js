const fs=require('fs');
const g=JSON.parse(fs.readFileSync('/tmp/i18n/gele.json','utf8'));
function lire(prefixe, fichiers){
  const m={};
  for(const f of fichiers){
    for(const l of fs.readFileSync('/tmp/i18n/'+f,'utf8').split('\n')){
      const i=l.indexOf('|'); if(i<0)continue; m[+l.slice(0,i)]=l.slice(i+1);
    }
  }
  return m;
}
const sets={
 litteraux:['c0.txt','c1.txt','c2.txt','c3.txt','c4.txt','c5.txt','c6.txt'],
 motifs:['m0.txt','m1.txt','m2.txt'],
 html:['h0.txt']};
const out={};
let manque=0;
for(const [nom,fich] of Object.entries(sets)){
  const m=lire(nom,fich); out[nom]={};
  Object.keys(g[nom]).forEach((k,i)=>{
    let v=m[i];
    if(v===undefined){manque++;console.error('manque',nom,i,k);return;}
    if(v==='=') v=k; else if(k.includes('\n')) v=v.replace(/\\n/g,'\n');
    out[nom][k]=v;
  });
}
fs.writeFileSync('/home/user/Atelier-Neroli/outils/i18n/de.json',JSON.stringify(out,null,1)+'\n');
console.log('manque',manque,Object.values(out).map(o=>Object.keys(o).length));
