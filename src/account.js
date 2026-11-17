// ================= 계정 (Supabase) =================
// MAGI·SEED 10K와 같은 Supabase 프로젝트. 공개용 키이며, 데이터는 표의 행 수준 보안(RLS) 정책이 지킨다.
// 서버 표 준비: supabase/kanamichi.sql 을 SQL Editor에서 한 번 실행한다.
const SB_URL='https://ictjkqbbcaigdvlysdaw.supabase.co';
const SB_KEY='sb_publishable_C7jZEKJn_nF2Y3Ngq5f80Q_RA5Wrfux';
const SB_TABLE='kanamichi_progress';
const MODEKEY='kanamichi.mode';           // 'guest' 이면 로그인 없이 사용 중
const AUTHKEY='kanamichi.auth';           // 같은 github.io 주소를 쓰는 다른 앱과 로그인 저장 공간을 나눈다
const ACC={sb:null,user:null,status:'guest',busy:false,dirty:false,gate:{tab:'login',msg:'',err:false,busy:false},entered:null};
let saveTimer=null;

const lsKey=uid=>LSKEY+':'+(uid===undefined?(ACC.user?ACC.user.id:'guest'):uid);
function loadLocal(key){try{const r=localStorage.getItem(key);return r?normalize(JSON.parse(r)):null}catch(e){return null}}
function saveLocal(){try{localStorage.setItem(lsKey(),JSON.stringify(state))}catch(e){}}
function save(immediate){
  state.updatedAt=Date.now(); saveLocal();
  if(!ACC.user) return;
  clearTimeout(saveTimer); saveTimer=setTimeout(pushRemote, immediate?50:1500);
}
function trimState(s){ // 일별 기록은 최근 60일만 보관
  const lim=addDays(dayKey(),-60);
  for(const key of ['dailyXP','dailyWords']) for(const k of Object.keys(s[key]||{})) if(k<lim) delete s[key][k];
  return s;
}
// 두 기록을 합친다: 최신 쪽을 바탕으로, 완료한 레슨·일별 기록·XP·오답 통계는 잃지 않게 합친다.
function mergeState(a,b){
  const [n,o]=(a.updatedAt||0)>=(b.updatedAt||0)?[a,b]:[b,a];
  if(n.resetAt&&(o.updatedAt||0)<=n.resetAt) return normalize(JSON.parse(JSON.stringify(n)));
  const r=JSON.parse(JSON.stringify(n));
  for(const id in o.lessons||{}){const x=o.lessons[id], y=r.lessons[id]; if(!y||(x.done||0)>(y.done||0)) r.lessons[id]=Object.assign({},x);}
  for(const k of ['dailyXP','dailyWords']) for(const d in o[k]||{}) r[k][d]=Math.max(r[k][d]||0,o[k][d]);
  r.xp=Math.max(r.xp||0,o.xp||0);
  r.wrongNote=r.wrongNote||{}; for(const k in o.wrongNote||{}){ const x=o.wrongNote[k], y=r.wrongNote[k]; if(y==null||Math.abs(x)>Math.abs(y)) r.wrongNote[k]=x; }
  r.hard=r.hard||{}; for(const k in o.hard||{}){ const p=o.hard[k], q=r.hard[k]; if(q==null||Math.abs(p)>Math.abs(q)) r.hard[k]=p; }
  r.bonus=r.bonus||{}; for(const k in o.bonus||{}){ const p=o.bonus[k], q=r.bonus[k]; if(!q){ r.bonus[k]=p; continue; } const late=(p.at||0)>(q.at||0)?p:q; r.bonus[k]=Object.assign({},late,{score:Math.max(p.score||0,q.score||0)}); }
  r.pos=r.pos||{}; for(const k in o.pos||{}){ const p=o.pos[k], q=r.pos[k]; if(!q||(p.at||0)>(q.at||0)) r.pos[k]=p; }
  r.tut=Object.assign({},o.tut||{},r.tut||{});
  r.tests=r.tests||{}; for(const d in o.tests||{}){ if(!r.tests[d]||(o.tests[d].score||0)>(r.tests[d].score||0)) r.tests[d]=o.tests[d]; }
  for(const id in o.stats||{}){const s=r.stats[id]||[0,0], t=o.stats[id]; r.stats[id]=[Math.max(s[0],t[0]),Math.max(s[1],t[1])];}
  if((o.lastDay||'')>(r.lastDay||'')){r.lastDay=o.lastDay; r.streak=o.streak;} else if(o.lastDay===r.lastDay) r.streak=Math.max(r.streak||0,o.streak||0);
  r.updatedAt=Math.max(a.updatedAt||0,b.updatedAt||0);
  return normalize(r);
}
const tableMissing=err=>!!err&&(err.code==='42P01'||err.code==='PGRST205'||/does not exist|schema cache|Could not find the table/i.test(err.message||''));
async function pushRemote(){
  if(!ACC.user||!ACC.sb||ACC.status==='notable') return;
  if(ACC.busy){ACC.dirty=true;return}
  ACC.busy=true; ACC.status='saving'; updateSyncLabel();
  const uid=ACC.user.id;
  try{
    const {error}=await ACC.sb.from(SB_TABLE).upsert({user_id:uid,data:trimState(JSON.parse(JSON.stringify(state))),updated_at:new Date().toISOString()});
    ACC.status=error?(tableMissing(error)?'notable':'error'):'synced';
  }catch(e){ACC.status='error'}
  ACC.busy=false; updateSyncLabel();
  if(ACC.dirty&&ACC.user&&ACC.user.id===uid){ACC.dirty=false; pushRemote();}
}
async function pullRemote(first){
  if(!ACC.user||!ACC.sb) return;
  const uid=ACC.user.id; ACC.status='loading'; updateSyncLabel();
  let res; try{ res=await ACC.sb.from(SB_TABLE).select('data,updated_at').eq('user_id',uid).maybeSingle(); }catch(e){ res={error:e}; }
  if(!ACC.user||ACC.user.id!==uid) return;
  if(res.error){ ACC.status=tableMissing(res.error)?'notable':'error'; updateSyncLabel(); return; }
  const remote=res.data?normalize(res.data.data):null;
  if(first&&!remote) offerGuestImport();
  const merged=remote?mergeState(state,remote):state;
  const changedLocal=JSON.stringify(merged)!==JSON.stringify(state);
  state=merged; saveLocal();
  if(changedLocal&&typeof warmVoice==='function') warmVoice();
  if(!remote||JSON.stringify(trimState(JSON.parse(JSON.stringify(merged))))!==JSON.stringify(trimState(JSON.parse(JSON.stringify(remote))))) await pushRemote();
  else { ACC.status='synced'; updateSyncLabel(); }
  if(changedLocal&&(ui.screen==='home')){ render(); scrollToCur(); }
}
function offerGuestImport(){
  const g=loadLocal(lsKey('guest'));
  if(!g||!(g.xp>0)) return;
  if(localStorage.getItem(MODEKEY+'.imported:'+ACC.user.id)) return;
  modal(`<div class="isheet"><h2>이 기기의 기록 가져오기</h2><p>로그인 없이 학습한 기록(${g.xp} XP, 완료한 레슨 ${Object.values(g.lessons).filter(x=>x.done).length}개)이 이 기기에 있어요. 이 계정으로 가져올까요?</p>
  <button class="btn wide" data-a="gimport">가져오기</button><button class="btn ghost wide" data-a="gskip">가져오지 않기</button></div>`);
}
function updateSyncLabel(){const el=document.getElementById('sync'); if(el) el.textContent=syncText()}
function syncText(){return {synced:'계정에 저장됨 — 다른 기기에서도 이어서 학습할 수 있어요',saving:'저장 중…',loading:'계정 기록을 불러오는 중…',error:'서버에 저장하지 못했어요. 이 기기에는 저장되어 있어요',notable:'서버에 기록 표가 아직 없어요 (supabase/kanamichi.sql 실행 필요). 지금은 이 기기에만 저장돼요',guest:'로그인하지 않음 — 이 기기(브라우저)에만 저장돼요'}[ACC.status]||''}
function displayName(u){return (u&&u.user_metadata&&u.user_metadata.nickname)||(u&&u.email?u.email.split('@')[0]:'')}
function accountCard(){
  if(ACC.user) return `<section class="card acct"><div class="arow"><span class="av">${esc(displayName(ACC.user).slice(0,1).toUpperCase())}</span><div><b>${esc(displayName(ACC.user))}</b><small>${esc(ACC.user.email||'')}</small></div></div>
  <p class="sync" id="sync">${syncText()}</p><div class="abtns"><button class="btn sm ghost" data-a="syncnow">지금 동기화</button><button class="btn sm ghost danger" data-a="logout">로그아웃</button></div></section>`;
  return `<section class="card acct"><h3>로그인하지 않음</h3><p class="sync" id="sync">${syncText()}</p><p class="hint">로그인하면 학습 기록이 계정에 저장돼서 휴대폰·컴퓨터 어디서든 이어서 할 수 있어요. MAGI·SEED 10K 계정으로도 로그인할 수 있어요.</p>
  <button class="btn wide" data-a="togate">로그인 / 회원가입</button></section>`;
}

