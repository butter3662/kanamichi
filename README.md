# かなみち — 일본어 한 걸음씩

듀오링고 방식의 일본어 입문(JLPT N5 수준) 학습 웹앱.

- **Day 1~20**: 하루 단어 25개(5개씩 레슨 5개) + 문법 1개 + 생활 표현 4개 + 복습
- **문자 탭**: 히라가나·가타카나 레슨과 문자표
- XP, 연속 학습일, 하트, 약점 연습, 단어장
- 발음은 기기의 일본어 음성(Web Speech API)을 사용

## 구조

| 파일 | 내용 |
|---|---|
| `src/data.js` | 학습 데이터 (Day별 단어·문법·표현, 가나 표) |
| `src/app.js` | 레슨 엔진·화면 |
| `src/style.css` | 스타일 |
| `src/account.js` | 로그인·회원가입·기록 동기화 (Supabase) |
| `supabase/kanamichi.sql` | 서버 표·보안 정책 |
| `icons/`, `manifest.webmanifest` | 홈 화면 앱 아이콘·설정 |
| `audio/` | 발음 음성 파일 (Actions가 만든다) |
| `tools/list_say.js`, `tools/make_audio.py` | 녹음할 문장 목록 만들기, VOICEVOX로 녹음 |
| `build.py` | `src/`를 합쳐 `index.html` 한 파일로 만든다 |
| `index.html` | 배포용 결과물 (직접 수정하지 말고 `python3 build.py`로 생성) |

### 데이터 표기 규칙

- 후리가나: `学生[がくせい]`, `食[た]べる`
- 단어 한 줄: `표기|뜻|메모|로마자(자동 변환을 덮어쓸 때만)`
- 예문·표현 한 줄: `토큰 토큰 토큰|한국어 타일 타일` (공백이 타일 구분)

## 계정 (Supabase)

MAGI·SEED 10K와 같은 Supabase 프로젝트를 쓴다. 같은 이메일·비밀번호로 로그인할 수 있다.

- 처음 한 번: Supabase 대시보드 → SQL Editor에서 `supabase/kanamichi.sql`을 실행해 `kanamichi_progress` 표를 만든다.
- 로그인하면 학습 기록이 계정에 저장되고, 기기 사이에서 합쳐진다(완료한 레슨·XP·일별 기록은 잃지 않게 병합).
- 로그인 없이 쓰면 기록은 그 브라우저에만 저장되며, 나중에 로그인할 때 계정으로 가져올 수 있다.

## 발음 음성 (VOICEVOX)

단어·표현·예문·가나의 발음은 미리 녹음한 파일(`audio/<해시>.mp3`, 목록 `audio/index.json`)로 재생한다.
`src/data.js`가 바뀌어 main에 올라오면 GitHub Actions(`.github/workflows/audio.yml`)가 VOICEVOX 엔진으로 새 문장만 녹음해 커밋한다.
파일이 없는 문장은 기기의 음성 합성으로 대신 읽는다.

음성: VOICEVOX:冥鳴ひまり

## 아이폰 홈 화면 앱

Safari에서 사이트를 열고 공유 버튼 → **홈 화면에 추가**. 아이콘(`icons/`)과 `manifest.webmanifest`로 주소창 없는 전체 화면 앱처럼 열린다.
