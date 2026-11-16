'use strict';
const APP_VERSION='1.19.5';
// ================= 유틸 =================
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KJ=/([㐀-鿿豈-﫿々〆]+)\[([^\]]+)\]/g;
const plain=s=>s.replace(KJ,'$1');
const kanaOf=s=>s.replace(KJ,'$2');
const hasKanji=s=>/[㐀-鿿豈-﫿々]/.test(s);
const toKata=s=>[...s].map(c=>{const n=c.charCodeAt(0);return n>=0x3041&&n<=0x3096?String.fromCharCode(n+0x60):c}).join('');
const toHira=s=>[...s].map(c=>{const n=c.charCodeAt(0);return n>=0x30A1&&n<=0x30F6?String.fromCharCode(n-0x60):c}).join('');
function ruby(s){ if(!state.settings.furi) return esc(plain(s)); return esc(s).replace(KJ,'<ruby>$1<rt>$2</rt></ruby>'); }
const dayKey=(d=new Date())=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${dd}`};
const addDays=(k,n)=>{const [y,m,d]=k.split('-').map(Number);const t=new Date(y,m-1,d+n);return dayKey(t)};

// ---- 가나 → 로마자 (헵번식, 장음 부호) ----
const RM={};
'あa いi うu えe おo かka きki くku けke こko さsa しshi すsu せse そso たta ちchi つtsu てte とto なna にni ぬnu ねne のno はha ひhi ふfu へhe ほho まma みmi むmu めme もmo やya ゆyu よyo らra りri るru れre ろro わwa をo んn がga ぎgi ぐgu げge ごgo ざza じji ずzu ぜze ぞzo だda ぢji づzu でde どdo ばba びbi ぶbu べbe ぼbo ぱpa ぴpi ぷpu ぺpe ぽpo ゔvu'.split(' ').forEach(p=>RM[p[0]]=p.slice(1));
const SMALLY={'ゃ':'a','ゅ':'u','ょ':'o'}, SMALLV={'ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o'};
const PUNC={'、':', ','。':'.','？':'?','！':'!','〜':'~','　':' '};
function toRomaji(kana){
  const s=[...toHira(kana)]; const syl=[];
  for(let i=0;i<s.length;i++){
    const c=s[i], n=s[i+1];
    if(c==='っ'){syl.push({gem:true});continue}
    if(c==='ー'){syl.push({long:true});continue}
    if(PUNC[c]!=null){syl.push({r:PUNC[c],p:true});continue}
    let r=RM[c];
    if(r==null){syl.push({r:c,p:true});continue}
    if(n&&SMALLY[n]){ r=(['shi','chi','ji'].includes(r)?r.slice(0,-1):r.slice(0,-1)+'y')+SMALLY[n]; i++; }
    else if(n&&SMALLV[n]){ r=r.slice(0,-1)+SMALLV[n]; i++; }
    syl.push({r,n:c==='ん'});
  }
  let out='';
  for(let i=0;i<syl.length;i++){
    const x=syl[i];
    if(x.gem){const nx=syl[i+1]; if(nx&&nx.r&&!nx.p){ out+= nx.r.startsWith('ch')?'t':nx.r[0]; } continue}
    if(x.long){const m=out.match(/[aiueo]$/); if(m) out+=m[0]; continue}
    if(x.n){const nx=syl[i+1]; out+='n'; if(nx&&nx.r&&/^[aiueoy]/.test(nx.r)) out+="'"; continue}
    out+=x.r;
  }
  return out.replace(/aa/g,'ā').replace(/uu/g,'ū').replace(/ee/g,'ē').replace(/oo/g,'ō').replace(/ou/g,'ō');
}
const PARTICLE={'は':'wa','へ':'e','を':'o'};
const RD_OVERRIDE={'こんにちは':'konnichiwa','こんばんは':'konbanwa','じゃありません':'ja arimasen','じゃありませんでした':'ja arimasen deshita'};
function romajiTokens(tokens){
  return tokens.map(t=>{const k=kanaOf(t); if(PARTICLE[k]) return PARTICLE[k]; if(RD_OVERRIDE[k]) return RD_OVERRIDE[k]; return toRomaji(k)}).join(' ').replace(/ ,/g,',').replace(/\s+/g,' ').trim();
}

// ================= 코스 구성 =================
const PALETTE=[['#E4572E','#B23F1C'],['#3A5BA0','#283F73'],['#4F8A3B','#376128'],['#C9547D','#97385B'],['#C98A12','#966608'],['#2A8A8A','#1B6262'],['#7A4E9C','#583873']];
const ITEMS={}; // id → item
function reg(it){ if(!ITEMS[it.id]) ITEMS[it.id]=it; return ITEMS[it.id]; }

function mkKana(k,rd,script){
  const ch=script==='k'?toKata(k):k;
  const note=(script==='k'?KANA_NOTE_KATA[ch]:KANA_NOTE_HIRA[ch])||KANA_NOTE_SOUND[toHira(ch)]||'';
  let alts=(KANA_ALTS[rd]||[]).slice();
  if(k==='ぢ') alts.push('di'); if(k==='づ') alts.push('du');
  return reg({id:(script==='k'?'k:':'h:')+ch, kind:script==='k'?'kata':'hira', jp:ch, f:ch, kana:ch, rd, alts, note, say:toKata(k)});
}
function mkWord(line,day){
  const [f,ko,note,rdo]=line.split('|');
  const jp=plain(f), kana=kanaOf(f);
  return reg({id:'w:'+jp+'|'+kana, kind:'word', f, jp, kana, ko, note:note||'', rd:rdo||RD_OVERRIDE[kana]||toRomaji(kana), say:kana.replace(/〜/g,''), kanji:hasKanji(jp), day});
}
function mkSeq(line,day,kind,i){
  const [fs,ko,note]=line.split('|');
  let toks=fs.trim().split(/\s+/); let punct='';
  const last=toks[toks.length-1]; const m=last.match(/[。？！]$/);
  if(m){punct=m[0]; toks[toks.length-1]=last.slice(0,-1);}
  const f=toks.join('')+punct;
  const koT=ko.trim().split(/\s+/);
  return reg({id:(kind==='phr'?'p:':'s:')+plain(f), kind, toks, f, jp:plain(f), kana:kanaOf(f), ko, koT, note:note||'', punct, rd:romajiTokens(toks)+(punct==='？'?'?':punct==='！'?'!':punct?'.':''), say:kanaOf(toks.join('')), day});
}

const TRACKS={day:[],kana:[]};
DAYS.forEach((D,di)=>{
  const n=di+1;
  const words=D.w.trim().split('\n').map(l=>mkWord(l.trim(),n));
  const phr=D.e.trim().split('\n').map((l,i)=>mkSeq(l,n,'phr',i));
  const sents=D.g.s.trim().split('\n').map((l,i)=>mkSeq(l,n,'sent',i));
  const clz=D.g.c.map((c,i)=>reg({id:`c:${n}-${i}`, kind:'cloze', q:c[0], ko:c[1], o:c[2], a:c[3], day:n}));
  const gram={id:'g:'+n, kind:'gram', t:D.g.t, p:D.g.p, ex:D.g.ex, day:n};
  const lessons=[];
  // 단어 레슨: 기본은 5개씩 5개. Day 데이터에 split(개수 배열)·names(제목)가 있으면 그대로 나눈다
  const split=D.split||[5,5,5,5,5]; let at=0;
  split.forEach((cnt,k)=>{ lessons.push({id:`d${n}-w${k+1}`, title:(D.names&&D.names[k])||`단어 ${k+1}`, kind:'word', items:words.slice(at,at+cnt)}); at+=cnt; });
  lessons.push({id:`d${n}-g`, title:'문법', kind:'gram', gram, items:sents, clozes:clz});
  lessons.push({id:`d${n}-e`, title:'표현', kind:'phr', items:phr});
  lessons.push({id:`d${n}-r`, title:'복습', kind:'review', items:[...words,...phr,...sents,...clz]});
  TRACKS.day.push({id:'d'+n, n, lv:levelOf(n), label:`DAY ${n}`, title:D.t, desc:`단어 ${words.length} · 문법 · 표현 ${phr.length}`, col:PALETTE[di%7], lessons, words, phr, gram});
});
KANA_UNITS.forEach((U,ui)=>{
  const [title,desc,script,ls,guide]=U;
  const lessons=ls.map(([t,rows,chunk],li)=>({id:`k${ui+1}-${li+1}`, title:t, kind:'kana', chunk:chunk||2, items:rows.flatMap(r=>KROWS[r].map(([k,rd])=>mkKana(k,rd,script)))}));
  const all=[...new Map(lessons.flatMap(l=>l.items).map(x=>[x.id,x])).values()];
  lessons.push({id:`k${ui+1}-r`, title:'복습', kind:'review', items:all});
  TRACKS.kana.push({id:'k'+(ui+1), n:ui+1, label:script==='h'?'ひらがな':'カタカナ', title, desc, col:PALETTE[(ui+2)%7], lessons, guide});
});
const LESSONS={}; const ITEM_UNIT={};
for(const tk of ['day','kana']){ let idx=0; TRACKS[tk].forEach(u=>u.lessons.forEach(l=>{l.unit=u; l.track=tk; l.idx=idx++; LESSONS[l.id]=l; l.items.forEach(it=>{ if(!ITEM_UNIT[it.id]) ITEM_UNIT[it.id]={u:u.id,idx:l.idx,track:tk}; }); (l.clozes||[]).forEach(it=>{ITEM_UNIT[it.id]={u:u.id,idx:l.idx,track:tk}}); })); }

// ================= 상태 =================
const HEART_MAX=5, HEART_MS=30*60*1000, LSKEY='kanamichi-v1';
// 하루 목표 = Day 하나의 새 단어 25개 (고정)
const DAILY_GOAL=25;
function defaultState(){return {v:1, xp:0, lessons:{}, streak:0, lastDay:'', dailyXP:{}, dailyWords:{}, hearts:HEART_MAX, heartTs:Date.now(), stats:{}, wrongNote:{}, tests:{}, settings:{goal:25, hearts:true, sfx:true, autoplay:true, listen:true, unlockAll:false, furi:true, romaji:true, voice:'himari'}, updatedAt:0}}
function normalize(s){const d=defaultState(); s=Object.assign(d,s||{}); s.settings=Object.assign(defaultState().settings,s.settings||{}); return s}
let state=defaultState();

function refreshHearts(){
  if(state.hearts>=HEART_MAX){state.hearts=HEART_MAX;return}
  const n=Math.floor((Date.now()-state.heartTs)/HEART_MS);
  if(n>0){state.hearts=Math.min(HEART_MAX,state.hearts+n); state.heartTs+=n*HEART_MS; if(state.hearts>=HEART_MAX) state.heartTs=Date.now();}
}
function shownStreak(){const t=dayKey(); return (state.lastDay===t||state.lastDay===addDays(t,-1))?state.streak:0}
const isDone=id=>!!(state.lessons[id]&&state.lessons[id].done);
function unitDone(u){return u.lessons.every(l=>isDone(l.id))}
function lessonUnlocked(L){
  if(state.settings.unlockAll) return true;
  const u=L.unit, li=u.lessons.indexOf(L), units=TRACKS[L.track], ui=units.indexOf(u);
  if(li>0) return isDone(u.lessons[li-1].id);
  if(ui===0) return true;
  return unitDone(units[ui-1]);
}
function currentLesson(tk){for(const u of TRACKS[tk]) for(const l of u.lessons) if(!isDone(l.id)&&lessonUnlocked(l)) return l; return null}
function learnedItems(){const out=new Map(); for(const id in state.lessons){const L=LESSONS[id]; if(!L||!state.lessons[id].done) continue; L.items.forEach(it=>out.set(it.id,it)); (L.clozes||[]).forEach(it=>out.set(it.id,it));} return [...out.values()]}

// ================= 오디오 =================
let jaVoice=null, voicesLoaded=false, ctts=null, actx=null;
function loadVoices(){try{const vs=speechSynthesis.getVoices(); if(vs&&vs.length){voicesLoaded=true; jaVoice=vs.find(v=>/^ja(-|_|$)/i.test(v.lang))||null;}}catch(e){}}
if('speechSynthesis' in window){loadVoices(); try{speechSynthesis.addEventListener('voiceschanged',loadVoices)}catch(e){}}
const synthOK=()=>('speechSynthesis' in window)&&(!voicesLoaded||!!jaVoice);
const audioOK=()=>state.settings.listen&&(!!AUDIO||synthOK()||!!ctts)&&!(LS&&LS.noListen);
// ---- 미리 녹음한 발음 파일 (VOICEVOX, audio/ 폴더) ----
// 파일 이름은 읽을 글자의 해시. 목록은 audio/index.json (GitHub Actions가 만든다).
function sayHash(t){
  const b=new TextEncoder().encode(t); let h1=0x811c9dc5, h2=0x84222325;
  for(const x of b){ h1^=x; h1=Math.imul(h1,0x01000193)>>>0; h2^=x; h2=Math.imul(h2,0x01000193)>>>0; h2=(h2^(h2>>>13))>>>0; }
  return h1.toString(16).padStart(8,'0')+h2.toString(16).padStart(8,'0');
}
// 목소리: 이름은 VOICEVOX 공식 소개(목소리 설명)를 바탕으로 붙였다. 크레디트 표기는 각 캐릭터 이용 규약에 따른다.
const VOICES=[
  {k:'himari', ko:'포근한 목소리', d:'부드럽고 따뜻한 여성 목소리', cr:'冥鳴ひまり', dir:'audio/'},
  {k:'metan',  ko:'또렷한 목소리', d:'심지 있고 또박또박한 여성 목소리', cr:'四国めたん', dir:'audio/v/metan/'},
  {k:'ritsu',  ko:'쿨한 목소리', d:'낮고 차분한 쿨한 여성 목소리', cr:'波音リツ', dir:'audio/v/ritsu/'},
  {k:'kirit',  ko:'단정한 목소리', d:'맑고 담백한 소녀 목소리', cr:'東北きりたん', dir:'audio/v/kiritan/'},
  {k:'mochi',  ko:'차분한 아나운서', d:'또렷하면서 온화한 여성 목소리', cr:'もち子(cv 明日葉よもぎ)', dir:'audio/v/mochiko/'},
  {k:'takehiro',ko:'상쾌한 청년', d:'시원시원한 젊은 남성 목소리', cr:'玄野武宏', dir:'audio/v/takehiro/'},
  {k:'ryusei', ko:'묵직한 저음', d:'두껍고 낮은 남성 목소리', cr:'青山龍星', dir:'audio/v/ryusei/'},
  {k:'jii',    ko:'다정한 할아버지', d:'친근하고 조금 쉰 할아버지 목소리', cr:'ちび式じい', dir:'audio/v/jii/'},
];
const VIDX={}; // k → {files:Set} (불러온 목록)
function loadVoiceIndex(k){ const V=VOICES.find(x=>x.k===k); if(!V) return Promise.resolve(null); if(VIDX[k]) return VIDX[k];
  VIDX[k]=voiceIndexJSON(V).then(j=>{ const v=j&&j.files?{files:new Set(Object.keys(j.files))}:null; VIDX[k]=Promise.resolve(v); VIDX[k].v=v; return v; }).catch(()=>null);
  return VIDX[k]; }
const vIdx=k=>VIDX[k]&&VIDX[k].v||null;
function curVoice(){ return VOICES.find(x=>x.k===(state&&state.settings&&state.settings.voice))||VOICES[0]; }
let AUDIO=null; const audioEl=(typeof Audio!=='undefined')?new Audio():null;
if(audioEl){ audioEl.preload='auto';
  loadVoiceIndex('himari').then(v=>{ if(v) AUDIO={files:v.files,voice:'VOICEVOX:冥鳴ひまり'}; }); }
// ===== 목소리를 기기에 받아 두기 (Cache Storage) =====
const DLKEY='kanamichi.dlvoices', DL={};
const vcName=k=>'kanamichi-voice-'+k;
function dlGet(){ try{ return JSON.parse(localStorage.getItem(DLKEY)||'{}')||{}; }catch(e){ return {}; } }
function dlSet(o){ try{ localStorage.setItem(DLKEY,JSON.stringify(o)); }catch(e){} }
const isDl=k=>!!dlGet()[k];
async function voiceIndexJSON(V){
  const u=V.dir+'index.json';
  try{ const r=await fetch(u,{cache:'no-cache'}); if(r.ok){ const j=await r.clone().json();
    if(isDl(V.k)&&typeof caches!=='undefined'){ try{ (await caches.open(vcName(V.k))).put(u,r); }catch(e){} } return j; } }catch(e){}
  try{ if(typeof caches!=='undefined'){ const r=await caches.match(u); if(r) return await r.json(); } }catch(e){}
  return null;
}
async function downloadVoice(k,quiet){
  const V=VOICES.find(x=>x.k===k); if(!V||typeof caches==='undefined') return false;
  if(DL[k]&&DL[k].busy){ if(!quiet) DL[k].cancel=true; return false; }
  const st=DL[k]={busy:true,done:0,total:0,cancel:false,quiet:!!quiet}; vRefresh(k);
  try{ if(!quiet&&navigator.storage&&navigator.storage.persist) navigator.storage.persist(); }catch(e){}
  let ok=false;
  try{
    const r0=await fetch(V.dir+'index.json',{cache:'no-cache'}); if(!r0.ok) throw 0; const j=await r0.clone().json();
    const c=await caches.open(vcName(k)); await c.put(V.dir+'index.json',r0);
    const have=new Set((await c.keys()).map(q=>q.url.split('/').pop()));
    const want=Object.keys(j.files).map(h=>h+'.mp3'), miss=want.filter(f=>!have.has(f));
    st.total=want.length; st.done=want.length-miss.length; vRefresh(k);
    // 파일을 100개씩 묶어 한 번에 받아 저장한다 (하나씩 저장하면 iOS에서 매우 느림). 묶음 여러 개를 동시에.
    const B=quiet?40:120, batches=[]; for(let j=0;j<miss.length;j+=B) batches.push(miss.slice(j,j+B).map(f=>V.dir+f));
    let bi=0;
    const one=async u=>{ for(let t=0;t<3;t++){ try{ const r=await fetch(u); if(r.ok){ await c.put(u,r); return; } }catch(e){} } };
    const worker=async()=>{ while(bi<batches.length&&!st.cancel){ const bt=batches[bi++];
      try{ await c.addAll(bt); }catch(e){ for(const u of bt){ if(st.cancel) break; await one(u); } }
      st.done+=bt.length; vRefresh(k); } };
    await Promise.all(Array.from({length:quiet?1:6},worker));
    if(!st.cancel){
      const keep=new Set(want); for(const q of await c.keys()){ const f=q.url.split('/').pop(); if(f.endsWith('.mp3')&&!keep.has(f)) c.delete(q); }
      const o=dlGet(); o[k]=Date.now(); dlSet(o); ok=true;
    }
  }catch(e){ st.err=true; }
  st.busy=false; vRefresh(k); return ok;
}
async function deleteVoice(k){ delete vcOpen[k]; try{ await caches.delete(vcName(k)); }catch(e){} const o=dlGet(); delete o[k]; dlSet(o); bufCache.clear(); render(); }
// 받아 둔 목소리에 새로 추가된 음성이 있으면 조용히 채운다
function syncVoices(){ try{ Object.keys(dlGet()).forEach(k=>downloadVoice(k,true)); }catch(e){} }
setTimeout(syncVoices,4000);
function useVoice(k){ if(k&&k!=='himari') loadVoiceIndex(k); }
// 고른 목소리의 목록을 미리 불러 둔다(목록이 없으면 미리 풀어 두기를 못 해서 첫 재생이 늦어짐)
function warmVoice(){ try{ const k=curVoice().k; loadVoiceIndex(k).then(()=>{ if(LS&&LS.queue) prefetchClips(LS.queue.flatMap(exSays)); }); }catch(e){} }
function clipUrl(t,k){ if(!t) return null; const h=sayHash(t);
  const V=VOICES.find(x=>x.k===(k||curVoice().k))||VOICES[0]; if(!VIDX[V.k]) loadVoiceIndex(V.k); const vi=vIdx(V.k);
  if(vi&&vi.files.has(h)) return V.dir+h+'.mp3';
  const hi=vIdx('himari'); return hi&&hi.files.has(h)?'audio/'+h+'.mp3':null; }
// 즉시 재생: 녹음 파일을 Web Audio 버퍼로 미리 풀어 두고, 앞쪽 무음은 건너뛰고 바로 튼다
let curSrcs=[];
// 소리 종류를 '효과음(ambient)'으로: 잠금화면·다이나믹 아일랜드에 재생 표시가 뜨지 않는다 (대신 무음 모드면 소리가 안 남)
function setSession(){ try{ if(navigator.audioSession&&navigator.audioSession.type!=='ambient') navigator.audioSession.type='ambient'; }catch(e){} }
setSession();
function ctx(){ clearTimeout(ctx._idle); setSession();
  try{
    // 백그라운드에 오래 있다 돌아오면 iOS가 컨텍스트를 끊어 둔다(interrupted/closed) → 새로 만든다
    if(actx&&(actx.state==='closed'||actx.state==='interrupted')){ try{actx.close()}catch(e){} actx=null; }
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state!=='running'){ const p=actx.resume(); if(p&&p.catch) p.catch(()=>{}); }
    return actx; }catch(e){ actx=null; return null; } }
// 터치할 때마다 오디오를 깨워 둔다(사용자 동작 안에서만 iOS가 소리를 허락함)
function unlockAudio(){ if(actx&&actx.state==='running') return; const c=ctx(); if(!c) return;
  try{ const b=c.createBuffer(1,1,22050), s=c.createBufferSource(); s.buffer=b; s.connect(c.destination); s.start(0); }catch(e){} audioIdle(); }
try{ document.addEventListener('pointerdown',unlockAudio,true); document.addEventListener('touchend',unlockAudio,true); }catch(e){}
// 재생이 끝나면 HTML 오디오만 정리한다. AudioContext는 계속 열어 둔다(다시 만들면 iOS에서 첫 소리가 0.3~0.5초 늦음).
// 소리 종류가 ambient라서 열어 둬도 잠금 화면·다이나믹 아일랜드에 재생 표시가 뜨지 않는다.
function audioIdle(ms){ clearTimeout(ctx._idle); ctx._until=Math.max(ctx._until||0,Date.now()+(ms==null?1500:ms)); ctx._idle=setTimeout(softIdle,ctx._until-Date.now()); }
function softIdle(){ ctx._until=0; if(audioEl){ try{ if(audioEl.ended||audioEl.paused){ audioEl.onended=null; audioEl.removeAttribute('src'); audioEl.load(); } }catch(e){} }
  try{ if(navigator.mediaSession){ navigator.mediaSession.metadata=null; navigator.mediaSession.playbackState='none'; } }catch(e){} }
function closeAudio(){ clearTimeout(ctx._idle); ctx._until=0; curSrcs=[];
  if(actx){ const a=actx; actx=null; try{a.close()}catch(e){} }
  if(audioEl){ try{audioEl.pause(); audioEl.onended=null; audioEl.removeAttribute('src'); audioEl.load();}catch(e){} }
  try{ if(navigator.mediaSession){ navigator.mediaSession.metadata=null; navigator.mediaSession.playbackState='none'; } }catch(e){} }
try{ document.addEventListener('visibilitychange',()=>{ if(document.hidden){ try{speechSynthesis.cancel()}catch(e){} closeAudio(); } else { dctx=null; try{speechSynthesis.cancel()}catch(e){} bufCache.forEach((p,u)=>p.catch(()=>bufCache.delete(u))); } });
  window.addEventListener('pagehide',closeAudio); }catch(e){}
const bufCache=new Map();
// 미리 풀어 두기(디코딩)는 소리를 내지 않는 오프라인 컨텍스트로 → 재생 세션이 생기지 않는다
let dctx=null; function decCtx(){ try{ dctx=dctx||new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(1,1,24000); return dctx; }catch(e){ return null; } }
// 받아 둔 목소리의 파일만 그 목소리 저장소에서 찾는다 (전체 저장소를 뒤지면 iOS에서 느림)
function voiceOfUrl(u){ const V=VOICES.find(x=>x.k!=='himari'&&u.startsWith(x.dir)); return V?V.k:(u.startsWith('audio/')?'himari':null); }
const vcOpen={};
function cachedFetch(u){
  const k=voiceOfUrl(u);
  if(!k||typeof caches==='undefined'||!isDl(k)) return fetch(u);
  const c=vcOpen[k]||(vcOpen[k]=caches.open(vcName(k)));
  return c.then(c=>c.match(u)).then(r=>r||fetch(u)).catch(()=>fetch(u));
}
function loadBuf(url){
  if(bufCache.has(url)) return bufCache.get(url);
  const c=decCtx(); if(!c) return Promise.reject(new Error('no audio'));
  const pr=cachedFetch(url).then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(ab=>new Promise((res,rej)=>c.decodeAudioData(ab,res,rej)))
    .then(buf=>{ // 소리가 시작되는 지점 찾기 (인코더 지연·앞 무음 제거)
      const d=buf.getChannelData(0); let k=0; const th=0.012; while(k<d.length&&Math.abs(d[k])<th) k++;
      buf._off=Math.max(0,k/buf.sampleRate-0.015); return buf; });
  pr.catch(()=>bufCache.delete(url)); bufCache.set(url,pr); return pr;
}
function stopClips(){ curSrcs.forEach(x=>{try{x.stop()}catch(e){}}); curSrcs=[]; try{audioEl&&audioEl.pause()}catch(e){} try{speechSynthesis.cancel()}catch(e){} }
function playClips(urls,rate){
  stopClips();
  const c=ctx();
  if(c){
    const token={}; playClips.token=token;
    Promise.all(urls.map(loadBuf)).then(bufs=>{
      if(playClips.token!==token) return;
      let t=c.currentTime+0.005;
      const rt=rate||1;
      bufs.forEach(b=>{ const src=c.createBufferSource(); src.buffer=b; src.playbackRate.value=rt; src.connect(c.destination); src.start(t,b._off||0); curSrcs.push(src); t+=(b.duration-(b._off||0))/rt+0.15; });
      audioIdle((t-c.currentTime)*1000+1500);
    }).catch(()=>{ if(playClips.token===token) playEl(urls,rate); });
    return;
  }
  playEl(urls,rate);
}
function playEl(urls,rate){ // 천천히 듣기(음높이 유지) 또는 Web Audio를 못 쓸 때
  if(!audioEl) return; let i=0;
  const next=()=>{
    if(i>=urls.length){ audioEl.onended=null; audioIdle(); return; }
    audioEl.src=urls[i++]; audioEl.defaultPlaybackRate=audioEl.playbackRate=rate||1;
    try{audioEl.preservesPitch=true; audioEl.webkitPreservesPitch=true}catch(e){}
    audioEl.onended=()=>setTimeout(next,150);
    const pr=audioEl.play(); if(pr&&pr.catch) pr.catch(()=>{});
  };
  next();
}
function prefetchClips(texts,max){ if(!AUDIO) return; const seen=new Set(); for(const t of texts){ const u=clipUrl(t); if(u&&!seen.has(u)){ seen.add(u); loadBuf(u).catch(()=>{}); if(seen.size>=(max||60)) break; } } }
function synthSpeak(text,rate){
  if(synthOK()){try{speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='ja-JP'; if(jaVoice) u.voice=jaVoice; u.rate=rate||0.85; speechSynthesis.speak(u); return true}catch(e){}}
  if(ctts){try{ctts.speak(text,{language:'ja',rate:Math.max(0.7,rate||0.9)}).catch(()=>{}); return true}catch(e){}}
  return false;
}
function speak(text,slow){
  if(!text) return;
  if(audioEl){ const u=clipUrl(text); if(u){ playClips([u],slow?0.75:1); return; } }
  synthSpeak(text,slow?0.55:0.85);
}
function speakSeq(list){
  list=list.filter(Boolean); if(!list.length) return;
  if(audioEl&&AUDIO){ const urls=list.map(clipUrl); if(urls.every(Boolean)) return playClips(urls,1); }
  if(list.length===1) return speak(list[0]);
  if(synthOK()){try{speechSynthesis.cancel(); list.forEach(t=>{const u=new SpeechSynthesisUtterance(t); u.lang='ja-JP'; if(jaVoice) u.voice=jaVoice; u.rate=0.85; speechSynthesis.speak(u)}); return}catch(e){}}
  if(ctts){try{ctts.speak(list.join('、'),{language:'ja',rate:0.9}).catch(()=>{})}catch(e){}}
}
// 진동(햅틱): 안드로이드는 vibrate, iPhone(iOS 18+)은 숨긴 스위치를 눌러 시스템 햅틱을 낸다
let hapEl=null;
function haptic(k){ try{
  if(navigator.vibrate){ navigator.vibrate(k===2?[14,40,14]:10); return; }
  if(!hapEl){ const l=document.createElement('label'), i=document.createElement('input'); i.type='checkbox'; i.setAttribute('switch',''); l.appendChild(i);
    l.setAttribute('aria-hidden','true'); l.style.cssText='position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'; document.body.appendChild(l); hapEl=l; }
  hapEl.click(); if(k===2) setTimeout(()=>{ try{hapEl.click()}catch(e){} },70);
}catch(e){} }
// iOS Safari는 touchstart 리스너가 있어야 :active(눌림) 스타일이 바로 보인다
try{ document.addEventListener('touchstart',()=>{},{passive:true}); }catch(e){}
function sfx(kind,n){
  if(!state.settings.sfx) return;
  if(kind===true) kind='ok'; else if(kind===false) kind='bad';
  try{
    if(!ctx()) return; audioIdle(2500);
    const t0=actx.currentTime+0.01;
    // 공용 출력: 살짝 울림(짧은 딜레이)을 더해 맑게
    const out=actx.createGain(); out.gain.value=0.9;
    const dl=actx.createDelay(); dl.delayTime.value=0.11; const fb=actx.createGain(); fb.gain.value=0.22; const wet=actx.createGain(); wet.gain.value=0.18;
    out.connect(actx.destination); out.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(actx.destination);
    // 종소리 같은 음 하나: 기본음 + 배음, 빠른 어택·부드러운 감쇠
    const bell=(f,at,dur,vol)=>{
      [[1,1],[2,.32],[3,.1],[4.2,.04]].forEach(([m,g])=>{
        const o=actx.createOscillator(), v=actx.createGain();
        o.type='sine'; o.frequency.setValueAtTime(f*m,t0+at);
        v.gain.setValueAtTime(0.0001,t0+at); v.gain.exponentialRampToValueAtTime(vol*g,t0+at+0.006);
        v.gain.exponentialRampToValueAtTime(0.0001,t0+at+dur*(m>1?0.55:1));
        o.connect(v); v.connect(out); o.start(t0+at); o.stop(t0+at+dur+0.05);
      });
    };
    const soft=(f1,f2,at,dur,vol)=>{ // 낮고 둥근 소리 (오답)
      const o=actx.createOscillator(), v=actx.createGain(), lp=actx.createBiquadFilter();
      o.type='triangle'; o.frequency.setValueAtTime(f1,t0+at); o.frequency.exponentialRampToValueAtTime(f2,t0+at+dur*0.8);
      lp.type='lowpass'; lp.frequency.value=900;
      v.gain.setValueAtTime(0.0001,t0+at); v.gain.exponentialRampToValueAtTime(vol,t0+at+0.02); v.gain.exponentialRampToValueAtTime(0.0001,t0+at+dur);
      o.connect(lp); lp.connect(v); v.connect(out); o.start(t0+at); o.stop(t0+at+dur+0.05);
    };
    if(kind==='ok'){ bell(1046.5,0,0.5,0.22); bell(1568,0.085,0.75,0.2); }          // 도(C6) → 솔(G6)
    else if(kind==='pair'){ // 짝 하나 맞춤: 맑은 '뽁' + 짝을 맞출 때마다 한 음씩 올라가는 음
      const sc=[783.99,880,1046.5,1174.66,1318.51,1567.98], f=sc[Math.min(Math.max((n||1)-1,0),sc.length-1)];
      const o=actx.createOscillator(), v=actx.createGain(); o.type='sine';
      o.frequency.setValueAtTime(f*0.75,t0); o.frequency.exponentialRampToValueAtTime(f*1.5,t0+0.06);
      v.gain.setValueAtTime(0.0001,t0); v.gain.exponentialRampToValueAtTime(0.12,t0+0.008); v.gain.exponentialRampToValueAtTime(0.0001,t0+0.08);
      o.connect(v); v.connect(out); o.start(t0); o.stop(t0+0.1);
      [[1,.16],[2,.04]].forEach(([m,g])=>{ const p=actx.createOscillator(), w=actx.createGain(); p.type='sine'; p.frequency.value=f*m;
        w.gain.setValueAtTime(0.0001,t0+0.03); w.gain.exponentialRampToValueAtTime(g,t0+0.036); w.gain.exponentialRampToValueAtTime(0.0001,t0+0.03+(m>1?0.18:0.32));
        p.connect(w); w.connect(out); p.start(t0+0.03); p.stop(t0+0.4); });
    }
    else if(kind==='done'){ [523.25,659.25,783.99,1046.5].forEach((f,i)=>bell(f,i*0.1,i===3?1.1:0.5,0.18)); bell(1318.5,0.42,1.2,0.12); } // 도미솔도 + 미
    else { soft(311,233,0,0.32,0.22); soft(247,185,0.13,0.36,0.18); }               // 오답: 낮게 내려가는 두 음
  }catch(e){}
}

// ================= 문제 생성 =================
function candsFor(it,maxIdx){
  const info=ITEM_UNIT[it.id]||{}; const track=info.track||'day';
  const pri=[],sec=[];
  for(const u of TRACKS[track]) for(const l of u.lessons){
    if(maxIdx!=null&&l.idx>maxIdx) continue;
    for(const x of [...l.items,...(l.clozes||[])]){ if(x.kind!==it.kind||x.id===it.id) continue; (u.id===info.u?pri:sec).push(x); }
  }
  const seen=new Set(); return [...shuffle(pri),...shuffle(sec)].filter(x=>!seen.has(x.id)&&seen.add(x.id));
}
function optItems(it,field,excl,cands,n=4){
  const out=[it], vals=new Set([it[field]]), ex=new Set([it[excl]]);
  for(const c of cands){ if(out.length>=n) break; const v=c[field]; if(v==null||vals.has(v)||ex.has(c[excl])) continue; vals.add(v); out.push(c); }
  return shuffle(out);
}
const OPT={
  rd:x=>({k:x.id,h:esc(x.rd),cls:'rd'}),
  jp:x=>({k:x.id,f:x.f,cls:'jp'}),
  jpPlain:x=>({k:x.id,h:esc(x.jp),cls:'jp'}),
  kana:x=>({k:x.id,h:esc(x.kana),cls:'jp'}),
  ko:x=>({k:x.id,h:esc(x.ko),cls:'ko'}),
};
const MK={
  c2r:(it,c)=>({t:'mc',it,q:'이 글자는 어떻게 읽을까요?',pr:{big:it.jp},opts:optItems(it,'rd','rd',c).map(OPT.rd),ans:it.id}),
  r2c:(it,c)=>({t:'mc',it,q:`“${it.rd}”에 해당하는 글자는?`,pr:{text:it.rd,mono:true},opts:optItems(it,'jp','rd',c).map(OPT.jp),ans:it.id,big:true}),
  klisten:(it,c)=>({t:'mc',it,q:'들리는 소리의 글자를 고르세요',pr:{listen:it.say},opts:optItems(it,'jp','rd',c).map(OPT.jp),ans:it.id,big:true,listen:true}),
  type:(it)=>({t:'type',it,q:'로마자로 입력하세요',pr:{big:it.jp},accept:[it.rd,...(it.alts||[])]}),
  j2k:(it,c)=>({t:'mc',it,q:it.kind==='word'?'이 단어의 뜻은?':'이 표현의 뜻은?',pr:{jp:it},opts:optItems(it,'ko','jp',c).map(OPT.ko),ans:it.id}),
  k2j:(it,c)=>({t:'mc',it,q:'알맞은 일본어를 고르세요',pr:{text:it.ko},opts:optItems(it,'jp','ko',c).map(OPT.jp),ans:it.id}),
  reading:(it,c)=>({t:'mc',it,q:'이 한자 단어의 읽는 법은?',pr:{big:it.jp,plain:true},opts:optItems(it,'kana','jp',c.filter(x=>x.kanji)).map(OPT.kana),ans:it.id}),
  listen:(it,c)=>({t:'mc',it,q:'들은 말을 고르세요',pr:{listen:it.say},opts:optItems(it,'jp','kana',c).map(OPT.jp),ans:it.id,listen:true}),
  buildJ:(it,c)=>({t:'build',it,q:'일본어로 만들어 보세요',pr:{text:it.ko},ans:it.toks,tiles:tilesFor(it.toks,c,'toks'),jpTiles:true}),
  buildK:(it,c)=>({t:'build',it,q:'한국어로 옮겨 보세요',pr:{jp:it},ans:it.koT,tiles:tilesFor(it.koT,c,'koT'),jpTiles:false}),
  listenB:(it,c)=>({t:'build',it,q:'들은 문장을 만들어 보세요',pr:{listen:it.say},ans:it.toks,tiles:tilesFor(it.toks,c,'toks'),jpTiles:true,listen:true}),
  cloze:(it,c)=>({t:'mc',it,q:it.q.includes('＿')?'빈칸에 알맞은 것은?':'알맞은 것을 고르세요',pr:{cloze:it},opts:shuffle(it.o).map(o=>({k:o,h:esc(o),cls:'jp'})),ans:it.a}),
};
function tilesFor(ans,cands,field){
  const set=new Set(ans), extra=[];
  for(const c of cands){ for(const t of shuffle(c[field]||[])){ if(extra.length>=3) break; if(!set.has(t)&&!extra.includes(t)) extra.push(t); } if(extra.length>=3) break; }
  return shuffle([...ans,...extra]);
}
function typesFor(it){
  const L=audioOK();
  switch(it.kind){
    case 'hira':case 'kata': return ['c2r','r2c','type',...(L?['klisten']:[])];
    case 'word': return ['j2k','k2j',...(it.kanji?['reading']:[]),...(L?['listen']:[])];
    case 'phr': return ['j2k','k2j',...(it.toks.length>=3?['buildJ']:[]),...(L?['listen']:[])];
    case 'sent': return ['buildJ',...(it.koT.length>=2?['buildK']:[]),...(L?['listenB']:[])];
    case 'cloze': return ['cloze'];
  }
  return [];
}
function matchEx(items,c){
  const kana=items[0].kind==='hira'||items[0].kind==='kata';
  const pool=[...items,...c.filter(x=>x.kind===items[0].kind)];
  const L=new Set(),R=new Set(),picked=[];
  for(const x of pool){ if(picked.length>=5) break; const r=kana?x.rd:x.ko; if(L.has(x.jp)||R.has(r)) continue; L.add(x.jp);R.add(r);picked.push(x); }
  if(picked.length<3) return null;
  return {t:'match',it:picked[0],q:'짝을 맞춰 보세요',left:shuffle(picked).map(x=>({k:x.id,f:x.f,say:x.say})),right:shuffle(picked).map(x=>({k:x.id,h:esc(kana?x.rd:x.ko)})),items:picked};
}
const chunks=(a,n)=>{const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o};
function genLesson(L){
  const C=it=>candsFor(it,L.idx); const ex=[]; const its=L.items; const A=audioOK();
  const push=e=>{if(e) ex.push(e)};
  if(L.kind==='kana'){
    chunks(its,L.chunk).forEach(g=>{ ex.push({t:'intro',items:g}); g.slice(0,2).forEach(it=>push(MK.c2r(it,C(it)))) });
    push(matchEx(shuffle(its),C(its[0])));
    shuffle(its).slice(0,2).forEach(it=>push(MK.r2c(it,C(it))));
    if(A) shuffle(its).slice(0,2).forEach(it=>push(MK.klisten(it,C(it))));
    shuffle(its).slice(0,2).forEach(it=>push(MK.type(it)));
  } else if(L.kind==='word'){
    // 새 단어를 한 화면에 먼저 모두 보여 준 뒤 문제를 낸다
    ex.push({t:'intro',items:its});
    shuffle(its).forEach(it=>push(MK.j2k(it,C(it))));
    const rest=[];
    rest.push(matchEx(shuffle(its),C(its[0])));
    shuffle(its).slice(0,2).forEach(it=>rest.push(MK.k2j(it,C(it))));
    shuffle(its.filter(x=>x.kanji)).slice(0,2).forEach(it=>rest.push(MK.reading(it,C(it))));
    if(A) shuffle(its).slice(0,2).forEach(it=>rest.push(MK.listen(it,C(it))));
    shuffle(rest.filter(Boolean)).forEach(push);
  } else if(L.kind==='gram'){
    // 문법 설명 → 예문은 미리 보여 주지 않고 바로 해석(일본어 → 한국어)과 빈칸 문제를 번갈아 낸다
    ex.push({t:'intro',gram:L.gram});
    const ss=shuffle(its), cz=L.clozes.slice(), n=Math.max(ss.length,cz.length);
    for(let k=0;k<n;k++){ if(ss[k]) push(MK.buildK(ss[k],C(ss[k]))); if(cz[k]) push(MK.cloze(cz[k],[])); }
  } else if(L.kind==='phr'){
    // 표현을 한 화면에 모두 보여 준 뒤, 표현마다 한 문제씩 + 짝 맞추기 (같은 문제 반복을 줄임)
    ex.push({t:'intro',items:its});
    const ts=['j2k','k2j','buildJ',...(A?['listen']:[])];
    shuffle(its).forEach((it,k)=>{ let ty=ts[k%ts.length]; if(ty==='buildJ'&&it.toks.length<3) ty='j2k'; push(MK[ty](it,C(it))); });
    push(matchEx(shuffle(its),C(its[0])));
    const b=shuffle(its.filter(x=>x.koT.length>=2))[0]; if(b) push(MK.buildK(b,C(b)));
  } else {
    return genMixed(its,L.idx,12);
  }
  return ex;
}
function genMixed(items,maxIdx,n){
  const ex=[]; const pick=shuffle(items).slice(0,n);
  pick.forEach(it=>{const ts=typesFor(it); if(!ts.length) return; const t=ts[Math.floor(Math.random()*ts.length)]; ex.push(MK[t](it,candsFor(it,maxIdx)))});
  const mi=items.filter(x=>['word','hira','kata','phr'].includes(x.kind));
  if(mi.length>=3){ const grp=mi.filter(x=>x.kind===mi[0].kind); const m=matchEx(shuffle(grp),candsFor(grp[0],maxIdx)); if(m) ex.splice(Math.min(4,ex.length),0,m); }
  return ex;
}
function genPractice(){
  const items=learnedItems().filter(x=>x.kind!=='gram');
  const score=x=>{const s=state.stats[x.id]||[0,0]; return s[1]*2-s[0]*0.5+Math.random()};
  const chosen=items.sort((a,b)=>score(b)-score(a)).slice(0,10);
  return genMixed(chosen,null,10);
}

// ================= 화면 상태 =================
let ui={screen:'boot',tab:'learn',kanaView:'path'};
let LS=null;
const app=document.getElementById('app');
const I={
  flame:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.6 2.3c.6 3.2-1.6 4.8-1.6 7.2 0 1.3.9 2.3 2.1 2.3 1.4 0 2.3-1.1 2.1-2.8 2.3 1.7 3.8 4.2 3.8 6.8 0 3.9-3.1 6.9-7 6.9s-7-3-7-6.6c0-4.4 4-7 5.1-9.8.4-1.1.6-2.4 2.5-4z" fill="currentColor"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 4.5 13.5h6.2L9.6 22l9-11.6h-6.2z" fill="currentColor"/></svg>',
  heart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.6-4.6-9.7-9.3C.8 8.3 3 4.4 6.7 4.4c2.1 0 3.6 1.1 4.3 2.4.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.9 3.9 4.4 7.3C19.6 16.4 12 21 12 21z" fill="currentColor"/></svg>',
  spk:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.2v5.6h3.8l4.9 4V5.2l-4.9 4z" fill="currentColor"/><path d="M15.4 8.6a4.8 4.8 0 0 1 0 6.8M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round"/></svg>',
  lock:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10.5" rx="2.4" fill="currentColor"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" stroke="currentColor" stroke-width="2.4" fill="none"/></svg>',
  check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.6l4.4 4.4L19 7.4" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
  home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.6 12 3l9 7.6V20a1 1 0 0 1-1 1h-5.2v-6.2H9.2V21H4a1 1 0 0 1-1-1z" fill="currentColor"/></svg>',
  rev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  user:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.2" fill="currentColor"/><path d="M3.8 21c.4-4.3 3.8-6.9 8.2-6.9s7.8 2.6 8.2 6.9z" fill="currentColor"/></svg>',
  book:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z" fill="currentColor"/></svg>',
};

// 학습 경로 화면이면 다음에 할 레슨(시작 표시가 있는 칸)이 화면 가운데 오도록 이동
// 문서 전체가 아니라 #app 안에서 스크롤한다 (iPad·iPhone 웹앱에서 상태바 뒤로 내용이 비치지 않게)
function scroller(){ return document.getElementById('app')||document.scrollingElement; }
function scrollTop(y,smooth){ const a=scroller(); if(!a) return; try{ a.scrollTo({top:Math.max(0,y||0),behavior:smooth?'smooth':'auto'}); }catch(e){ a.scrollTop=Math.max(0,y||0); } }
function centerY(n){ const a=scroller(); const r=n.getBoundingClientRect(); return a.scrollTop+r.top-(a.clientHeight/2-r.height/2); }
function scrollToCur(){
  const n=(ui.tab==='learn'||(ui.tab==='kana'&&ui.kanaView==='path'))&&document.querySelector('.node.cur');
  if(!n){ scrollTop(0); return; }
  scrollTop(centerY(n));
}
// 다음 레슨 칸이 화면 밖에 있으면 '현재 위치' 버튼을 띄운다 (위/아래 방향 표시)
let curObs=null;
function curBtn(){ let b=document.getElementById('gocur'); if(!b){ b=document.createElement('button'); b.id='gocur'; b.className='gocur'; b.dataset.a='gocur'; b.setAttribute('aria-label','현재 위치로'); document.body.appendChild(b); } return b; }
function watchCur(){
  if(curObs){ curObs.disconnect(); curObs=null; }
  const b=curBtn(); b.classList.remove('show');
  const n=(ui.screen==='home'&&(ui.tab==='learn'||(ui.tab==='kana'&&ui.kanaView==='path')))&&document.querySelector('.node.cur');
  if(!n||!('IntersectionObserver' in window)) return;
  curObs=new IntersectionObserver(es=>{ const e=es[es.length-1]; if(e.isIntersecting){ b.classList.remove('show'); return; }
    const up=e.boundingClientRect.top<0; b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${up?'M12 19V5M5.5 11.5 12 5l6.5 6.5':'M12 5v14M5.5 12.5 12 19l6.5-6.5'}" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span>현재 위치</span>`; b.classList.add('show'); },
    {rootMargin:'-70px 0px -90px 0px',threshold:0});
  curObs.observe(n);
}
function render(){
  if(ui.screen!=='home'){ const g=document.getElementById('gocur'); if(g) g.classList.remove('show'); if(curObs){curObs.disconnect(); curObs=null;} }
  if(ui.screen==='lesson') return renderLesson();
  if(ui.screen==='result') return renderResult();
  if(ui.screen==='gate') return renderGate();
  if(ui.screen==='boot'){ app.innerHTML='<div class="boot"><div class="logo jp">かなみち</div><p>불러오는 중…</p></div>'; return; }
  refreshHearts();
  const tabs={learn:renderLearn,kana:renderKana,words:renderWords,review:renderReview,me:renderMe};
  app.innerHTML=topbar()+`<main class="main tab-${ui.tab}">${tabs[ui.tab]()}</main>`+navbar();
  watchCur();
}
function topbar(){
  const st=shownStreak(), today=state.lastDay===dayKey();

  const tOpen=!state.tests[dayKey()]&&testItems().length>=10;
  return `<header class="top"><div class="logo jp">かなみち<small>일본어 한 걸음</small></div><div class="stats">
  ${tOpen?`<button class="st tchip" data-a="test" aria-label="오늘의 테스트">${I.bolt}<b>테스트</b><i></i></button>`:''}
  <button class="st fire ${today?'on':''}" data-a="info" data-v="streak" aria-label="연속 학습 ${st}일">${I.flame}<b>${st}</b></button>
  <span class="st xp" aria-label="XP ${state.xp}">${I.bolt}<b>${state.xp}</b></span>
  </div></header>`;
}
function navbar(){
  const t=[['learn','학습',I.home],['kana','문자','<span class="glyph jp">あ</span>'],['words','단어장',I.book],['review','복습',I.rev],['me','프로필',I.user]];
  return `<nav class="nav"><div class="navlogo jp">かなみち<small>일본어 한 걸음</small></div>${t.map(([k,l,ic])=>`<button class="${ui.tab===k?'on':''}" data-a="tab" data-v="${k}">${ic}<span>${l}</span></button>`).join('')}</nav>`;
}
// ================= 오늘의 테스트 (매일 자정에 새로) =================
const TEST_N=30;
function testItems(){ return learnedItems().filter(x=>x.kind!=='gram'); }
function testCard(){
  const t=dayKey(), r=state.tests[t], n=testItems().length;
  if(r) return `<section class="card tcard done"><div class="tico">${I.check}</div><div class="tbody"><b>오늘의 테스트 완료</b><small>${r.score} / ${r.total} 정답 · +${r.score} XP · 내일 0시에 새 테스트</small></div></section>`;
  if(n<10) return `<section class="card tcard lock"><div class="tico">${I.lock}</div><div class="tbody"><b>오늘의 테스트</b><small>지금까지 배운 범위에서 매일 ${TEST_N}문제. 레슨을 몇 개 더 끝내면 열려요 (${n}/10)</small></div></section>`;
  return `<section class="card tcard"><div class="tico">${I.bolt}</div><div class="tbody"><b>오늘의 테스트</b><small>배운 범위 전체에서 ${TEST_N}문제 · 정답 1개당 1 XP</small></div><button class="btn sm" data-a="test">시작</button></section>`;
}
function genTest(){
  const items=testItems(); const score=x=>{const s=state.stats[x.id]||[0,0]; return s[1]*1.5-s[0]*0.3+Math.random()*2};
  // 약한 항목을 조금 더 자주, 범위 전체가 고르게: 점수 순으로 절반, 나머지는 무작위
  const sorted=items.slice().sort((a,b)=>score(b)-score(a));
  const half=sorted.slice(0,Math.ceil(TEST_N/2)); const rest=shuffle(sorted.slice(half.length)).slice(0,TEST_N-half.length);
  let pick=shuffle([...half,...rest]); while(pick.length<TEST_N&&items.length) pick.push(items[Math.floor(Math.random()*items.length)]);
  pick=pick.slice(0,TEST_N);
  const ex=[]; pick.forEach(it=>{ const ts=typesFor(it); if(!ts.length) return; const ty=ts[Math.floor(Math.random()*ts.length)]; ex.push(MK[ty](it,candsFor(it,null))); });
  return ex;
}
function startTest(){
  if(state.tests[dayKey()]) return;
  mclose(); const q=genTest(); if(q.length<5) return;
  LS={mode:'test',L:null,queue:q,total:q.length,idx:0,wrongs:[],done:0,mistakes:0,correct:0,start:Date.now(),day:dayKey()};
  prefetchClips(q.flatMap(exSays)); nextEx(true);
}
function finishTest(){
  const t=LS.day; const xp=LS.correct;
  state.tests[t]={score:LS.correct,total:LS.total,at:Date.now()};
  state.xp+=xp; state.dailyXP[t]=(state.dailyXP[t]||0)+xp;
  let streakUp=false; if(state.lastDay!==t){ state.streak=(state.lastDay===addDays(t,-1))?state.streak+1:1; state.lastDay=t; streakUp=true; }
  const seen=new Set(); LS.wrongs=LS.wrongs.filter(x=>x&&!seen.has(x.id)&&seen.add(x.id));
  LS.result={xp,streakUp,sec:Math.round((Date.now()-LS.start)/1000)};
  save(true); ui.screen='result'; render(); sfx('done');
}
function renderTestResult(){
  const r=LS.result, pct=Math.round(LS.correct/LS.total*100);
  app.innerHTML=`<div class="result tresult"><div class="burst">${pct>=80?I.check:I.bolt}</div><h1>오늘의 테스트 완료!</h1>
  <p class="rsub">${LS.total}문제 중 ${LS.correct}문제 정답</p>
  <div class="rgrid"><div class="rc xp"><small>획득 XP</small><b>+${r.xp}</b></div><div class="rc acc"><small>정답률</small><b>${pct}%</b></div><div class="rc tm"><small>틀린 문제</small><b>${LS.wrongs.length}</b></div></div>
  ${r.streakUp?`<p class="rnote fire">${I.flame} 연속 학습 ${state.streak}일째</p>`:''}
  ${LS.wrongs.length?`<section class="card twrong"><div class="twh"><h3>틀린 문제</h3><button class="btn sm ghost" data-a="wnall">모두 중요 표현에 넣기</button></div>
  <ul class="wl">${LS.wrongs.map(x=>{const k=noteKey(x); const tg=noteTarget(k); return `<li><span class="jp">${ruby(x.f||x.q||'')}</span><span class="m">${esc(x.ko||x.rd||'')}${tg&&tg.type==='gram'?`<small>문법: ${esc(tg.g.t)}</small>`:''}</span>
  <button class="wnadd sm ${inNote(x)?'on':''}" data-a="wnadd" data-v="${esc(x.id)}">${inNote(x)?I.check+'넣음':'+ 중요'}</button></li>`}).join('')}</ul></section>`:''}
  <button class="btn wide" data-a="home">계속</button></div>`;
}

