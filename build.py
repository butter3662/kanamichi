import pathlib
root=pathlib.Path(__file__).parent
d=root/'src'
html=f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>かなみち — 일본어 한 걸음씩</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Zen+Maru+Gothic:wght@500;700&display=swap" rel="stylesheet">
<style>
{(d/'style.css').read_text()}
</style>
</head>
<body>
<div id="app"></div>
<div id="modal"></div>
<script>
{(d/'data.js').read_text()}
{(d/'app.js').read_text()}
</script>
</body>
</html>
'''
(root/'index.html').write_text(html)
print(len(html))
