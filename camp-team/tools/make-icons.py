# 「홈 화면에 추가」용 아이콘 PNG 만들기 — 포털 아이콘(public/images/portal-icon.svg)과 같은 그림: 파란 둥근 바탕 위에 동그라미 W 로고.
#   python3 camp-team/tools/make-icons.py   →  public/portal/campteam/icons/ 에 192·512·maskable·apple-touch 아이콘을 쓴다 (이미 만들어 둔 파일이 있어 평소에는 돌릴 일 없음, Pillow 필요)
# 로고는 원본 파일(public/images/WOLKO Circle.png)을 그대로 넣는다 — 저작권 문제로 로고 모양은 절대 다시 그리거나 다듬지 않는다.
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/portal/campteam/icons'
LOGO = Image.open(ROOT / 'public/images/WOLKO Circle.png').convert('RGBA')
S = 1024  # 512 그림을 두 배로 그린 뒤 줄인다


def tile(rounded):
    # 바탕: 왼쪽 위 #08799a → 오른쪽 아래 #003d52 (portal-icon.svg 와 같은 방향의 그러데이션)
    c1, c2 = (0x08, 0x79, 0x9a), (0x00, 0x3d, 0x52)
    x1, y1, x2, y2 = 72 * 2, 48 * 2, 448 * 2, 472 * 2
    dx, dy = x2 - x1, y2 - y1
    l2 = dx * dx + dy * dy
    bg = Image.new('RGBA', (S, S))
    px = bg.load()
    for y in range(S):
        for x in range(S):
            t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / l2))
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(c1, c2)) + (255,)
    if rounded:
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=112 * 2, fill=255)
        bg.putalpha(mask)
    d = 348 * 2
    bg.alpha_composite(LOGO.resize((d, d), Image.LANCZOS), (82 * 2, 82 * 2))
    return bg


OUT.mkdir(parents=True, exist_ok=True)
for name, size, rounded in [('icon-192.png', 192, True), ('icon-512.png', 512, True), ('icon-maskable-512.png', 512, False), ('apple-touch-icon.png', 180, False)]:
    tile(rounded).resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
    print('wrote', name)