// ================= 중요 표현 (예전 오답노트) =================
// 틀린 문제에서 넣거나, 단어장에서 항목을 왼쪽으로 밀어 넣는다.
// 문제 자체가 아니라, 그 문제가 다룬 단어·표현·가나 또는 문법 항목을 모아 둔다.
// 저장: state.wrongNote[키] = 넣은 시각(양수) / 뺀 시각(음수, 기기 간 동기화용)
function noteKey(it){ if(!it||!it.id) return null; if(it.kind==='sent'||it.kind==='cloze') return it.day?'g:'+it.day:null; if(['word','phr','hira','kata'].includes(it.kind)) return it.id; return null; }
function noteTarget(k){ if(!k) return null; if(k.startsWith('g:')){ const u=TRACKS.day[+k.slice(2)-1]; return u?{type:'gram',g:u.gram,u}:null; } const it=ITEMS[k]; return it?{type:'item',it}:null; }
function inNote(it){ const k=noteKey(it); return !!(k&&state.wrongNote[k]>0); }
function noteAdd(it){ const k=noteKey(it); if(!k) return; state.wrongNote[k]=Date.now(); }
function noteList(){ return Object.entries(state.wrongNote).filter(([k,v])=>v>0&&noteTarget(k)).sort((a,b)=>b[1]-a[1]).map(([k])=>k); }
function renderNote(){
  const ks=noteList();
  if(!ks.length) return `<section class="card empty"><p>중요 표현이 비어 있어요.<br>단어장에서 단어·표현을 <b>왼쪽으로 밀거나</b>,<br>틀린 문제의 <b>+ 중요 표현에 넣기</b>를 누르면 여기에 모여요.</p></section>`;
  const grams=ks.filter(k=>k.startsWith('g:')), items=ks.filter(k=>!k.startsWith('g:'));
  const del=k=>`<button class="ndel" data-a="wndel" data-v="${esc(k)}" aria-label="중요 표현에서 빼기">${I.x}</button>`;
  return `${grams.length?`<section class="card"><h3>문법 ${grams.length}</h3>${grams.map(k=>{const {g,u}=noteTarget(k); return `<details class="ngram"><summary><span class="lvb">${esc(u.label)}</span> ${esc(g.t)}${del(k)}</summary><div class="pat jp">${esc(g.p)}</div><ul class="gl">${g.ex.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></details>`}).join('')}</section>`:''}
  ${items.length?`<section class="card"><h3>단어·표현 ${items.length}</h3><ul class="wl">${items.map(k=>{const it=ITEMS[k]; return `<li class="sw-row on" data-k="${esc(k)}"><button class="mini" data-a="say" data-v="${esc(it.say)}">${I.spk}</button><span class="jp ${it.kind==='phr'||it.kind==='sent'?'long':''}">${ruby(it.f)}</span><span class="m">${ui.hideKo&&it.ko?`<button class="hidko" data-a="reveal">${esc(it.ko)}</button>`:esc(it.ko||it.rd)}${state.settings.romaji&&it.ko?`<small>${esc(it.rd)}</small>`:''}</span>${del(k)}</li>`}).join('')}</ul></section>`:''}`;
}

