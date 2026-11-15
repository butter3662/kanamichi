"""VOICEVOX 엔진으로 발음 음성 파일(audio/<해시>.mp3)과 목록(audio/index.json)을 만든다.

사용: python3 tools/make_audio.py say.json
  say.json  — tools/list_say.js 의 출력 [{h, say, text}]
환경 변수
  VOICEVOX_URL   엔진 주소 (기본 http://localhost:50021)
  SPEAKER_NAME   화자 이름 (기본 冥鳴ひまり)
  STYLE_NAME     스타일 이름 (기본 ノーマル)
  SPEED          말 빠르기 (기본 0.92)

이미 같은 화자·설정으로 만든 파일은 건너뛴다. 목록에 없는 오래된 파일은 지운다.
읽기 확인: 한자가 섞인 글은 엔진이 읽은 소리를 앱 데이터의 읽기와 비교하고, 다르면 가나로 다시 만든다.
"""
import json, os, subprocess, sys, time, urllib.parse, urllib.request

BASE = os.environ.get('VOICEVOX_URL', 'http://localhost:50021')
SPEAKER = os.environ.get('SPEAKER_NAME', '冥鳴ひまり')
STYLE = os.environ.get('STYLE_NAME', 'ノーマル')
SPEED = float(os.environ.get('SPEED', '0.92'))
OUT = os.path.join(os.path.dirname(__file__), '..', 'audio')
SETTINGS = f'{SPEAKER}/{STYLE}/{SPEED}/v1'


def req(method, path, params=None, body=None, raw=False, timeout=120):
    url = BASE + path + ('?' + urllib.parse.urlencode(params) if params else '')
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'} if data else {})
    with urllib.request.urlopen(r, timeout=timeout) as f:
        b = f.read()
    return b if raw else json.loads(b)


def wait_engine():
    for _ in range(120):
        try:
            v = req('GET', '/version')
            print('VOICEVOX engine', v, flush=True)
            return
        except Exception:
            time.sleep(3)
    sys.exit('엔진이 응답하지 않습니다')


def find_speaker():
    sp = req('GET', '/speakers')
    for s in sp:
        if s['name'] == SPEAKER:
            for st in s['styles']:
                if st['name'] == STYLE:
                    return st['id']
            return s['styles'][0]['id']
    names = ', '.join(s['name'] for s in sp)
    sys.exit(f'화자 {SPEAKER} 없음. 사용 가능: {names}')


# ---- 읽기 비교 (가타카나, 장음·조사 차이는 같은 것으로 본다) ----
VOWEL = {}
for row, v in [('アカサタナハマヤラワガザダバパャァ', 'ア'), ('イキシチニヒミリギジヂビピィ', 'イ'),
               ('ウクスツヌフムユルグズヅブプュゥヴ', 'ウ'), ('エケセテネヘメレゲゼデベペェ', 'エ'),
               ('オコソトノホモヨロヲゴゾドボポョォ', 'オ')]:
    for c in row:
        VOWEL[c] = v


def kata(s):
    return ''.join(chr(ord(c) + 0x60) if 0x3041 <= ord(c) <= 0x3096 else c for c in s)


def norm(s):
    s = kata(s)
    s = ''.join(c for c in s if 0x30A1 <= ord(c) <= 0x30FA or c == 'ー')
    out = []
    for c in s:
        if c == 'ー' and out:
            c = VOWEL.get(out[-1], out[-1])
        out.append(c)
    s = ''.join(out)
    res = []
    for i, c in enumerate(s):  # オウ→オオ, エイ→エエ (장음으로 읽히는 표기)
        p = res[-1] if res else ''
        if c == 'ウ' and VOWEL.get(p) == 'オ':
            c = 'オ'
        elif c == 'イ' and VOWEL.get(p) == 'エ':
            c = 'エ'
        res.append(c)
    s = ''.join(res)
    return s.replace('ワ', 'ハ').replace('エ', 'ヘ').replace('ヲ', 'オ').replace('ヅ', 'ズ').replace('ヂ', 'ジ')


def reading(q):
    return ''.join(m['text'] for ap in q['accent_phrases'] for m in ap['moras'])


def synth(text, say, spk):
    q = req('POST', '/audio_query', {'text': text, 'speaker': spk})
    if text != say and norm(reading(q)) != norm(say):
        print(f'  읽기 다름: {text} → {reading(q)} (기대 {say}) → 가나로 다시', flush=True)
        q = req('POST', '/audio_query', {'text': say, 'speaker': spk})
    q['speedScale'] = SPEED
    q['prePhonemeLength'] = 0.08
    q['postPhonemeLength'] = 0.12
    q['outputSamplingRate'] = 24000
    q['outputStereo'] = False
    return req('POST', '/synthesis', {'speaker': spk}, body=q, raw=True)


def main():
    items = json.load(open(sys.argv[1], encoding='utf-8'))
    os.makedirs(OUT, exist_ok=True)
    idx_path = os.path.join(OUT, 'index.json')
    old = {}
    if os.path.exists(idx_path):
        try:
            old = json.load(open(idx_path, encoding='utf-8'))
        except Exception:
            old = {}
    same = old.get('settings') == SETTINGS
    done = old.get('files', {}) if same else {}
    wait_engine()
    spk = find_speaker()
    print(f'화자 {SPEAKER}/{STYLE} (id {spk}), 항목 {len(items)}개', flush=True)
    files = {}
    made = 0
    for n, it in enumerate(items, 1):
        h, say, text = it['h'], it['say'], it['text']
        mp3 = os.path.join(OUT, h + '.mp3')
        if done.get(h) == text and os.path.exists(mp3):
            files[h] = text
            continue
        try:
            wav = synth(text, say, spk)
        except Exception as e:
            print(f'  실패 {say}: {e}', flush=True)
            continue
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'pipe:0', '-ac', '1', '-codec:a', 'libmp3lame', '-q:a', '5', mp3],
                       input=wav, check=True)
        files[h] = text
        made += 1
        if made % 50 == 0:
            print(f'  {n}/{len(items)}', flush=True)
    keep = set(files)
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f[:-4] not in keep:
            os.remove(os.path.join(OUT, f))
    json.dump({'voice': f'VOICEVOX:{SPEAKER}', 'settings': SETTINGS, 'files': dict(sorted(files.items()))},
              open(idx_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'새로 만든 파일 {made}개, 전체 {len(files)}개', flush=True)


if __name__ == '__main__':
    main()
