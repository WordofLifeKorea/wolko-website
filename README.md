# wolko-website

WOLKO 월코 — Word of Life Korea (워드 오브 라이프 코리아) 공식 웹사이트입니다.
[wolko.org](https://wolko.org) 에 배포됩니다.

## 소개

선교 단체 WOLKO의 사역을 소개하고, 캠프 일정·선교 리포트·팀 멤버 정보를
제공하는 웹사이트입니다.

## 기술 스택

- [Astro](https://astro.build/) `^4.16.0`
- 콘텐츠 컬렉션(JSON / Markdown) 기반 데이터 관리

## 프로젝트 구조

```
src/
  layouts/                레이아웃 컴포넌트
  pages/                  페이지 (index, about, wolkoadmin)
  styles/                 전역 스타일
  content/
    camp_schedules/       캠프 일정 (JSON)
    mission_report/       분기별 선교 뉴스레터 (JSON)
    team/                 팀 멤버 프로필 (Markdown)
images/ · public/         정적 자산
```

## 개발

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

## 배포

```bash
npm run push     # 변경사항 커밋 후 origin main 으로 push
```