// ---------- 시작 화면 ----------
function renderGate(){
  const G=ACC.gate, su=G.tab==='signup', noSb=!ACC.sb;
  app.innerHTML=`<div class="gate"><div class="ghead"><div class="glogo jp">かなみち</div><p>하루 25단어로 시작하는 일본어</p></div>
  ${noSb?`<div class="card"><p>로그인 서버에 연결하지 못했어요. 인터넷 연결을 확인하거나, 로그인 없이 시작하세요.</p></div>`:`
  <div class="seg"><button class="${!su?'on':''}" data-a="gtab" data-v="login">로그인</button><button class="${su?'on':''}" data-a="gtab" data-v="signup">회원가입</button></div>
  <form class="gform" id="gform" novalidate>
    <label>이메일<input id="gEmail" type="email" autocomplete="username" inputmode="email" placeholder="you@example.com"></label>
    <label>비밀번호<input id="gPw" type="password" autocomplete="${su?'new-password':'current-password'}" placeholder="${su?'6자 이상':''}"></label>
    ${su?'<label>닉네임 <small>(선택)</small><input id="gNick" type="text" maxlength="12" autocomplete="nickname" placeholder="2~12자"></label>':''}
    <p class="gmsg ${G.err?'err':''}" id="gMsg">${esc(G.msg)}</p>
    <button class="btn wide" type="submit" ${G.busy?'disabled':''}>${G.busy?'잠시만요…':su?'가입하기':'로그인'}</button>
    ${su?'':'<button class="link" type="button" data-a="gforgot">비밀번호를 잊었어요</button>'}
  </form>
  <p class="hint c">MAGI·SEED 10K와 같은 계정을 써요.</p>
  <div class="or"><span>또는</span></div>`}
  <button class="btn ghost wide" data-a="guest">로그인 없이 시작하기</button><p class="hint c">기록은 이 기기(브라우저)에만 저장돼요. 나중에 로그인하면 계정으로 가져올 수 있어요.</p></div>`;
  const f=document.getElementById('gform'); if(f) f.addEventListener('submit',e=>{e.preventDefault(); su?doSignup():doLogin()});
}
function gateMsg(t,err){ACC.gate.msg=t; ACC.gate.err=!!err; const m=document.getElementById('gMsg'); if(m){m.textContent=t; m.className='gmsg'+(err?' err':'')}}
function gateBusy(b){ACC.gate.busy=b; const btn=document.querySelector('#gform [type=submit]'); if(btn){btn.disabled=b; btn.textContent=b?'잠시만요…':(ACC.gate.tab==='signup'?'가입하기':'로그인')}}
const gv=id=>{const e=document.getElementById(id); return e?e.value.trim():''};
const emailOK=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const errText=e=>(e&&(e.message||e.error_description))||String(e);
async function doLogin(){
  const email=gv('gEmail'), pw=document.getElementById('gPw').value;
  if(!emailOK(email)) return gateMsg('이메일 주소를 확인하세요.',true);
  if(!pw) return gateMsg('비밀번호를 입력하세요.',true);
  gateBusy(true); gateMsg('');
  try{
    const {error}=await ACC.sb.auth.signInWithPassword({email,password:pw});
    if(error){
      if(/not confirmed/i.test(error.message)){ gateMsg('아직 이메일 인증을 하지 않은 계정이에요. 메일의 코드를 입력하세요.',true); codeDialog(email,'signup'); }
      else gateMsg(/invalid/i.test(error.message)?'이메일 또는 비밀번호가 맞지 않아요.':'로그인하지 못했어요: '+error.message,true);
    }
  }catch(e){gateMsg('로그인하지 못했어요: '+errText(e),true)}
  gateBusy(false);
}
async function doSignup(){
  const email=gv('gEmail'), pw=document.getElementById('gPw').value, nick=gv('gNick');
  if(!emailOK(email)) return gateMsg('이메일 주소를 확인하세요.',true);
  if(pw.length<6) return gateMsg('비밀번호는 6자 이상이어야 해요.',true);
  if(nick&&(nick.length<2||nick.length>12)) return gateMsg('닉네임은 2~12자로 정하세요.',true);
  gateBusy(true); gateMsg('');
  try{
    const {data,error}=await ACC.sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.origin+location.pathname,data:nick?{nickname:nick}:{}}});
    if(error) gateMsg(/already|registered/i.test(error.message)?'이미 가입된 이메일이에요. 로그인 탭에서 로그인하세요.':/password/i.test(error.message)?'비밀번호 조건을 만족하지 않아요: '+error.message:'가입하지 못했어요: '+error.message,true);
    else if(!(data&&data.session)){ gateMsg('인증 메일을 보냈어요. 메일의 숫자 코드를 입력하세요.'); codeDialog(email,'signup'); }
  }catch(e){gateMsg('가입하지 못했어요: '+errText(e),true)}
  gateBusy(false);
}
// 메일로 받은 숫자 코드 확인 (가입 인증 / 비밀번호 재설정)
function codeDialog(email,type){
  const rec=type==='recovery';
  modal(`<div class="isheet"><h2>${rec?'비밀번호 재설정':'이메일 인증'}</h2><p>${esc(email)}로 보낸 메일의 숫자 코드를 입력하세요. 메일이 안 보이면 스팸함도 확인하세요.</p>
  <input id="cCode" class="cin" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="인증 코드">
  ${rec?'<input id="cPw" class="cin" type="password" autocomplete="new-password" placeholder="새 비밀번호 (6자 이상)">':''}
  <p class="gmsg" id="cMsg"></p>
  <button class="btn wide" data-a="cgo" data-v="${type}" data-e="${esc(email)}">${rec?'비밀번호 바꾸기':'인증하기'}</button>
  <button class="btn ghost wide" data-a="cagain" data-v="${type}" data-e="${esc(email)}">코드 다시 보내기</button>
  <button class="link" data-a="mclose">닫기</button></div>`);
}
const cmsg=(t,err)=>{const m=document.getElementById('cMsg'); if(m){m.textContent=t; m.className='gmsg'+(err?' err':'')}};
async function codeGo(el){
  const type=el.dataset.v, email=el.dataset.e, code=gv('cCode').replace(/\s/g,'');
  if(!/^\d{6,10}$/.test(code)) return cmsg('메일에 적힌 숫자 코드를 그대로 입력하세요.',true);
  const pw=type==='recovery'?document.getElementById('cPw').value:'';
  if(type==='recovery'&&pw.length<6) return cmsg('새 비밀번호는 6자 이상이어야 해요.',true);
  el.disabled=true; cmsg('확인하는 중…');
  try{
    const {error}=await ACC.sb.auth.verifyOtp({email,token:code,type});
    if(error){ cmsg(/expired|invalid/i.test(error.message)?'코드가 틀렸거나 만료됐어요. 다시 보내기를 눌러 새 코드를 받으세요.':'확인하지 못했어요: '+error.message,true); el.disabled=false; return; }
    if(type==='recovery'){ const r=await ACC.sb.auth.updateUser({password:pw}); if(r.error){cmsg('비밀번호를 바꾸지 못했어요: '+r.error.message,true); el.disabled=false; return;} }
    mclose(); // 로그인은 onAuthStateChange가 이어서 처리한다
  }catch(e){cmsg('확인하지 못했어요: '+errText(e),true); el.disabled=false;}
}
async function codeAgain(el){
  const type=el.dataset.v, email=el.dataset.e; el.disabled=true;
  try{
    const {error}=type==='recovery'?await ACC.sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}):await ACC.sb.auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+location.pathname}});
    cmsg(error?(/security purposes|rate|seconds/i.test(error.message)?'잠시 뒤에 다시 누르세요 (1분에 한 번).':'보내지 못했어요: '+error.message):'새 코드를 보냈어요.',!!error);
  }catch(e){cmsg('보내지 못했어요: '+errText(e),true)}
  setTimeout(()=>{el.disabled=false},3000);
}
async function doForgot(){
  const email=gv('gEmail');
  if(!emailOK(email)) return gateMsg('비밀번호를 재설정할 이메일 주소를 먼저 입력하세요.',true);
  gateBusy(true);
  try{
    const {error}=await ACC.sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error) gateMsg(/security purposes|rate|seconds/i.test(error.message)?'잠시 뒤에 다시 시도하세요 (1분에 한 번).':'메일을 보내지 못했어요: '+error.message,true);
    else { gateMsg('재설정 메일을 보냈어요.'); codeDialog(email,'recovery'); }
  }catch(e){gateMsg('메일을 보내지 못했어요: '+errText(e),true)}
  gateBusy(false);
}
// 메일의 링크로 재설정 화면에 들어온 경우
function newPwDialog(){
  modal(`<div class="isheet"><h2>새 비밀번호</h2><input id="nPw" class="cin" type="password" autocomplete="new-password" placeholder="새 비밀번호 (6자 이상)"><p class="gmsg" id="cMsg"></p>
  <button class="btn wide" data-a="npgo">저장</button><button class="link" data-a="mclose">닫기</button></div>`);
}

