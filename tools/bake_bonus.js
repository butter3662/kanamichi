// tools/bonus_src.js(후리가나 없이 쓴 원본) → src/bonus.js(모든 한자에 읽기를 붙인 것)
// 숫자+조수사, 자동으로 틀리기 쉬운 말은 아래 표로 먼저 고정하고, 나머지는 앱과 같은 furiAuto(단어 데이터의 읽기)로 붙인다.
const fs=require('fs'),vm=require('vm'),path=require('path');
const R=path.join(__dirname,'..');
const app=fs.readFileSync(R+'/src/app.js','utf8');
const cut=app.slice(app.indexOf('// ---- 설명 글(문법 해설 등)에 후리가나'), app.indexOf('const rubyAuto'));
const days=fs.readdirSync(R+'/src/days').sort().map(f=>fs.readFileSync(R+'/src/days/'+f,'utf8')).join('\n');
const c={};vm.createContext(c);
vm.runInContext(fs.readFileSync(R+'/src/data.js','utf8')+days+fs.readFileSync(__dirname+'/bonus_src.js','utf8')+cut+';this.B=BONUS;this.F=furiAuto',c);
const FIX={
 '七時':'しちじ','八時':'はちじ','九時':'くじ','三時':'さんじ','十一時':'じゅういちじ','二週間':'にしゅうかん','五人':'ごにん','十分':'じゅっぷん','一人':'ひとり','十五分':'じゅうごふん','十時':'じゅうじ','二時':'にじ','四時':'よじ','十人':'じゅうにん','三十分':'さんじゅっぷん','一度':'いちど','十四時':'じゅうよじ','一週間':'いっしゅうかん','十八時':'じゅうはちじ','二十一時':'にじゅういちじ','五月':'ごがつ','十日':'とおか','三千円':'さんぜんえん','三分':'さんぷん','三人':'さんにん','百人':'ひゃくにん','一番':'いちばん','四十人':'よんじゅうにん','二十五人':'にじゅうごにん','三番目':'さんばんめ','十五人':'じゅうごにん','一年生':'いちねんせい','四年生':'よねんせい','十八度':'じゅうはちど','十五度':'じゅうごど','一日中':'いちにちじゅう','一年':'いちねん','三社':'さんしゃ','一秒':'いちびょう','六時':'ろくじ','一日':'いちにち','三年間':'さんねんかん','三階':'さんがい','五時間':'ごじかん','三回':'さんかい','四時間':'よじかん','十五歳':'じゅうごさい','三日':'みっか','一回分':'いっかいぶん','二回分':'にかいぶん','五回':'ごかい','九十歳':'きゅうじゅっさい','一時':'いちじ','二か月':'にかげつ',
 '学年':'がくねん','三十分後':'さんじゅっぷんご','三分後':'さんぷんご','筆者':'ひっしゃ','館内放送':'かんないほうそう','特別展示室':'とくべつてんじしつ','入場':'にゅうじょう','参考':'さんこう','電車代':'でんしゃだい','骨折':'こっせつ','不在連絡票':'ふざいれんらくひょう','上着':'うわぎ','試合中':'しあいちゅう','出張中':'しゅっちょうちゅう','旅行中':'りょこうちゅう','営業所':'えいぎょうしょ','会場':'かいじょう','座席表':'ざせきひょう','直接':'ちょくせつ','真剣':'しんけん','頷':'うなず','戦':'たたか','佐藤':'さとう','木村':'きむら','来館':'らいかん','館内':'かんない','展示室内':'てんじしつない','展示室':'てんじしつ','際':'さい','超':'こ','効':'き','未満':'みまん','親戚':'しんせき','輝':'かがや','全体的':'ぜんたいてき','教官':'きょうかん','部員':'ぶいん','部室':'ぶしつ','部活':'ぶかつ','部':'ぶ','下':'した','行':'おこな','中学生':'ちゅうがくせい','健太':'けんた','町内会':'ちょうないかい','三か月':'さんかげつ','西日本':'にしにほん','東日本':'ひがしにほん','日本':'にほん','日本語':'にほんご','日本人':'にほんじん','今日':'きょう','明日':'あした','昨日':'きのう','今朝':'けさ','一緒':'いっしょ','何':null,'本日':'ほんじつ','一つ':null,'東京':'とうきょう','大阪':'おおさか','祖父母':'そふぼ','実家':'じっか','お盆':null,'目覚':'めざ','誠':'まこと','自身':'じしん','混':'こ','声掛':'こえか','係員':'かかりいん','貴重品':'きちょうひん','服用':'ふくよう','食後':'しょくご','分':null};
