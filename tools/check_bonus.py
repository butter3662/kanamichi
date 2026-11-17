# 보너스 지문 검사: 내용어 중 그 Day까지 배운 단어 비율(80% 이상), 관련 개념이 범위 안인지. 필요: pip install fugashi unidic-lite
import json,re,subprocess,sys,fugashi
import os; H=os.path.dirname(os.path.abspath(__file__)); V=json.loads(subprocess.check_output(['node',H+'/bonus_vocab.js']))
B=json.loads(subprocess.check_output(['node','-e',"const fs=require('fs');const c={};require('vm').createContext(c);require('vm').runInContext(fs.readFileSync(process.argv[1],'utf8')+';this.B=BONUS;this.MOCK=MOCK;this.MORE=MORE',c);console.log(JSON.stringify(c.B.concat(Object.entries(c.MORE).flatMap(([id,ms])=>ms.map((m,i)=>({id:id+'+'+(i+1),after:c.B.find(b=>b.id===id).after,lv:'',text:m.text,gloss:m.gloss,qs:[{...m.q,a:0}]})))).concat(c.MOCK.map(m=>({id:m.id,after:m.after,lv:m.lv,text:m.secs.map(S=>(S.text||'')).join(String.fromCharCode(10)),gloss:m.secs.flatMap(S=>S.gloss||[]),qs:m.secs.flatMap(S=>S.qs.map(q=>({...q,a:0})))})))))",H+'/bonus_src.js']))
T=fugashi.Tagger()
toH=lambda s:''.join(chr(ord(c)-0x60) if 'ァ'<=c<='ヶ' else c for c in s)
WL=set('A B 鈴木 健太 筆者 男の子 女の子 つもり 佐藤 木村 キム ユミ ミン 田中 山田 リン タナカ ヤマダ スミス つく つい'.split())|set('する いる ある なる こと もの とき ところ よう の ん そう ため これ それ ない いい よい できる くださる です ます た 方 たち 的 さん ごろ 中 頃 目 回 人 年 月 日 時 分 つ 本 枚 階 円 歳 くらい ぐらい など ほう ほか みんな 皆 おる やる 来る 行く 言う 思う わけ はず'.split())
CONTENT={'名詞','動詞','形容詞','形状詞','副詞','代名詞','連体詞','接続詞','感動詞'}
plain=lambda s:re.sub(r'\[[^\]]+\]','',s).replace('{{','').replace('}}','')
bad=0
for b in B:
  A=b['after']; jp=set(); kn=set()
  for d in V[:A]:
    for w,k in d: jp.add(w); kn.add(k)
  gl=set(plain(g[0]) for g in b.get('gloss',[]))
  txt=plain(b['text'])+'\n'+'\n'.join(plain(q['q'])+'\n'+'\n'.join(plain(o) for o in q['o']) for q in b['qs'])
  tot=0; unk=[]
  for w in T(txt):
    f=w.feature
    if f.pos1 not in CONTENT: continue
    if f.pos2=='数詞' or re.fullmatch(r'[0-9０-９一二三四五六七八九十百千万]+',w.surface): continue
    tot+=1
    cand={w.surface,f.lemma or '',f.orthBase or '',toH(f.kanaBase or ''),toH(f.kana or '')}
    cand={re.sub(r'-.*','',x) for x in cand}
    if re.fullmatch(r'[一二三四五六七八九十百千]+(時|人|分|つ|回|円|日|月|年|冊|本|枚|階|歳)',w.surface): continue
    if ('お'+w.surface) in jp or ('ご'+w.surface) in jp: continue
    if cand&(jp|kn|WL): continue
    if len(w.surface)>=2 and any(w.surface in x for x in jp|kn): continue
    unk.append(w.surface+('(gl)' if w.surface in gl or (f.orthBase or '') in gl else ''))
  cov=1-len(unk)/max(tot,1)
  # concept check
  wmap={}
  for i,d in enumerate(V):
    for w,k in d: wmap.setdefault(w,i+1)
  cerr=[]
  for q in b['qs']:
    assert len(q['o'])==4, b['id']
    for c in q['c']:
      if c.startswith('g:'):
        if int(c[2:])>A: cerr.append(c)
      elif c not in wmap: cerr.append(c+'?')
      elif wmap[c]>A: cerr.append(c+'>'+str(wmap[c]))
  flag='' if cov>=0.8 and not cerr else ' <<<'
  if flag: bad+=1
  print(f"{b['id']} after{A} {b['lv']} cov {cov:.0%} ({tot-len(unk)}/{tot}) unk:{' '.join(unk)} {('CERR '+' '.join(cerr)) if cerr else ''}{flag}")
print('BAD',bad)
