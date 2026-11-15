// 앱에서 읽어 줄 모든 일본어(say)를 모아 [{h, say, text}] JSON으로 출력한다.
// h: 앱과 같은 해시(파일 이름), say: 앱이 speak()에 넘기는 글자(가나), text: 음성 엔진에 넣을 글자(한자 포함 가능)
// 사용: node tools/list_say.js > say.json
const fs=require('fs'), vm=require('vm'), path=require('path');
const src=['data.js','app.js'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8')).join('\n');
const stubEl={addEventListener(){},classList:{add(){},remove(){},contains(){return false}},innerHTML:''};
const ctx={console,TextEncoder,Math,JSON,Date,setTimeout,clearTimeout,
  document:{getElementById:()=>stubEl,querySelector:()=>null,addEventListener(){},body:stubEl},
  window:{},navigator:{},localStorage:{getItem(){return null},setItem(){},removeItem(){}},fetch:()=>Promise.reject(new Error('no'))};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(src+'\n;globalThis.__out={ITEMS,sayHash,plain,kanaOf,tileSay};',ctx);
const {ITEMS,sayHash,plain,kanaOf,tileSay}=ctx.__out;
const out=new Map();
const add=(say,text)=>{ if(!say) return; const h=sayHash(say); if(!out.has(h)) out.set(h,{h,say,text:text||say}); };
for(const it of Object.values(ITEMS)){
  if(it.kind==='hira'||it.kind==='kata') add(it.say,it.say);
  else if(it.kind==='word') add(it.say,(it.kanji&&!it.jp.includes('〜'))?it.jp:it.say);
  else if(it.kind==='phr'||it.kind==='sent'){
    add(it.say,it.jp);
    it.toks.forEach(t=>{ const k=tileSay(t); add(k, /[\u3400-\u9FFF]/.test(plain(t))?plain(t):k); });
  }
}
add('こんにちは');
process.stdout.write(JSON.stringify([...out.values()],null,0));