function dailyCard(){
  const t=dayKey(), w=state.dailyWords[t]||0, g=DAILY_GOAL, x=state.dailyXP[t]||0;
  const pct=Math.min(100,Math.round(w/g*100)); const cur=currentLesson('day');
  return `<section class="daily"><div class="drow"><div><div class="dlab">오늘의 목표 · <button class="plink" data-a="plan">200일 플랜</button></div><div class="dval"><b>${w}</b> / ${g} 단어 <span class="dxp">· ${x} XP</span></div></div>
  ${cur?`<button class="btn sm" data-a="open" data-v="${cur.id}">이어서 학습</button>`:''}</div>
  <div class="bar"><div style="width:${pct}%"></div></div>${w>=g?'<div class="dok">오늘 목표를 달성했어요!</div>':''}</section>`;
}
const OFFS=[0,42,64,42,0,-42,-64,-42];
function pathHTML(units,tk){
  const cur=currentLesson(tk);
  let prevLv=null;
  // 지금 Day에서 멀리 떨어진 Day는 띠만 보여 준다(누르면 펼침) → 화면이 가벼워져 스크롤할 때 빈 화면이 안 생김
  const ci=cur?units.indexOf(cur.unit):units.length-1, exp=ui.uexp||(ui.uexp=new Set());
  return units.map((u,ui_)=>{
    const done=u.lessons.filter(l=>isDone(l.id)).length;
    const far=(ui_<ci-2||ui_>ci+2)&&!exp.has(u.id);
    let sep=''; if(u.lv&&u.lv!==prevLv){ const L=LEVELS.find(x=>x.lv===u.lv); sep=`<div class="lvsep"><b>${u.lv}</b><span>Day ${L.from}~${L.to} · ${LV_DESC[u.lv]}</span></div>`; prevLv=u.lv; }
    return sep+`<section class="unit ${far?'far':''}" style="--c:${u.col[0]};--cd:${u.col[1]}">
    <div class="ubanner"><div ${far?`class="uexp" data-a="uexp" data-v="${u.id}"`:''}><div class="ulab">${esc(u.label)}${u.lv?` · ${u.lv}`:''} · ${done}/${u.lessons.length}</div><h2>${esc(u.title)}</h2><p>${esc(u.desc)}${far?' · <b>눌러서 펼치기</b>':''}</p></div>
    <button class="ubtn" data-a="guide" data-v="${u.id}" aria-label="가이드">${I.book}<span>${tk==='day'?'목록':'가이드'}</span></button></div>
    ${far?'':`<div class="path">${u.lessons.map((l,i)=>{
      const dn=isDone(l.id), un=lessonUnlocked(l), isCur=cur&&cur.id===l.id;
      const icon=dn?I.check:!un?I.lock:`<span class="jp">${nodeGlyph(l)}</span>`;
      return `<div class="nwrap ${isCur?'hascur':''}" style="transform:translateX(${OFFS[i%8]}px)">${isCur?'<div class="bubble">시작</div>':''}
      <button class="node ${dn?'done':''} ${un?'':'locked'} ${isCur?'cur':''}" data-a="open" data-v="${l.id}" aria-label="${esc(l.title)}">${icon}</button><div class="nlab">${esc(l.title)}</div></div>`}).join('')}</div>`}</section>`;
  }).join('')+(tk==='day'?upcomingCard():'');
}
const LV_DESC={N5:'기초 단어와 기본 문형',N4:'일상 회화와 동사 활용',N3:'신문·드라마 일부를 이해하는 중급'};
// 아직 준비되지 않은 Day 안내
function upcomingCard(){
  const have=TRACKS.day.length; if(have>=CURRICULUM.length) return '';
  const nx=CURRICULUM.slice(have,have+3).map((c,i)=>`<li><b>Day ${have+i+1}</b> <span class="lvb">${levelOf(have+i+1)}</span> ${esc(c[0])} · <span class="jp">${esc(c[1])}</span></li>`).join('');
  return `<section class="card upcoming"><h3>Day ${have+1}~${CURRICULUM.length} 준비 중</h3><p>200일 플랜에 따라 차례로 추가돼요. 다음에 올 내용:</p><ul>${nx}</ul><button class="btn sm ghost" data-a="plan">200일 플랜 전체 보기</button></section>`;
}
function planSheet(){
  const have=TRACKS.day.length;
  const st=d=>{ const u=TRACKS.day[d-1]; if(!u) return '<span class="pst soon">준비 중</span>'; if(unitDone(u)) return '<span class="pst ok">완료</span>'; const c=currentLesson('day'); if(c&&c.unit===u) return '<span class="pst now">진행 중</span>'; return ''; };
  modal(`<div class="gsheet plan"><h2>200일 플랜</h2><p>하루 단어 25개 · 문법 1개 · 표현 4개. 지금 준비된 Day는 ${have}개예요.</p>
  ${LEVELS.map(L=>`<h3><span class="lvb">${L.lv}</span> Day ${L.from}~${L.to} · ${LV_DESC[L.lv]}</h3><ol start="${L.from}" class="pl">${CURRICULUM.slice(L.from-1,L.to).map((c,i)=>`<li class="${L.from+i>have?'soon':''}"><span class="pd">${L.from+i}</span><span class="pt"><b>${esc(c[0])}</b><small class="jp">${esc(c[1])}</small></span>${st(L.from+i)}</li>`).join('')}</ol>`).join('')}
  <p class="hint">JLPT는 공식 어휘·문법 목록이 없어서 급수 구분은 널리 쓰이는 목록을 기준으로 한 대략적인 기준이에요.</p><button class="btn ghost wide" data-a="mclose">닫기</button></div>`);
}
function nodeGlyph(l){ if(l.kind==='kana') return esc(l.items[0].jp); return {word:'語',gram:'文',phr:'話',review:'復'}[l.kind]; }
function renderLearn(){ return `<div class="learn"><aside class="lside">${dailyCard()}${testCard()}${sideStats()}</aside><div class="lpath">${pathHTML(TRACKS.day,'day')}</div></div>`; }
function sideStats(){
  const daysDone=TRACKS.day.filter(unitDone).length, cur=currentLesson('day');
  const u=cur?cur.unit:null; const done=u?u.lessons.filter(l=>isDone(l.id)).length:0;
  return `<section class="card sidecard wideonly"><h3>학습 현황</h3>
  <div class="srow"><span class="ic fire ${state.lastDay===dayKey()?'on':''}">${I.flame}</span><div><b>${shownStreak()}일</b><small>연속 학습</small></div></div>
  <div class="srow"><span class="ic xp">${I.bolt}</span><div><b>${state.xp} XP</b><small>총 경험치</small></div></div>
  <div class="srow"><span class="ic green">${I.check}</span><div><b>${daysDone} / ${TRACKS.day.length}</b><small>끝낸 Day</small></div></div>
  ${u?`<div class="scur" style="--c:${u.col[0]}"><small>${esc(u.label)} 진행 중</small><b>${esc(u.title)}</b><div class="bar"><div style="width:${Math.round(done/u.lessons.length*100)}%"></div></div></div>`:''}</section>`;
}
function renderKana(){
  const seg=`<div class="seg"><button class="${ui.kanaView==='path'?'on':''}" data-a="kview" data-v="path">가나 레슨</button><button class="${ui.kanaView==='chart'?'on':''}" data-a="kview" data-v="chart">문자표</button></div>`;
  return '<div class="narrow">'+seg+(ui.kanaView==='path'?`<p class="hint">히라가나·가타카나를 이미 안다면 건너뛰어도 괜찮아요. 학습 탭의 단어에는 후리가나와 로마자가 함께 표시됩니다.</p>`+pathHTML(TRACKS.kana,'kana'):chartHTML())+'</div>';
}
function chartHTML(){
  const learned=new Set(learnedItems().map(x=>x.id));
  const cell=(k,rd,sc)=>{ if(!k) return '<div class="cc empty"></div>'; const ch=sc==='k'?toKata(k):k; return `<button class="cc ${learned.has((sc==='k'?'k:':'h:')+ch)?'lr':''}" data-a="say" data-v="${esc(toKata(k))}"><span class="jp">${ch}</span><small>${rd}</small></button>`};
  const grid=(rows,sc,cols)=>`<div class="cgrid" style="grid-template-columns:repeat(${cols},1fr)">${rows.map(r=>r.map(c=>c?cell(c[0],c[1],sc):cell()).join('')).join('')}</div>`;
  const R=KROWS, gap=(row,pos)=>{const o=[null,null,null,null,null]; row.forEach((c,i)=>o[pos[i]]=c); return o};
  const main=[R.a,R.ka,R.sa,R.ta,R.na,R.ha,R.ma,gap(R.ya,[0,2,4]),R.ra,gap(R.wa.slice(0,2),[0,4]),gap([R.wa[2]],[0])];
  const dak=[R.ga,R.za,R.da,R.ba,R.pa];
  const yo=[...chunks(R.y1,3),...chunks(R.y2,3),...chunks(R.y3,3)];
  const sc=ui.chartScript||'h';
  return `<div class="seg small"><button class="${sc==='h'?'on':''}" data-a="cscript" data-v="h">히라가나</button><button class="${sc==='k'?'on':''}" data-a="cscript" data-v="k">가타카나</button></div>
  <p class="hint">글자를 누르면 발음을 들을 수 있어요. 색칠된 칸은 레슨을 마친 글자예요.</p>
  <h3 class="ch">청음</h3>${grid(main,sc,5)}<h3 class="ch">탁음·반탁음</h3>${grid(dak,sc,5)}<h3 class="ch">요음</h3>${grid(yo,sc,3)}`;
}
function renderReview(){
  const items=learnedItems(); const can=items.filter(x=>x.kind!=='gram').length>=4;
  const weak=items.filter(x=>state.stats[x.id]&&state.stats[x.id][1]>0).sort((a,b)=>state.stats[b.id][1]-state.stats[a.id][1]).slice(0,10);
  return `<div class="narrow">${testCard()}<section class="card prac"><h2>약점 연습</h2><p>틀린 적이 많은 항목 위주로 10문제를 풀어요. 끝내면 5 XP를 얻어요.</p>
  <button class="btn ${can?'':'dis'}" data-a="practice" ${can?'':'disabled'}>연습 시작</button>${can?'':'<p class="hint">레슨을 하나 이상 끝내면 열려요.</p>'}</section>
  ${weak.length?`<section class="card"><h3>자주 틀린 항목</h3><ul class="wl">${weak.map(x=>`<li><button class="mini" data-a="say" data-v="${esc(x.say||'')}">${I.spk}</button><span class="jp">${ruby(x.f||x.q||'')}</span><span class="m">${esc(x.ko||x.rd||'')}</span><span class="cnt">×${state.stats[x.id][1]}</span></li>`).join('')}</ul></section>`:''}
  <p class="hint c">지금까지 배운 단어는 단어장 탭에서 볼 수 있어요.</p></div>`;
}
// ---- 단어장: 지금까지 배운 단어·표현 ----
function wbItems(){
  const L=learnedItems(); const kind=ui.wbKind||'word';
  return L.filter(x=>kind==='word'?x.kind==='word':(x.kind==='phr'||x.kind==='sent'));
}
function renderWords(){
  const L=learnedItems(); const nw=L.filter(x=>x.kind==='word').length, np=L.filter(x=>x.kind==='phr'||x.kind==='sent').length; const k=ui.wbKind||'word';
  return `<div class="narrow wbook"><div class="wbhead"><h2>단어장</h2><p>지금까지 배운 단어 <b>${nw}</b>개 · 표현·예문 <b>${np}</b>개</p></div>
  <div class="seg"><button class="${k==='word'?'on':''}" data-a="wbkind" data-v="word">단어 ${nw}</button><button class="${k==='phr'?'on':''}" data-a="wbkind" data-v="phr">표현·예문 ${np}</button><button class="${k==='note'?'on':''}" data-a="wbkind" data-v="note">중요 표현 <span id="ncount">${noteList().length}</span></button></div>
  ${k==='note'?`<div class="wbbar nbar"><button class="chip ${ui.hideKo?'on':''}" data-a="hideko">${ui.hideKo?'뜻 보이기':'뜻 가리기'}</button><button class="chip ${state.settings.furi?'on':''}" data-a="furi">후리가나</button></div>
  <p class="swhint">왼쪽으로 밀거나 ✕를 누르면 중요 표현에서 빠져요</p>
  ${ui.hideKo?'<p class="hint">가려진 뜻을 누르면 보여요. 외웠는지 스스로 확인해 보세요.</p>':''}<div id="wlist">${renderNote()}</div></div>`:`
  <div class="wbbar"><input id="wq" type="search" enterkeyhint="search" autocomplete="off" placeholder="검색: 뜻·읽기·한자·로마자" value="${esc(ui.wq||'')}">
  <button class="chip ${ui.hideKo?'on':''}" data-a="hideko">${ui.hideKo?'뜻 보이기':'뜻 가리기'}</button><button class="chip ${state.settings.furi?'on':''}" data-a="furi">후리가나</button></div>
  <p class="swhint">${k==='word'?'단어를':'표현을'} 왼쪽으로 밀면 중요 표현에 들어가요 · 다시 밀면 빠져요</p>
  ${ui.hideKo?'<p class="hint">가려진 뜻을 누르면 보여요. 외웠는지 스스로 확인해 보세요.</p>':''}
  <div id="wlist">${wordList()}</div></div>`}`;
}
function wordList(){
  const all=wbItems(); if(!all.length) return `<section class="card empty"><p>아직 배운 ${ui.wbKind==='phr'?'표현':'단어'}가 없어요.<br>학습 탭에서 레슨을 끝내면 여기에 모여요.</p></section>`;
  const q=(ui.wq||'').trim().toLowerCase();
  const hit=x=>!q||[x.jp,x.kana,x.ko,(x.rd||'').toLowerCase(),toKata(x.kana||'')].some(v=>v&&String(v).toLowerCase().includes(q));
  const items=all.filter(hit); if(!items.length) return `<p class="hint c">“${esc(q)}”에 맞는 항목이 없어요.</p>`;
  const byDay=new Map(); items.forEach(x=>{ if(!byDay.has(x.day)) byDay.set(x.day,[]); byDay.get(x.day).push(x); });
  return [...byDay.keys()].sort((a,b)=>b-a).map(d=>{ const u=TRACKS.day[d-1];
    return `<section class="card wbday" style="--c:${u.col[0]}"><h3><span>${esc(u.label)}</span> ${esc(u.title)} <small>${byDay.get(d).length}개</small></h3><ul class="wl">${byDay.get(d).map(wbRow).join('')}</ul></section>`; }).join('');
}
function wbRow(x){
  const st=state.stats[x.id]; const miss=st&&st[1]?`<span class="cnt" title="틀린 횟수">×${st[1]}</span>`:'';
  const ko=ui.hideKo?`<button class="hidko" data-a="reveal">${esc(x.ko)}</button>`:esc(x.ko);
  const on=state.wrongNote[x.id]>0;
  return `<li class="sw-row ${on?'on':''}" data-k="${esc(x.id)}"><button class="mini" data-a="say" data-v="${esc(x.say)}">${I.spk}</button><span class="jp ${x.kind==='word'?'':'long'}">${ruby(x.f)}</span><span class="m">${ko}${state.settings.romaji?`<small>${esc(x.rd)}</small>`:''}</span>${miss}<span class="star" aria-label="중요 표현">★</span></li>`;
}
function wordRow(x){return `<li><button class="mini" data-a="say" data-v="${esc(x.say)}">${I.spk}</button><span class="jp">${ruby(x.f)}</span><span class="m">${esc(x.ko)}${state.settings.romaji?`<small>${esc(x.rd)}</small>`:''}</span></li>`}
function renderMe(){
  const t=dayKey(); const days=[...Array(7)].map((_,i)=>addDays(t,i-6));
  const mx=Math.max(10,...days.map(d=>state.dailyXP[d]||0));
  const wd=['일','월','화','수','목','금','토'];
  const lessonsDone=Object.values(state.lessons).filter(x=>x.done).length;
  const words=learnedItems().filter(x=>x.kind==='word').length;
  const S=state.settings;
  const tg=(k,l,d)=>`<div class="setrow"><div><b>${l}</b>${d?`<small>${d}</small>`:''}</div><button class="sw ${S[k]?'on':''}" data-a="set" data-v="${k}" role="switch" aria-checked="${!!S[k]}" aria-label="${l}"><i></i></button></div>`;
  return `<div class="cols"><div>`+accountCard()+`<section class="statgrid">
  <div class="sc"><span class="ic fire on">${I.flame}</span><b>${shownStreak()}</b><small>연속 학습일</small></div>
  <div class="sc"><span class="ic xp">${I.bolt}</span><b>${state.xp}</b><small>총 XP</small></div>
  <div class="sc"><span class="ic blue">${I.book}</span><b>${words}</b><small>익힌 단어</small></div>
  <div class="sc"><span class="ic green">${I.check}</span><b>${lessonsDone}</b><small>완료한 레슨</small></div></section>
  <section class="card"><h3>최근 7일 XP</h3><div class="week">${days.map(d=>{const v=state.dailyXP[d]||0; const [y,m,dd]=d.split('-').map(Number); return `<div class="wcol"><span class="wv">${v||''}</span><div class="wb"><div style="height:${Math.round(v/mx*100)}%" class="${d===t?'today':''}"></div></div><small>${wd[new Date(y,m-1,dd).getDay()]}</small></div>`}).join('')}</div></section>
  </div><div><section class="card"><h3>설정</h3>
  ${tg('furi','후리가나 표시','한자 위에 읽는 법을 작게 표시')}
  ${tg('romaji','로마자 표시','단어·표현 소개와 정답 해설에 로마자 표기')}
  ${tg('listen','듣기 문제','발음을 듣고 푸는 문제 포함')}
  ${tg('autoplay','발음 자동 재생','문제에 일본어가 나오면 바로 읽어 줌 (단어 소개 화면은 제외)')}
  ${tg('sfx','효과음')}
  ${tg('unlockAll','모든 레슨 열기','순서와 상관없이 원하는 Day부터 학습')}
  ${voiceCard()}
  <div class="setrow"><div><b>발음 테스트</b><small>${AUDIO?'녹음된 음성으로 「こんにちは」를 읽어요':synthOK()||ctts?'기기 음성으로 「こんにちは」를 읽어요':'이 기기에서 일본어 음성을 찾지 못했어요'}</small></div><button class="btn sm ghost" data-a="say" data-v="こんにちは">재생</button></div>
  <button class="btn danger ghost wide" data-a="reset">학습 기록 초기화</button></section>
  <p class="foot">로마자는 수정 헵번식(장음은 ō·ū 등으로 표기)을 따릅니다.${AUDIO?`<br>발음 음성: VOICEVOX:${esc(curVoice().cr)}${curVoice().k!=='himari'?' · VOICEVOX:冥鳴ひまり (준비 안 된 음성 대신)':''}`:''}<br>v${APP_VERSION}</p></div></div>`;
}