// ---------- 들어가기 / 나가기 ----------
function enterApp(user){
  const id=user?user.id:'guest';
  if(ACC.entered===id&&ui.screen!=='gate'&&ui.screen!=='boot') { ACC.user=user||null; return; }
  ACC.entered=id; ACC.user=user||null;
  try{ if(user) localStorage.removeItem(MODEKEY); else localStorage.setItem(MODEKEY,'guest'); }catch(e){}
  state=loadLocal(lsKey())||defaultState();
  if(typeof warmVoice==='function') warmVoice();
  if(!user){ // 1.0.0에서 쓰던 저장 칸을 손님 기록으로 옮긴다
    const old=loadLocal(LSKEY); if(old&&!(state.xp>0)){ state=old; saveLocal(); try{localStorage.removeItem(LSKEY)}catch(e){} }
  }
  ACC.status=user?'loading':'guest';
  LS=null; ui.screen='home'; ui.tab='learn'; mclose(); render(); scrollToCur();
  if(user) pullRemote(true);
}
function showGate(tab){ ACC.entered=null; ACC.gate={tab:tab||'login',msg:'',err:false,busy:false}; LS=null; ui.screen='gate'; mclose(); render(); scrollTop(0); }
async function logout(){
  clearTimeout(saveTimer); if(ACC.user) await pushRemote();
  try{ await ACC.sb.auth.signOut(); }catch(e){}
  ACC.user=null; showGate('login');
}

