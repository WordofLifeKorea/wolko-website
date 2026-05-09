#!/usr/bin/env python3
"""
HDR / Wide-gamut → sRGB 변환 스크립트
public/images/uploads/ 안의 모든 JPG/JPEG/PNG 이미지를
sRGB 색공간으로 변환합니다.

사용법:
  python3 scripts/convert-to-srgb.py
"""

from PIL import Image, ImageCms
import os, io, sys

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'images', 'uploads')
SRGB_PROFILE = ImageCms.createProfile('sRGB')

def convert_image(path):
    filename = os.path.basename(path)
    ext = os.path.splitext(path)[1].lower()
    try:
        img = Image.open(path)
        icc_data = img.info.get('icc_profile')

        if icc_data:
            src_profile = ImageCms.getOpenProfile(io.BytesIO(icc_data))
            src_name = ImageCms.getProfileDescription(src_profile).strip()
            # 이미 sRGB면 스킵
            if 'sRGB' in src_name or 'srgb' in src_name.lower():
                print(f'  ⏭  {filename} — 이미 sRGB, 건너뜀')
                return

            # sRGB로 변환
            if img.mode in ('RGBA',):
                rgb = img.convert('RGB')
                converted = ImageCms.profileToProfile(
                    rgb, src_profile, SRGB_PROFILE, outputMode='RGB'
                )
                r, g, b = converted.split()
                _, _, _, a = img.split()
                img = Image.merge('RGBA', (r, g, b, a))
            else:
                img = img.convert('RGB')
                img = ImageCms.profileToProfile(
                    img, src_profile, SRGB_PROFILE, outputMode='RGB'
                )

            print(f'  ✅ {filename} — {src_name} → sRGB 변환 완료')

        else:
            # ICC 프로파일 없는 경우: 그냥 재저장 (EXIF HDR 메타데이터 제거 효과)
            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGB')
            print(f'  🔄 {filename} — ICC 없음, sRGB로 재저장')

        # 저장 (원본 덮어쓰기)
        srgb_icc = ImageCms.ImageCmsProfile(SRGB_PROFILE).tobytes()
        if ext in ('.jpg', '.jpeg'):
            img = img.convert('RGB')
            img.save(path, 'JPEG', quality=92, optimize=True, icc_profile=srgb_icc)
        elif ext == '.png':
            img.save(path, 'PNG', optimize=True, icc_profile=srgb_icc)

    except Exception as e:
        print(f'  ❌ {filename} — 오류: {e}')

def main():
    uploads = os.path.abspath(UPLOADS_DIR)
    if not os.path.isdir(uploads):
        print(f'폴더를 찾을 수 없습니다: {uploads}')
        sys.exit(1)

    files = [f for f in sorted(os.listdir(uploads))
             if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    print(f'📁 {uploads}')
    print(f'📸 총 {len(files)}개 이미지 처리 중...\n')

    for f in files:
        convert_image(os.path.join(uploads, f))

    print('\n✨ 완료! git add public/images/uploads/ 후 push 해주세요.')

if __name__ == '__main__':
    main()