// ================= 모달 =================
function modal(html){const r=document.getElementById('modal'); r.innerHTML=`<div class="ov" data-a="mclose"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`; r.classList.add('show')}
function mclose(){const r=document.getElementById('modal'); r.classList.remove('show'); r.innerHTML=''}
function openLessonSheet(id){
  const L=LESSONS[id]; if(!L) return; const un=lessonUnlocked(L), dn=isDone(id);
  const noHeart=false;
  const desc={word:`새 단어 ${L.items.length}개`,gram:`${L.gram&&L.gram.t}`,phr:`생활 표현 ${L.items.length}개`,review:'이 유닛 전체를 섞어서 복습',kana:`${L.items.map(x=>x.jp).join(' ')}`}[L.kind];
  modal(`<div class="lsheet" style="--c:${L.unit.col[0]};--cd:${L.unit.col[1]}"><div class="ulab">${esc(L.unit.label)} · ${esc(L.unit.title)}</div><h2>${esc(L.title)}</h2><p class="${L.kind==='kana'?'jp big':''}">${esc(desc)}</p>
  ${!un?`<p class="hint">이전 레슨을 먼저 끝내면 열려요.</p><button class="btn ghost wide" data-a="mclose">닫기</button>`:
   noHeart?`<p class="hint">하트가 없어요. 복습 탭의 약점 연습으로 하트를 얻거나, 30분마다 1개씩 회복돼요.</p><button class="btn wide" data-a="practice">약점 연습으로 하트 얻기</button>`:
   `<button class="btn wide col" data-a="start" data-v="${id}">${dn?'다시 하기 +5 XP':'시작하기 +10 XP'}</button>`}</div>`);
}
function guideSheet(uid){
  const u=[...TRACKS.day,...TRACKS.kana].find(x=>x.id===uid); if(!u) return;
  if(u.words){
    modal(`<div class="gsheet"><div class="ulab">${esc(u.label)}</div><h2>${esc(u.title)}</h2><h3>단어 ${u.words.length}개</h3><ul class="wl">${u.words.map(wordRow).join('')}</ul>
    <h3>문법 · ${esc(u.gram.t)}</h3><div class="pat jp">${esc(u.gram.p)}</div><h3>표현</h3><ul class="wl">${u.phr.map(x=>`<li><button class="mini" data-a="say" data-v="${esc(x.say)}">${I.spk}</button><span class="jp">${ruby(x.f)}</span><span class="m">${esc(x.ko)}</span></li>`).join('')}</ul><button class="btn ghost wide" data-a="mclose">닫기</button></div>`);
  } else {
    modal(`<div class="gsheet"><div class="ulab">${esc(u.label)}</div><h2>${esc(u.title)}</h2><ul class="gl">${u.guide.map(g=>`<li>${esc(g)}</li>`).join('')}</ul><button class="btn ghost wide" data-a="mclose">닫기</button></div>`);
  }
}
function infoSheet(v){
  refreshHearts();
  if(v==='hearts'){
    const S=state.settings; let next='';
    if(S.hearts&&state.hearts<HEART_MAX){const ms=HEART_MS-((Date.now()-state.heartTs)%HEART_MS); next=`다음 하트까지 약 ${Math.ceil(ms/60000)}분`;}
    modal(`<div class="isheet"><h2>하트</h2><div class="hearts">${[...Array(HEART_MAX)].map((_,i)=>`<span class="${S.hearts&&i>=state.hearts?'off':''}">${I.heart}</span>`).join('')}</div>
    <p>${S.hearts?`레슨에서 틀리면 하트가 1개 줄어요. 0개가 되면 레슨이 중단돼요. ${next}`:'하트 제한이 꺼져 있어요. 프로필 탭에서 켤 수 있어요.'}</p>
    <p class="hint">복습 탭의 약점 연습을 끝내면 하트를 1개 얻어요.</p><button class="btn ghost wide" data-a="mclose">닫기</button></div>`);
  } else {
    const t=dayKey(); const days=[...Array(7)].map((_,i)=>addDays(t,i-6)); const wd=['일','월','화','수','목','금','토'];
    modal(`<div class="isheet"><h2>연속 학습 ${shownStreak()}일</h2><div class="sweek">${days.map(d=>{const [y,m,dd]=d.split('-').map(Number); return `<div class="${state.dailyXP[d]?'on':''}"><span>${state.dailyXP[d]?I.flame:''}</span><small>${wd[new Date(y,m-1,dd).getDay()]}</small></div>`}).join('')}</div>
    <p>하루에 레슨을 1개 이상 끝내면 연속 기록이 이어져요. ${state.lastDay===t?'오늘 기록은 이미 채웠어요.':'오늘 레슨을 하나 끝내면 기록이 이어져요.'}</p><button class="btn ghost wide" data-a="mclose">닫기</button></div>`);
  }
}

