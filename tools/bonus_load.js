// bonus_src.js(틀·실전 모의고사) + stages/*.js(보너스 지문)를 이어 붙인 원본
const fs=require('fs'),path=require('path');
module.exports=()=>{ const D=path.join(__dirname,'stages'); return fs.readFileSync(path.join(__dirname,'bonus_src.js'),'utf8')+'\n'+fs.readdirSync(D).filter(f=>f.endsWith('.js')).sort().map(f=>fs.readFileSync(path.join(D,f),'utf8')).join('\n'); };