const ACC_H={
  gtab:el=>{ACC.gate.tab=el.dataset.v; ACC.gate.msg=''; render()},
  guest:()=>enterApp(null),
  togate:()=>showGate('login'),
  gforgot:()=>doForgot(),
  cgo:el=>codeGo(el), cagain:el=>codeAgain(el),
  npgo:async el=>{const pw=document.getElementById('nPw').value; if(pw.length<6) return cmsg('6자 이상 입력하세요.',true); el.disabled=true; const r=await ACC.sb.auth.updateUser({password:pw}); if(r.error){cmsg('바꾸지 못했어요: '+r.error.message,true); el.disabled=false} else {mclose()}},
  logout:()=>modal(`<div class="isheet"><h2>로그아웃할까요?</h2><p>학습 기록은 계정에 저장되어 있어요. 다시 로그인하면 이어서 할 수 있어요.</p><button class="btn danger wide" data-a="dologout">로그아웃</button><button class="btn ghost wide" data-a="mclose">취소</button></div>`),
  dologout:()=>{mclose(); logout()},
  syncnow:()=>{clearTimeout(saveTimer); pullRemote(false)},
  gimport:()=>{const g=loadLocal(lsKey('guest')); if(g){ g.updatedAt=Math.max(g.updatedAt||0,(state.updatedAt||0)+1); state=mergeState(state,g); } try{localStorage.setItem(MODEKEY+'.imported:'+ACC.user.id,'1')}catch(e){} mclose(); save(true); render()},
  gskip:()=>{try{localStorage.setItem(MODEKEY+'.imported:'+ACC.user.id,'1')}catch(e){} mclose()},
};

