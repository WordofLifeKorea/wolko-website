// 섬기는이 사진 맞춤 — scripts/photo-faces.py 가 찾아 둔 얼굴 위치를 보고
// 어떤 사진이든 얼굴이 칸 안 같은 높이 · 같은 크기에 오도록 사진을 키우고 옮긴다.
// 얼굴 자료가 없는 사진(새로 올린 사진 등)은 예전처럼 photo_position 만 쓴다.
import FACES from '../data/photo-faces.json';

// face: 얼굴 높이가 칸 높이에서 차지하는 몫 · eye: 얼굴 한가운데가 칸 위에서 오는 자리
// groupEye: 여러 사람일 때 얼굴들 한가운데 자리(조금 내려서 왼쪽 위 배지에 얼굴이 가리지 않게)
// padX / padY: 여러 사람일 때 얼굴들이 칸 폭 · 높이에서 넘지 않을 몫(가장자리 사람이 잘리지 않게)
const LOOKS = {
  card: { face: 0.27, eye: 0.36, groupEye: 0.5, padX: 0.84, padY: 0.6 },
  avatar: { face: 0.5, eye: 0.47, groupEye: 0.5, padX: 0.92, padY: 0.8 },
};

const pct = (v) => `${(v * 100).toFixed(2)}%`;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

function facesOf(url) {
  const info = url && FACES[url];
  if (!info || info.skip || !info.faces || !info.faces.length) return null;
  const R = info.w / info.h; // 사진 폭 ÷ 높이. 아래 계산은 모두 '사진 높이 = 1' 단위
  const boxes = info.faces.map(([x, y, w, h]) => ({ x0: x * R, x1: (x + w) * R, y0: y, y1: y + h, h }));
  return {
    R,
    x0: Math.min(...boxes.map((b) => b.x0)), x1: Math.max(...boxes.map((b) => b.x1)),
    y0: Math.min(...boxes.map((b) => b.y0)), y1: Math.max(...boxes.map((b) => b.y1)),
    h: boxes.reduce((s, b) => s + b.h, 0) / boxes.length,
    n: boxes.length,
  };
}

/**
 * 칸(가로 ÷ 세로 = aspect)을 꽉 채우는 <img> 의 style.
 * 칸은 position: relative + overflow: hidden, img 는 position: absolute 여야 한다.
 */
export function photoFrame(url, aspect, look = 'card', fallbackPos) {
  const g = facesOf(url);
  if (!g) return fallbackPos ? `object-position: ${fallbackPos}` : undefined;
  const L = LOOKS[look] || LOOKS.card;
  // 잘라 낼 높이: 얼굴 크기를 맞추되, 여러 사람이면 모두 들어오게 넓히고, 사진 밖으로는 못 나간다
  let ch = Math.max(g.h / L.face, (g.x1 - g.x0) / (aspect * L.padX), (g.y1 - g.y0) / L.padY);
  ch = Math.min(ch, 1, g.R / aspect);
  const cw = ch * aspect;
  const left = clamp((g.x0 + g.x1) / 2 - cw / 2, 0, g.R - cw);
  const top = clamp((g.y0 + g.y1) / 2 - (g.n > 1 ? L.groupEye : L.eye) * ch, 0, 1 - ch);
  // transform-origin: 마우스를 올려 사진을 살짝 키울 때 칸 한가운데를 기준으로 커지게
  return `inset: auto; left: ${pct(-left / cw)}; top: ${pct(-top / ch)}; width: ${pct(g.R / cw)}; height: ${pct(1 / ch)}; object-fit: fill; `
    + `transform-origin: ${pct((left + cw / 2) / g.R)} ${pct(top + ch / 2)};`;
}

/** 칸 크기가 정해져 있지 않을 때(object-fit: cover 그대로) 얼굴들 한가운데를 보이게 하는 object-position */
export function photoFocus(url, fallbackPos) {
  const g = facesOf(url);
  if (!g) return fallbackPos ? `object-position: ${fallbackPos}` : undefined;
  return `object-position: ${pct((g.x0 + g.x1) / 2 / g.R)} ${pct((g.y0 + g.y1) / 2)};`;
}
