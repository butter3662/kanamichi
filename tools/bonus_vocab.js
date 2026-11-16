const fs=require('fs'),vm=require('vm');
const days=fs.readdirSync(__dirname+'/../src/days').sort().map(f=>fs.readFileSync(__dirname+'/../src/days/'+f,'utf8'));
const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../src/data.js','utf8')+days.join('\n')+';this.D=DAYS',c);
const toH=s=>s.replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60));
const out=c.D.map(D=>D.w.trim().split('\n').map(l=>{const f=l.split('|')[0].trim(); return [f.replace(/\[([^\]]+)\]/g,'').replace(/〜/g,''), toH(f.replace(/[^\s\[\]]+?\[([^\]]+)\]/g,(m)=>m).replace(/([㐀-鿿々〆]+)\[([^\]]+)\]/g,'$2').replace(/〜/g,''))]}));
process.stdout.write(JSON.stringify(out));
