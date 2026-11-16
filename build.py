import pathlib
root=pathlib.Path(__file__).parent
d=root/'src'
html=f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>かなみち — 일본어 한 걸음씩</title>
<meta name="description" content="하루 25단어로 시작하는 일본어 학습. 단어·문법·생활 표현, XP와 연속 학습일.">
<meta name="theme-color" content="#FAF6EE">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="かなみち">
<meta name="format-detection" content="telephone=no">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Zen+Maru+Gothic:wght@500;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<style>
{(d/'style.css').read_text()}
</style>
</head>
<body>
<div id="app"></div>
<div id="modal"></div>
<script>
{(d/'curriculum.js').read_text()}
{(d/'data.js').read_text()}
{''.join(f.read_text() for f in sorted((d/'days').glob('*.js')))}
{(d/'bonus.js').read_text()}
{(d/'app.js').read_text()}
{(d/'account.js').read_text()}
</script>
</body>
</html>
'''
(root/'index.html').write_text(html)
print(len(html))