// ================= 레슨 진행 =================
function startLesson(id){
  const L=LESSONS[id]; refreshHearts();
  mclose(); LS={mode:'lesson',L,queue:[],done:0,mistakes:0,correct:0,start:Date.now()};
  LS.queue=genLesson(L).filter(Boolean); prefetchClips(LS.queue.flatMap(exSays)); nextEx(true);
}
function startPractice(){
  mclose(); const q=genPractice(); if(q.length<3) return;
  LS={mode:'practice',L:null,queue:q,done:0,mistakes:0,correct:0,start:Date.now()}; prefetchClips(q.flatMap(exSays)); nextEx(true);
}
const TILE_PART={'は':'わ','へ':'え','を':'お'}; // 조사 타일은 실제 발음으로 읽는다
function tileSay(t){ const k=kanaOf(t); return TILE_PART[k]||k; }
function exSays(c){ const o=[]; if(c.items) c.items.forEach(x=>o.push(x.say)); if(c.it&&c.it.say) o.push(c.it.say); if(c.pr&&c.pr.listen) o.push(c.pr.listen); return o; }
function nextEx(first){
  if(LS&&LS.mode==='test') LS.idx=(LS.idx||0)+1;
  if(!first&&LS.cur&&LS.cur.t!=='intro'&&!LS.ok){} // 오답은 이미 큐 뒤에 재삽입됨
  LS.cur=LS.queue.shift(); LS.sel=null; LS.input=''; LS.built=[]; LS.checked=false; LS.ok=false; LS.m={l:null,r:null,done:new Set(),bad:null};
  if(!LS.cur) return finish();
  if(LS.cur.listen&&!audioOK()){ return nextEx(); }
  LS.anim='enter'; ui.screen='lesson'; render(); scrollTop(0);
  const c=LS.cur;
  // 화면이 바뀌자마자 일본어를 읽어 준다: 듣기 문제는 항상, 새 단어·일본어 제시 문제는 '발음 자동 재생'이 켜져 있을 때
  if(c.pr&&c.pr.listen) speak(c.pr.listen);
  else if(state.settings.autoplay){
    if(c.t==='intro') {} // 소개 화면은 자동으로 읽지 않음 (눌러서 듣기)
    else if(c.pr&&c.pr.jp) speak(c.pr.jp.say);
  }
  if(c.t==='type') setTimeout(()=>{const i=document.getElementById('tin'); if(i) i.focus()},60);
}
function progress(){const total=LS.done+LS.queue.length+1; return Math.round(LS.done/total*100)}
function testCount(){ return LS.mode==='test'?`<span class="lh prac">${Math.min(LS.total,LS.idx)}/${LS.total}</span>`:''; }
function renderLesson(){
  const c=LS.cur; const S=state.settings;
  const an=LS.anim; LS.anim=null;
  const hearts=LS.mode==='practice'?'<span class="lh prac">연습</span>':testCount();
  app.innerHTML=`<div class="lesson"><div class="lhead"><button class="iconbtn" data-a="quit" aria-label="그만하기">${I.x}</button><div class="prog"><div style="width:${progress()}%"></div></div><button class="furi ${S.furi?'on':''}" data-a="furi" aria-label="후리가나 표시">${S.furi?'<ruby>漢<rt>かん</rt></ruby>':'漢'}</button>${hearts}</div>
  <div class="lbody ${an==='enter'?'enter':''}">${exBody(c)}</div><div class="lfoot ${LS.checked?(LS.ok?'ok':'bad'):''} ${an==='check'?'pop':''}"><div class="fin">${footer(c)}</div></div></div>`;
}
function prompt(pr){
  if(!pr) return '';
  if(pr.listen!=null) return `<div class="pr"><button class="bigspk" data-a="say" data-v="${esc(pr.listen)}" aria-label="다시 듣기">${I.spk}</button><button class="slow" data-a="sayslow" data-v="${esc(pr.listen)}">천천히</button></div>`;
  if(pr.big!=null) return `<div class="pr"><div class="bigch jp">${esc(pr.big)}</div></div>`;
  if(pr.text!=null) return `<div class="pr"><div class="ptext ${pr.mono?'mono':''}">${esc(pr.text)}</div></div>`;
  if(pr.jp) return `<div class="pr"><div class="pjp"><button class="mini" data-a="say" data-v="${esc(pr.jp.say)}">${I.spk}</button><span class="jp">${ruby(pr.jp.f)}</span></div>${state.settings.romaji?`<div class="prd">${esc(pr.jp.rd)}</div>`:''}</div>`;
  if(pr.cloze){const z=pr.cloze; const blank=LS.checked?`<span class="blank fill">${esc(z.a)}</span>`:(LS.sel?`<span class="blank fill">${esc(LS.sel)}</span>`:'<span class="blank"></span>');
    return `<div class="pr"><div class="cloze jp">${ruby(z.q).replace('＿',blank)}</div>${z.ko?`<div class="cko">${esc(z.ko)}</div>`:''}</div>`;}
  return '';
}
function exBody(c){
  if(c.t==='intro') return introBody(c);
  let h=`<h2 class="q">${esc(c.q)}</h2>`+prompt(c.pr);
  if(c.t==='mc'){
    h+=`<div class="opts ${c.opts.every(o=>o.cls!=='ko')&&c.opts.every(o=>(o.f!=null?plain(o.f):o.h.replace(/<[^>]+>/g,'')).length<=6)?'two':''}">${c.opts.map((o,i)=>{
      let st=''; if(LS.checked){ if(o.k===c.ans) st='right'; else if(o.k===LS.sel) st='wrong'; } else if(LS.sel===o.k) st='sel';
      return `<button class="opt ${o.cls} ${c.big?'bigopt':''} ${st}" data-a="opt" data-v="${esc(o.k)}" ${LS.checked?'disabled':''}><span class="num">${i+1}</span><span class="oh">${o.f!=null?ruby(o.f):o.h}</span></button>`}).join('')}</div>`;
  } else if(c.t==='type'){
    h+=`<input id="tin" class="tin" type="text" inputmode="latin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="예: ka" value="${esc(LS.input)}" ${LS.checked?'disabled':''}>`;
  } else if(c.t==='build'){
    const used=new Set(LS.built);
    h+=`<div class="ans ${c.jpTiles?'jp':''}">${LS.built.map(i=>`<button class="tile" data-a="untile" data-v="${i}" ${LS.checked?'disabled':''}>${c.jpTiles?ruby(c.tiles[i]):esc(c.tiles[i])}</button>`).join('')}</div>
    <div class="bank ${c.jpTiles?'jp':''}">${c.tiles.map((t,i)=>`<button class="tile ${used.has(i)?'ghost':''}" data-a="tile" data-v="${i}" ${used.has(i)||LS.checked?'disabled':''}>${c.jpTiles?ruby(t):esc(t)}</button>`).join('')}</div>`;
  } else if(c.t==='match'){
    const M=LS.m;
    const btn=(side,o)=>{const d=M.done.has(o.k); const s=M[side]===o.k; const bad=M.bad&&M.bad[side]===o.k; return `<button class="mt ${side==='l'?'jp':''} ${d?'mdone':''} ${d&&M.jd===o.k?'jd':''} ${s?'sel':''} ${bad?'mbad':''}" data-a="m" data-s="${side}" data-v="${esc(o.k)}" ${d?'disabled':''}>${o.f!=null?ruby(o.f):o.h}</button>`};
    h+=`<div class="match">${c.left.map((o,i)=>btn('l',o)+btn('r',c.right[i])).join('')}</div>`;
  }
  return h;
}
function introBody(c){
  const S=state.settings;
  if(c.gram){const g=c.gram; return `<div class="tag">문법</div><h2 class="q">${esc(g.t)}</h2><div class="pat jp">${esc(g.p)}</div><ul class="gl">${g.ex.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`;}
  const its=c.items; const k=its[0].kind;
  if(k==='hira'||k==='kata') return `<div class="tag">새 글자</div><div class="icards">${its.map(it=>`<button class="icard" data-a="say" data-v="${esc(it.say)}"><span class="bigch jp">${esc(it.jp)}</span><span class="ird">${esc(it.rd)}</span>${it.note?`<span class="inote">${esc(it.note)}</span>`:''}<span class="ispk">${I.spk}</span></button>`).join('')}</div><p class="hint c">카드를 누르면 발음을 들을 수 있어요.</p>`;
  if(k==='sent') {const it=its[0]; return `<div class="tag">예문</div><div class="sbox"><button class="mini" data-a="say" data-v="${esc(it.say)}">${I.spk}</button><div class="jp sjp">${ruby(it.f)}</div>${S.romaji?`<div class="prd">${esc(it.rd)}</div>`:''}<div class="sko">${esc(it.ko)}</div><div class="toks jp">${it.toks.map(t=>`<span>${ruby(t)}</span>`).join('')}</div></div>`;}
  return `<div class="tag">${k==='word'?'새 단어':'새 표현'}${its.length>2?` ${its.length}개`:''}</div>${its.length>2?'<p class="hint">하나씩 눌러 발음을 들어 보고, 다 외웠으면 계속을 누르세요.</p>':''}<div class="wcards ${its.length>2?'many':''}">${its.map(it=>`<div class="wcard"><button class="mini" data-a="say" data-v="${esc(it.say)}">${I.spk}</button><div class="wjp jp">${ruby(it.f)}</div>${S.romaji?`<div class="prd">${esc(it.rd)}</div>`:''}<div class="wko">${esc(it.ko)}</div>${it.note?`<div class="inote">${esc(it.note)}</div>`:''}</div>`).join('')}</div>`;
}
function canCheck(c){ if(c.t==='mc') return LS.sel!=null; if(c.t==='type') return LS.input.trim().length>0; if(c.t==='build') return LS.built.length>0; return false }
function footer(c){
  if(c.t==='intro') return `<button class="btn wide" data-a="next">계속</button>`;
  if(c.t==='match'&&!LS.checked) return `<div class="mhint">왼쪽과 오른쪽에서 하나씩 눌러 짝을 맞추세요</div>`;
  if(!LS.checked) return `${c.listen?'<button class="link" data-a="nolisten">지금은 들을 수 없어요</button>':''}<button class="btn wide" id="chk" data-a="check" ${canCheck(c)?'':'disabled'}>확인</button>`;
  const it=c.it; let det='';
  if(c.t==='mc'&&c.pr&&c.pr.cloze){ det=`정답: <span class="jp">${esc(c.ans)}</span>`; }
  else if(it) det=answerLine(it,c);
  const wn=!LS.ok&&it&&noteKey(it)?`<button class="wnadd ${inNote(it)?'on':''}" data-a="wnadd" data-v="${esc(it.id)}">${inNote(it)?I.check+'중요 표현에 있어요':'+ 중요 표현에 넣기'}</button>`:'';
  return `<div class="fb"><div class="fbt">${LS.ok?I.check+(c.t==='match'?'모두 맞췄어요!':'정답이에요!'):I.x+'아쉬워요'}${wn}</div><div class="fbd">${LS.ok&&c.t!=='build'?det:(!LS.ok?'정답: ':'')+det}</div>
  <button class="btn wide ${LS.ok?'okb':'badb'}" data-a="next">계속</button></div>`;
}
function answerLine(it,c){
  const S=state.settings, rd=S.romaji?` <small>${esc(it.rd)}</small>`:'';
  if(c.t==='match') return '';
  if(it.kind==='hira'||it.kind==='kata') return `<span class="jp">${esc(it.jp)}</span> = ${esc(it.rd)}`;
  if(it.kind==='word') return `<span class="jp">${ruby(it.f)}</span>${rd} = ${esc(it.ko)}`;
  if(c.t==='build'&&!c.jpTiles) return `${esc(it.ko)}`;
  return `<span class="jp">${ruby(it.f)}</span>${rd}<br>${esc(it.ko)}`;
}
function record(it,ok){ if(!it||!it.id) return; const s=state.stats[it.id]||[0,0]; s[ok?0:1]++; state.stats[it.id]=s; }
function check(){
  const c=LS.cur; if(LS.checked||!canCheck(c)) return;
  let ok=false;
  if(c.t==='mc') ok=LS.sel===c.ans;
  else if(c.t==='type'){ const v=LS.input.trim().toLowerCase().replace(/\s+/g,''); ok=c.accept.includes(v); }
  else if(c.t==='build') ok=LS.built.map(i=>c.tiles[i]).join('\u0001')===c.ans.join('\u0001');
  LS.checked=true; LS.ok=ok; record(c.it,ok);
  LS.anim='check';
  if(ok){ LS.correct++; sfx(true); }
  else { sfx(false); LS.mistakes++; if(LS.mode==='test') LS.wrongs.push(c.it); else LS.queue.push(regen(c)); }
  save(); render(); haptic(ok?1:2);
}
function regen(c){ // 같은 문제를 보기 순서만 바꿔 다시
  const n=Object.assign({},c); if(n.opts) n.opts=shuffle(n.opts); if(n.tiles) n.tiles=shuffle(n.tiles); if(n.left){n.left=shuffle(n.left);n.right=shuffle(n.right)} return n;
}
function loseHeart(){
  return; // 하트(체력) 기능 없음
}
function onNext(){
  const c=LS.cur;
  if(c.t==='intro'||LS.ok||LS.mode==='test') LS.done++;
  nextEx();
}
function finish(){
  if(LS.mode==='test') return finishTest();
  const L=LS.L; const t=dayKey(); const first=L?!isDone(L.id):false;
  let xp=LS.mode==='practice'?5:(first?10:5); const perfect=LS.mistakes===0; if(perfect) xp+=5;
  state.xp+=xp; state.dailyXP[t]=(state.dailyXP[t]||0)+xp;
  let streakUp=false; if(state.lastDay!==t){ state.streak=(state.lastDay===addDays(t,-1))?state.streak+1:1; state.lastDay=t; streakUp=true; }
  let newWords=0;
  if(L){ const r=state.lessons[L.id]||{done:0}; r.done=(r.done||0)+1; state.lessons[L.id]=r; if(first&&L.kind==='word'){ newWords=L.items.length; state.dailyWords[t]=(state.dailyWords[t]||0)+newWords; } }
  const goal=DAILY_GOAL, reached=newWords>0&&(state.dailyWords[t]||0)>=goal&&(state.dailyWords[t]-newWords)<goal;
  const answered=LS.correct+LS.mistakes; const acc=answered?Math.round(LS.correct/answered*100):100; const sec=Math.round((Date.now()-LS.start)/1000);
  LS.result={xp,perfect,acc,sec,streakUp,newWords,reached};
  save(true); ui.screen='result'; render(); sfx('done');
}
function renderResult(){
  if(LS.mode==='test') return renderTestResult();
  const r=LS.result; const mm=Math.floor(r.sec/60), ss=String(r.sec%60).padStart(2,'0');
  app.innerHTML=`<div class="result"><div class="burst">${r.perfect?I.check:I.bolt}</div><h1>${LS.mode==='practice'?'연습 완료!':'레슨 완료!'}</h1>
  <p class="rsub">${r.perfect?'한 번도 틀리지 않았어요. 보너스 +5 XP':LS.mode==='practice'?'약한 부분을 한 번 더 다졌어요':'틀린 문제는 복습 탭에서 다시 연습할 수 있어요'}</p>
  <div class="rgrid"><div class="rc xp"><small>획득 XP</small><b>+${r.xp}</b></div><div class="rc acc"><small>정확도</small><b>${r.acc}%</b></div><div class="rc tm"><small>시간</small><b>${mm}:${ss}</b></div></div>
  ${r.newWords?`<p class="rnote">새 단어 <b>${r.newWords}개</b> · 오늘 ${state.dailyWords[dayKey()]||0}/${DAILY_GOAL}개</p>`:''}
  ${r.reached?'<p class="rnote goal">오늘의 목표를 달성했어요!</p>':''}
  ${r.streakUp?`<p class="rnote fire">${I.flame} 연속 학습 ${state.streak}일째</p>`:''}
  <button class="btn wide" data-a="home">계속</button></div>`;
}

