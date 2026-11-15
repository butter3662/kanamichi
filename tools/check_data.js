// 학습 데이터 점검: node tools/check_data.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const S=path.join(__dirname,'..','src');
const files=['curriculum.js','data.js',...fs.readdirSync(path.join(S,'days')).filter(f=>f.endsWith('.js')).sort().map(f=>'days/'+f)];
const ctx={console}; vm.createContext(ctx);
vm.runInContext(files.map(f=>fs.readFileSync(path.join(S,f),'utf8')).join('\n')+';globalThis.__={DAYS,CURRICULUM};',ctx);
const {DAYS,CURRICULUM}=ctx.__; const err=[], warn=[];
const KJ=/([㐀-鿿豈-﫿々〆]+)\[([^\]]+)\]/g, plain=s=>s.replace(KJ,'$1'), kana=s=>s.replace(KJ,'$2');
const seenW=new Map(), seenP=new Map();
const fmt=(s,where)=>{ const rest=s.replace(KJ,''); if(/[\[\]]/.test(rest)) err.push(`${where}: 괄호 형식 오류 → ${s}`); if(/[㐀-鿿々]/.test(kana(s))) warn.push(`${where}: 읽기 없는 한자 → ${s}`); };
DAYS.forEach((D,i)=>{ const n=i+1, C=CURRICULUM[i];
  if(!C) err.push(`Day ${n}: 커리큘럼에 없음`); else { if(C[0]!==D.t) err.push(`Day ${n}: 제목 불일치 ${D.t} / ${C[0]}`); if(C[1]!==D.g.t) err.push(`Day ${n}: 문법 제목 불일치 ${D.g.t} / ${C[1]}`); }
  const ws=D.w.trim().split('\n'); if(ws.length!==25) err.push(`Day ${n}: 단어 ${ws.length}개`);
  ws.forEach(l=>{ const p=l.split('|'); if(p.length<2||!p[1].trim()) err.push(`Day ${n}: 단어 형식 ${l}`); fmt(p[0],`Day ${n} 단어`); const k=plain(p[0])+'|'+kana(p[0]); if(seenW.has(k)) err.push(`Day ${n}: 중복 단어 ${k} (Day ${seenW.get(k)})`); seenW.set(k,n); });
  const chk=(l,where)=>{ const [fs_,ko]=l.split('|'); if(!ko) err.push(`${where}: 해석 없음 ${l}`); fs_.trim().split(/\s+/).forEach(t=>fmt(t,where)); const k=plain(fs_.replace(/\s+/g,'')); if(seenP.has(k)) err.push(`${where}: 중복 문장 ${k} (${seenP.get(k)})`); seenP.set(k,where); };
  D.e.trim().split('\n').forEach(l=>chk(l,`Day ${n} 표현`));
  D.g.s.trim().split('\n').forEach(l=>chk(l,`Day ${n} 예문`));
  if(D.e.trim().split('\n').length!==4) warn.push(`Day ${n}: 표현 ${D.e.trim().split('\n').length}개`);
  D.g.c.forEach((c,j)=>{ if(!c[2].includes(c[3])) err.push(`Day ${n} 빈칸 ${j+1}: 정답이 보기에 없음`); if(new Set(c[2]).size!==c[2].length) err.push(`Day ${n} 빈칸 ${j+1}: 보기 중복`); if(c[0].includes('＿')&&!c[1]) warn.push(`Day ${n} 빈칸 ${j+1}: 해석 없음`); fmt(c[0],`Day ${n} 빈칸`); if(c[2].some(o=>/\[/.test(o))) err.push(`Day ${n} 빈칸 ${j+1}: 보기에 후리가나 괄호`); });
});
console.log(`Day ${DAYS.length}개, 단어 ${seenW.size}개, 문장 ${seenP.size}개`);
warn.forEach(w=>console.log('주의:',w)); err.forEach(e=>console.log('오류:',e));
process.exit(err.length?1:0);