// '行'·'下'처럼 한 글자는 특정 문맥에서만: 아래 CTX 규칙으로 처리
const CTX=[[/三十(?=キロ)/g,'三十[さんじゅっ]'],[/(^|[^十])十(?=キロ)/g,'$1十[じゅっ]'],[/二か月/g,'二[に]か月[げつ]'],[/上(?=の)/g,'上[うえ]'],[/楽(?=だ)/g,'楽[らく]'],[/話$/g,'話[はなし]'],[/行(?=っ|う|わ)/g,'行[おこな]',s=>/アンケートを 行|行われ|行う/.test(s)],[/下(?=を 向)/g,'下[した]'],[/下(?=の 番号)/g,'下[した]'],[/何(?=で 大学)/g,'何[なに]']];
const ONE=new Set(['頷','戦','際','超','効','輝','混','誠','部','下','行','目覚','声掛']);
const keys=Object.keys(FIX).filter(k=>FIX[k]&&!ONE.has(k)).sort((a,b)=>b.length-a.length);
function bake(s){ if(!s) return s;
  for(const [re,rep,cond] of CTX){ if(!cond||cond(s)) s=s.replace(re,rep); }
  // 긴 말부터, 이미 [ ]가 붙은 곳·더 긴 한자 덩어리 한가운데는 건드리지 않는다
  // 이미 읽기가 붙은 덩어리(漢字[かな])는 보호하고, 나머지 부분에만 적용
  const prot=(str,fn)=>str.split(/([㐀-鿿々〆]+\[[^\]]+\])/).map((seg,j)=>j%2?seg:fn(seg)).join('');
  for(const k of keys){ s=prot(s,seg=>seg.replace(new RegExp(k,'g'),(m,i,str)=>{ const pv=str.charAt(i-1), nx=str.charAt(i+m.length); if(/[㐀-鿿々]/.test(pv)) return m; if(/[㐀-鿿々]/.test(nx)&&!/[〇一二三四五六七八九十]/.test(k[0])) return m; return m+'['+FIX[k]+']'; })); }
  // 한 글자 한자(앞뒤가 히라가나일 때만)
  for(const k of ['頷','戦','際','超','効','輝','混','誠','声掛','目覚']) s=prot(s,seg=>seg.replace(new RegExp('(^|[^㐀-鿿々])'+k+'(?![\\[㐀-鿿々])','g'),(m,p)=>p+k+'['+FIX[k]+']'));
  s=s.replace(/サッカー部(?!\[)/g,'サッカー部[ぶ]');
  return c.F(s);
}
const out=c.B.map(b=>({...b,title:bake(b.title),text:bake(b.text),gloss:(b.gloss||[]).map(([w,m])=>[bake(w),m]),qs:b.qs.map(q=>({...q,q:bake(q.q),o:q.o.map(bake),ex:bake(q.ex)}))}));
const head=fs.readFileSync(__dirname+'/bonus_src.js','utf8').split('const BONUS')[0].replace(/^/,'// 이 파일은 tools/bake_bonus.js가 tools/bonus_src.js에서 만든다. 직접 고치지 말 것.\n');
fs.writeFileSync(R+'/src/bonus.js',head+'const BONUS='+JSON.stringify(out,null,0).replace(/\},\{"id"/g,'},\n{"id"')+';\n');
// 검토용 출력
if(process.argv[2]) out.filter(b=>process.argv[2]==='all'||b.id===process.argv[2]).forEach(b=>{ const show=s=>s.replace(/([㐀-鿿々〆]+)\[([^\]]+)\]/g,'$1($2)'); const miss=new Set(); const chk=s=>{(s.replace(/[㐀-鿿々〆]+\[[^\]]+\]/g,'').match(/[㐀-鿿々〆]+/g)||[]).forEach(x=>miss.add(x))};
  [b.title,b.text,...b.qs.flatMap(q=>[q.q,...q.o])].forEach(chk); console.log('##',b.id,'MISS',[...miss].join(' ')); console.log([b.title,b.text,...b.qs.flatMap(q=>[q.q,...q.o])].map(show).join('\n')); });