function boot(){
  try{ if(window.claude&&typeof window.claude.use==='function') claude.use('tts').then(t=>{ctts=t||null}).catch(()=>{}); }catch(e){}
  let guestMode=false; try{guestMode=localStorage.getItem(MODEKEY)==='guest'}catch(e){}
  if(!window.supabase||!window.supabase.createClient){ if(guestMode) enterApp(null); else showGate(); return; }
  try{ ACC.sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{storageKey:AUTHKEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}); }
  catch(e){ ACC.sb=null; if(guestMode) enterApp(null); else showGate(); return; }
  let resolved=false;
  ACC.sb.auth.onAuthStateChange((ev,session)=>{
    setTimeout(()=>{ // 콜백 안에서 바로 supabase를 다시 부르면 잠금이 걸릴 수 있어 한 박자 미룬다
      if(ev==='PASSWORD_RECOVERY'){ if(session) enterApp(session.user); newPwDialog(); return; }
      if(session&&session.user){ resolved=true; enterApp(session.user); }
      else if(ev==='SIGNED_OUT'){ if(ACC.entered&&ACC.entered!=='guest') showGate('login'); }
      else if(ev==='INITIAL_SESSION'&&!resolved){ resolved=true; if(guestMode) enterApp(null); else showGate(); }
    },0);
  });
  setTimeout(()=>{ if(!resolved){ resolved=true; if(guestMode) enterApp(null); else showGate(); } },6000);
}
// 새 버전 확인: 홈 화면 앱이 예전 페이지를 붙잡고 있을 때 업데이트를 알려 준다
let NEWVER=null;
function checkUpdate(){
  if(!/^https?:/.test(location.protocol)) return;
  fetch(location.pathname+'?check='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.text():'').then(t=>{
    const m=t.match(/APP_VERSION='([\d.]+)'/); if(m&&m[1]!==APP_VERSION){ NEWVER=m[1]; showUpdateBar(); tryAutoUpdate(); }
  }).catch(()=>{});
}
function showUpdateBar(){
  if(!NEWVER||document.getElementById('upd')) return;
  const d=document.createElement('div'); d.id='upd'; d.className='upd';
  d.innerHTML=`<span>새 버전 v${esc(NEWVER)}이 나왔어요</span><button data-a="doupdate">업데이트</button>`;
  document.body.appendChild(d);
}
ACC_H.doupdate=()=>doUpdate();
async function doUpdate(){
  if(ACC.user){ clearTimeout(saveTimer); try{ await Promise.race([pushRemote(),new Promise(r=>setTimeout(r,1500))]); }catch(e){} }
  location.replace(location.pathname+'?v='+NEWVER);
}
// 자동 업데이트: 새 버전이 나오면 학습 중이 아닐 때 바로, 학습 중이면 레슨이 끝나고 홈으로 돌아오는 순간 업데이트한다
function updBusy(){
  if(['lesson','result','bonus','gate','boot'].includes(ui.screen)) return true;
  const m=document.getElementById('modal'); if(m&&m.classList.contains('show')) return true;
  if(Object.values(DL).some(st=>st.busy&&!st.quiet)) return true; // 목소리 받는 중
  const a=document.activeElement; if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')&&a.value) return true;
  return false;
}
function tryAutoUpdate(){
  if(!NEWVER||updBusy()) return;
  // 같은 버전으로 계속 새로고침되는 일(서버 캐시가 늦게 바뀔 때)을 막기: 같은 버전은 10분에 한 번만
  try{ const o=JSON.parse(localStorage.getItem('kanamichi.autoupd')||'{}'); if(o.v===NEWVER&&Date.now()-o.at<10*60*1000) return;
    localStorage.setItem('kanamichi.autoupd',JSON.stringify({v:NEWVER,at:Date.now()})); }catch(e){}
  const d=document.getElementById('upd'); if(d) d.innerHTML=`<span>새 버전 v${esc(NEWVER)}으로 업데이트하는 중…</span>`;
  doUpdate();
}
setInterval(()=>{ if(document.visibilityState==='visible') checkUpdate(); },10*60*1000);
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible') checkUpdate();
  if(!ACC.user) return;
  if(document.visibilityState==='hidden'){ clearTimeout(saveTimer); pushRemote(); }
  else if(ui.screen==='home') pullRemote(false);
});
boot();
setTimeout(checkUpdate,1500);
// GitHub가 잠깐 접속을 막아도(429) 마지막으로 받은 앱 페이지로 열리게
try{ if(/^https:/.test(location.protocol)&&navigator.serviceWorker) navigator.serviceWorker.register('sw.js').catch(()=>{}); }catch(e){}
