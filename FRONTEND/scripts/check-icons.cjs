// Falla si la app usa un icono literal que no está en el subconjunto de Material Symbols.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const subset=new Set(fs.readFileSync(path.join(root,'public/fonts/material-symbols-subset.txt'),'utf8').split('\n').filter(Boolean));
const files=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|html)$/.test(p)&&!p.endsWith('.spec.ts'))files.push(p);}};walk(path.join(root,'src/app'));
const used=new Set();const patterns=[/<mat-icon[^>]*>\s*([a-z_0-9]+)\s*<\/mat-icon>/g,/\bicon="([a-z_0-9]+)"/g,/\bicon:\s*'([a-z_0-9]+)'/g,/<mat-icon[^>]*>\{\{[^}]*\}\}<\/mat-icon>/g];
for(const f of files){const s=fs.readFileSync(f,'utf8');for(const re of patterns.slice(0,3))for(const m of s.matchAll(re))used.add(m[1]);
 for(const m of s.matchAll(patterns[3]))for(const q of m[0].matchAll(/'([a-z_0-9]+)'/g))used.add(q[1]);}
const missing=[...used].filter(i=>!subset.has(i));
if(missing.length){console.error('Iconos fuera del subconjunto (ejecuta scripts/subset-icons.py):',missing.join(', '));process.exit(1);}
console.log(`${used.size} iconos literales, todos en el subconjunto.`);