// ================= 이벤트 =================
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-a]'); if(!el) return; const a=el.dataset.a, v=el.dataset.v;
  const H={
    tab:()=>{ui.tab=v; render(); scrollToCur(); if(v==='words') prefetchClips(wbItems().map(x=>x.say),150)},
    plan:()=>planSheet(),
    furi:()=>{ state.settings.furi=!state.settings.furi; save(); render(); },
    test:()=>startTest(),
    wnadd:()=>{ const it=ITEMS[v]; if(!it) return; if(inNote(it)) state.wrongNote[noteKey(it)]=-Date.now(); else noteAdd(it); save(); render(); },
    wnall:()=>{ (LS&&LS.wrongs||[]).forEach(x=>{ if(!inNote(x)) noteAdd(x); }); save(); render(); },
    wndel:()=>{ e.stopPropagation(); state.wrongNote[v]=-Date.now(); save(); render(); },
    wbkind:()=>{ui.wbKind=v; render(); prefetchClips(wbItems().map(x=>x.say),150)},
    hideko:()=>{ui.hideKo=!ui.hideKo; render()},
    reveal:()=>{el.classList.add('open')},
    uexp:()=>{ (ui.uexp||(ui.uexp=new Set())).add(v); const a=scroller(), y=a.scrollTop; render(); a.scrollTop=y; },
    gocur:()=>{ const n=document.querySelector('.node.cur'); if(!n) return; scrollTop(centerY(n),true); },
    kview:()=>{ui.kanaView=v; render(); if(v==='path') scrollToCur(); else scrollTop(0)}, cscript:()=>{ui.chartScript=v; render()},
    open:()=>openLessonSheet(v), start:()=>startLesson(v), guide:()=>{guideSheet(v); const u=TRACKS.day.find(x=>x.id===v); if(u) prefetchClips([...u.words,...u.phr].map(x=>x.say),40)}, info:()=>infoSheet(v),
    mclose, practice:()=>startPractice(),
    home:()=>{mclose(); LS=null; ui.screen='home'; render(); scrollToCur()},
    quit:()=>modal(`<div class="isheet"><h2>그만할까요?</h2><p>지금 나가면 이 레슨의 진행은 저장되지 않아요.</p><button class="btn wide" data-a="mclose">계속 학습하기</button><button class="btn ghost danger wide" data-a="home">나가기</button></div>`),
    say:()=>speak(v),
    voice:()=>{ state.settings.voice=v; useVoice(v); save(); loadVoiceIndex(v).then(()=>{ render(); setTimeout(()=>speak('こんにちは'),50); }); },
    vprev:()=>{ const V=VOICES.find(x=>x.k===v); if(V) playClips([helloUrl(V)],1); },
    vuse:()=>{ state.settings.voice=v; save(); bufCache.clear(); loadVoiceIndex(v).then(()=>{ render(); }); playClips([helloUrl(VOICES.find(x=>x.k===v))],1); },
    vdl:()=>{ const was=DL[v]&&DL[v].busy; downloadVoice(v).then(ok=>{ if(ok&&!was){ state.settings.voice=v; save(); bufCache.clear(); VIDX[v]=null; loadVoiceIndex(v).then(()=>render()); } }); },
    vdel:()=>{ const V=VOICES.find(x=>x.k===v); modal(`<div class="isheet"><h2>'${esc(V.ko)}'를 기기에서 지울까요?</h2><p>저장 공간이 약 65MB 비워져요. 지운 뒤에도 인터넷으로는 계속 들을 수 있어요.</p><button class="btn danger wide" data-a="vdel2" data-v="${v}">지우기</button><button class="btn ghost wide" data-a="mclose">취소</button></div>`); },
    vdel2:()=>{ mclose(); deleteVoice(v); },
    sayslow:()=>speak(v,true),
    opt:()=>{ if(LS.checked) return; LS.sel=v; render() },
    tile:()=>{ if(LS.checked) return; const i=+v; LS.built.push(i); if(LS.cur.jpTiles) speak(tileSay(LS.cur.tiles[i])); render() },
    untile:()=>{ if(LS.checked) return; const i=+v; LS.built=LS.built.filter(x=>x!==i); render() },
    check, next:onNext,
    nolisten:()=>{ LS.noListen=true; const n0=LS.queue.length+1; LS.queue=LS.queue.filter(x=>!x.listen); if(LS.mode==='test'){ LS.total-=n0-LS.queue.length; LS.idx--; } nextEx() },
    m:()=>{
      const M=LS.m, s=el.dataset.s; M.bad=null; M[s]=M[s]===v?null:v;
      if(s==='l'){const it=ITEMS[v]; if(it) speak(it.say)}
      if(M.l&&M.r){
        if(M.l===M.r){ M.done.add(M.l); M.jd=M.l; if(M.done.size<LS.cur.left.length) sfx('pair',M.done.size); setTimeout(haptic,0); record(ITEMS[M.l],true); }
        else { M.bad={l:M.l,r:M.r}; sfx(false); haptic(2); LS.mistakes++; record(ITEMS[M.l],false); setTimeout(()=>{ if(LS&&LS.m===M){M.bad=null; render()} },600); }
        M.l=M.r=null;
        if(M.done.size===LS.cur.left.length){ LS.checked=true; LS.ok=true; LS.correct++; LS.anim='check'; sfx('ok'); save(); }
      }
      render(); M.jd=null;
    },
    set:()=>{state.settings[v]=!state.settings[v]; save(); render()},
    reset:()=>modal(`<div class="isheet"><h2>기록을 초기화할까요?</h2><p>XP, 연속 학습일, 완료한 레슨, 오답·중요 표현 기록이 모두 지워지고 되돌릴 수 없어요. 설정은 유지돼요.</p><button class="btn danger wide" data-a="doreset">초기화</button><button class="btn ghost wide" data-a="mclose">취소</button></div>`),
    doreset:()=>{const s=state.settings; state=defaultState(); state.settings=s; state.resetAt=Date.now(); save(true); mclose(); render()},
  };
  if(H[a]){ e.preventDefault(); H[a](); }
  else if(ACC_H[a]){ e.preventDefault(); ACC_H[a](el); }
});
document.addEventListener('pointerdown',e=>{
  const el=e.target.closest('[data-a=say],[data-a=sayslow],.icard,.mt[data-s=l],.tile'); if(!el) return; ctx();
  const v=el.dataset.a==='say'?el.dataset.v:null; if(v) prefetchClips([v],1);
},{passive:true});
document.addEventListener('input',e=>{ if(e.target.id==='wq'){ ui.wq=e.target.value; const w=document.getElementById('wlist'); if(w) w.innerHTML=wordList(); return; }
  if(e.target.id==='tin'&&LS){ LS.input=e.target.value; const b=document.getElementById('chk'); if(b) b.disabled=!LS.input.trim(); } });
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'||ui.screen!=='lesson'||!LS||document.getElementById('modal').classList.contains('show')) return;
  e.preventDefault(); if(LS.checked||LS.cur.t==='intro') onNext(); else check();
});
document.addEventListener('keydown',e=>{
  if(ui.screen!=='lesson'||!LS||LS.checked||!LS.cur||LS.cur.t!=='mc'||e.target.id==='tin') return;
  const n=parseInt(e.key,10); if(n>=1&&n<=LS.cur.opts.length){LS.sel=LS.cur.opts[n-1].k; render()}
});


