#!/usr/bin/env python3
"""
섬기는이 사진 얼굴 위치 찾기
src/content/team/*.md 의 photo_url 사진마다 얼굴을 찾아
src/data/photo-faces.json 에 적습니다. 섬기는이 목록 · 프로필 옆 목록은
이 값을 보고 모든 사진의 얼굴이 칸 안 같은 자리 · 같은 크기에 오도록 맞춥니다.

- 사진 주소별로 적으므로, 마이페이지 등에서 새 사진을 올리면 그 사진은
  이 스크립트를 다시 돌릴 때까지 예전처럼(photo_position) 보입니다.
- 이미 적힌 사진은 그대로 두고 새 사진만 찾습니다. 전부 다시 찾으려면 --all.
- 잘못 찾은 사진은 JSON 에서 그 사진 항목을 지우거나 "skip": true 를 넣으면
  얼굴 맞춤 없이 예전처럼 보입니다.

준비(한 번):
  python3 -m venv .venv-faces && .venv-faces/bin/pip install opencv-python-headless numpy
사용법:
  .venv-faces/bin/python scripts/photo-faces.py [--all]
"""

import glob, json, os, re, sys, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'src', 'data', 'photo-faces.json')
MODEL_URL = 'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx'
MODEL = os.path.join(os.path.expanduser('~'), '.cache', 'wolko', 'face_detection_yunet_2023mar.onnx')
MIN_SCORE = 0.8      # 이보다 낮으면 손 · 옷 같은 오탐이 섞인다
MIN_REL_SIZE = 0.45  # 가장 큰 얼굴의 45% 보다 작은 얼굴은 뒤에 지나가는 사람으로 보고 뺀다


def main():
    import cv2
    if not os.path.exists(MODEL):
        os.makedirs(os.path.dirname(MODEL), exist_ok=True)
        print('얼굴 인식 모델 내려받는 중…')
        urllib.request.urlretrieve(MODEL_URL, MODEL)

    data = json.load(open(OUT)) if os.path.exists(OUT) else {}
    redo = '--all' in sys.argv
    for md in sorted(glob.glob(os.path.join(ROOT, 'src', 'content', 'team', '*.md'))):
        m = re.search(r'^photo_url:\s*["\']?([^"\'\n]+)', open(md, encoding='utf-8').read(), re.M)
        if not m:
            continue
        url = m.group(1).strip()
        if url in data and not redo:
            continue
        path = os.path.join(ROOT, 'public', url.lstrip('/'))
        img = cv2.imread(path) if os.path.exists(path) else None
        if img is None:
            print(f'  {url}: 파일을 열 수 없어 건너뜀')
            continue
        H, W = img.shape[:2]
        s = min(1.0, 1280 / max(W, H))
        small = cv2.resize(img, (round(W * s), round(H * s))) if s < 1 else img
        det = cv2.FaceDetectorYN.create(MODEL, '', (small.shape[1], small.shape[0]), 0.6, 0.3, 5000)
        _, found = det.detect(small)
        faces = [] if found is None else [
            [float(r[0]) / s / W, float(r[1]) / s / H, float(r[2]) / s / W, float(r[3]) / s / H]
            for r in found if float(r[14]) >= MIN_SCORE]
        if faces:
            big = max(f[3] for f in faces)
            faces = [f for f in faces if f[3] >= big * MIN_REL_SIZE]
        data[url] = {'w': W, 'h': H, 'faces': [[round(v, 4) for v in f] for f in faces]}
        print(f'  {os.path.basename(md)[:-3]}: 얼굴 {len(faces)}개')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:  # 사진 한 장에 한 줄
        rows = [f' {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in sorted(data.items())]
        f.write('{\n' + ',\n'.join(rows) + '\n}\n')
    print(f'→ {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()
