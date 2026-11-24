# 굽고 난 src/bonus.js의 실전 문제(BONUS)에서 읽기가 빠진 한자에 형태소 분석(fugashi, unidic-lite)으로 읽기를 단다.
# --check: 이미 달린 읽기 중 형태소 분석 결과와 다른 것을 보여 준다(검토용).
import json,re,sys,os,fugashi
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
P=os.path.join(R,'src','bonus.js')
T=fugashi.Tagger()
KJ='[㐀-鿿々〆ヶ]'
toH=lambda s:''.join(chr(ord(c)-0x60) if 'ァ'<=c<='ヶ' else c for c in s)
OVR=json.load(open(os.path.join(R,'tools','stages','rd_fix.json'))) if os.path.exists(os.path.join(R,'tools','stages','rd_fix.json')) else {}
def seg_readings(plain):
  """plain 안 각 글자 위치 → (토큰 시작, 토큰 끝, 토큰 표면, 토큰 읽기)"""
  out=[]; pos=0
  for w in T(plain):
    s=w.surface; i=plain.find(s,pos)
    if i<0: continue
    k=w.feature.kana or ''
    out.append((i,i+len(s),s,toH(k))); pos=i+len(s)
  return out
def align(surf,rd):
  """surf의 한자 덩어리마다 읽기. 실패하면 None"""
  parts=re.split('('+KJ+'+)',surf); pat=''
  for j,p in enumerate(parts):
    pat+='(.+?)' if j%2 else re.escape(toH(p))
  m=re.fullmatch(pat,rd)
  if not m: return None
  res=[]; g=1; off=0
  for j,p in enumerate(parts):
    if j%2: res.append((off,off+len(p),m.group(g))); g+=1
    off+=len(p)
  return res
def reading_of(plain,a,b,segs):
  """plain[a:b](한자 덩어리)의 읽기"""
  key=plain[a:b]
  if key in OVR: return OVR[key]
  rd=''
  for (i,j,s,k) in segs:
    if j<=a or i>=b: continue
    al=align(s,k)
    if al is None:
      if i>=a and j<=b and re.fullmatch(KJ+'+',s): rd+=k; continue
      return None
    for (x,y,r) in al:
      X,Y=i+x,i+y
      if Y<=a or X>=b: continue
      if X<a or Y>b: return None
      rd+=r
  return rd or None
SIMPLE={'百':'ひゃく','千':'せん','万':'まん','十':'じゅう','二':'に','三':'さん','四':'よん','五':'ご','六':'ろく','七':'なな','九':'きゅう'}
NUM=set('〇一二三四五六七八九十百千万')
def fix_rd(r): return r.replace('にっぽん','にほん').replace('ようひ','ようび') if r else r
def fill(s,ctx,report):
  if not s or not re.search(KJ,s): return s
  # 漢字[かな] / 맨 한자 / ZWSP(읽기를 못 단 글자 표시) / 그 밖
  pieces=[]
  for t in re.split('('+KJ+'+(?:\\[[^\\]]+\\])?|​)',s):
    if not t: continue
    if t=='​': continue
    m=re.fullmatch('('+KJ+'+)(?:\\[([^\\]]+)\\])?',t)
    if m: pieces.append([m.group(1),m.group(2)])
    else: pieces.append([t,False])
  # 붙어 있는 한자 조각 묶기: 읽기 없는 조각이나 한 글자 조각이 섞여 있고 숫자가 없으면 통째로 다시 읽는다
  groups=[]
  for p in pieces:
    if p[1] is not False and groups and groups[-1][-1][1] is not False: groups[-1].append(p)
    else: groups.append([p])
  plain=''.join(p[0] for p in pieces); segs=seg_readings(plain); res=''; pos=0
  for g in groups:
    if g[0][1] is False: res+=g[0][0]; pos+=len(g[0][0]); continue
    run=''.join(p[0] for p in g); a=pos; b=pos+len(run); pos=b
    weak=any(p[1] is None or len(p[0])==1 for p in g)
    if len(g)>1 and weak and not (set(run)&NUM):
      fr=fix_rd(reading_of(plain,a,b,segs))
      if fr: res+=run+'['+fr+']'; continue
    q=a
    for (txt,rd) in g:
      fr=fix_rd(reading_of(plain,q,q+len(txt),segs)); ctxs=plain[max(0,q-5):q+len(txt)+5]; q+=len(txt)
      if txt in OVR: res+=txt+'['+OVR[txt]+']'; continue
      if rd is None:
        if fr and not (set(txt)&NUM): res+=txt+'['+fr+']'
        elif txt in SIMPLE: res+=txt+'['+SIMPLE[txt]+']'
        elif txt=='八' and plain[q:q+1] in ('人','日','月','時'): res+=txt+'[はち]'
        elif txt=='八' and plain[q:q+1] in ('歳','回','分'): res+=txt+'[はっ]'
        elif txt=='一' and plain[q:q+1] in ('枚','割','度','位'): res+=txt+'[いち]'
        else: res+=txt+('​' if len(g)>1 else ''); report.append(('MISS',ctx,txt,ctxs))
      else:
        if fr and fr!=rd: report.append(('DIFF',ctx,txt+'['+rd+']≠'+fr,ctxs))
        res+=txt+'['+rd+']'
  return res
src=open(P,encoding='utf8').read()
m=re.search(r'const BONUS=(.*?);\nconst MOCK=',src,re.S)
B=json.loads(m.group(1)); rep=[]
for b in B:
  for S in [b]+b.get('more',[]):
    for f in ('title','text'): S[f]=fill(S.get(f),b['id'],rep)
    S['gloss']=[[fill(w,b['id'],rep),mm] for w,mm in S.get('gloss',[])]
    for q in S['qs']:
      q['q']=fill(q['q'],b['id'],rep); q['o']=[fill(o,b['id'],rep) for o in q['o']]
if '--check' in sys.argv or '-v' in sys.argv:
  lo=int(sys.argv[-2]) if len(sys.argv)>3 else 0; hi=int(sys.argv[-1]) if len(sys.argv)>3 else 999
  seen=set()
  for k,ctx,a,c in rep:
    after=int(ctx[1:]) 
    if not(lo<=after<=hi): continue
    if (k,a) in seen: continue
    seen.add((k,a)); print(k,ctx,a,'«'+c.replace('\n',' ')+'»')
new=src[:m.start(1)]+json.dumps(B,ensure_ascii=False,separators=(',',':')).replace('},{"id"','},\n{"id"')+src[m.end(1):]
open(P,'w',encoding='utf8').write(new)