// ===== 단어장: 왼쪽으로 밀어 중요 표현에 넣기/빼기 =====
(function(){
  let row=null,x0=0,y0=0,dx=0,mode=null,pid=null; const TH=72;
  const reset=el=>{ el.style.transition='transform .2s ease'; el.style.transform=''; el.classList.remove('sw-ready'); setTimeout(()=>{el.style.transition='';},220); };
  document.addEventListener('pointerdown',e=>{
    const li=e.target.closest&&e.target.closest('.wbook .sw-row'); if(!li||e.button>0) return;
    row=li; x0=e.clientX; y0=e.clientY; dx=0; mode=null; pid=e.pointerId;
  });
  document.addEventListener('pointermove',e=>{
    if(!row||e.pointerId!==pid) return; const mx=e.clientX-x0, my=e.clientY-y0;
    if(!mode){ if(Math.abs(mx)<8&&Math.abs(my)<8) return; mode=Math.abs(mx)>Math.abs(my)*1.2?'h':'v'; if(mode==='v'){row=null;return;} }
    dx=Math.min(0,Math.max(-140,mx)); row.style.transform=`translateX(${dx}px)`; row.classList.toggle('sw-ready',dx<=-TH);
  });
  const end=e=>{
    if(!row||e.pointerId!==pid) return; const li=row; row=null;
    if(mode!=='h'){ return; }
    const fire=dx<=-TH; reset(li); if(!fire) return;
    li.dataset.swiped='1'; setTimeout(()=>{delete li.dataset.swiped;},350);
    const k=li.dataset.k; const add=!(state.wrongNote[k]>0);
    state.wrongNote[k]=add?Date.now():-Date.now(); save();
    haptic();
    if(ui.wbKind==='note'){ render(); return; }
    li.classList.toggle('on',add);
    const c=document.getElementById('ncount'); if(c) c.textContent=noteList().length;
    swToast(add?'중요 표현에 넣었어요':'중요 표현에서 뺐어요');
  };
  document.addEventListener('pointerup',end); document.addEventListener('pointercancel',e=>{ if(row&&e.pointerId===pid){ reset(row); row=null; } });
  // 밀기 직후 생기는 click(발음 재생 등)은 무시
  document.addEventListener('click',e=>{ const li=e.target.closest&&e.target.closest('.sw-row'); if(li&&li.dataset.swiped){ e.stopPropagation(); e.preventDefault(); } },true);
})();
function swToast(t){ let el=document.getElementById('swtoast'); if(!el){ el=document.createElement('div'); el.id='swtoast'; document.body.appendChild(el); }
  el.textContent=t; el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),1400); }

function vdlHTML(k){
  const cur=curVoice().k, st=DL[k];
  if(st&&st.busy&&!st.quiet){ const p=st.total?Math.floor(st.done/st.total*100):0;
    return `<div class="vdl"><div class="vbar"><div style="width:${p}%"></div></div><button class="vbtn ghost" data-a="vdl" data-v="${k}">받는 중 ${p}% · 취소</button></div>`; }
  if(isDl(k)) return `<div class="vdl">${cur===k?'<span class="vuse">'+I.check+'사용 중</span>':`<button class="vbtn" data-a="vuse" data-v="${k}">이 목소리 쓰기</button>`}<button class="vdel" data-a="vdel" data-v="${k}">삭제</button><small class="vsaved">기기에 저장됨</small></div>`;
  return `<div class="vdl">${k==='himari'&&cur===k?'<span class="vuse">'+I.check+'사용 중</span>':''}<button class="vbtn ${k==='himari'&&cur===k?'ghost':''}" data-a="vdl" data-v="${k}">${st&&st.err?'다시 받기':'받기'} · 약 65MB</button></div>`;
}
function vRefresh(k){ const el=document.querySelector(`.vopt[data-k="${k}"] .vdl`); if(el) el.outerHTML=vdlHTML(k); }
const helloUrl=V=>V.dir+sayHash('こんにちは')+'.mp3';
function voiceCard(){
  const cur=curVoice().k;
  setTimeout(()=>VOICES.forEach(V=>loadBuf(helloUrl(V)).catch(()=>{})),0);
  return `<div class="vcard"><div class="vh"><b>목소리</b><small>▶로 「こんにちは」를 들어 보고, 마음에 드는 목소리를 받아서 쓰세요. 받은 목소리는 기기에 저장돼서 인터넷 없이도 바로 재생돼요.</small></div><div class="vlist">${VOICES.map(V=>
    `<div class="vopt ${cur===V.k?'on':''}" data-k="${V.k}"><div class="vtop"><button class="vplay" data-a="vprev" data-v="${V.k}" aria-label="들어 보기">${I.spk}</button><div><b>${esc(V.ko)}</b><small>${esc(V.d)}</small></div></div><i>VOICEVOX:${esc(V.cr)}</i>${vdlHTML(V.k)}</div>`).join('')}</div>
  <p class="vnote">'포근한 목소리'는 받지 않아도 인터넷으로 바로 쓸 수 있어요. 받아 두면 더 빨라요.</p></div>`;
}
