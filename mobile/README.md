# WOLKO 포탈 앱 (아이폰·안드로이드)

`https://wolko.org/portal/` 화면을 그대로 띄우는 앱 껍데기예요(Capacitor 8).
화면과 기능은 웹사이트 코드가 그대로 쓰여서, 사이트를 고치면 앱도 스토어 재심사 없이 바로 바뀌어요.
앱을 다시 내야 하는 건 앱 아이콘·이름·알림 같은 **앱 자체**를 바꿀 때뿐이에요.

| 항목 | 값 |
| --- | --- |
| 앱 아이디 | `org.wolko.portal` |
| 앱 이름 | WOLKO |
| 처음 여는 주소 | `https://wolko.org/portal/` (`capacitor.config.json` 의 `server.url`) |
| 인터넷이 없을 때 | `www/offline.html` |
| 앱에서 열렸는지 알아보기 | 브라우저 정보 끝에 `WOLKOApp/1.0` 이 붙음, `window.Capacitor.isNativePlatform()` |

wolko.org 안의 주소는 앱 안에서 열리고, 다른 사이트(구글 문서, 설문지 등)는 휴대폰 브라우저로 열려요.

## 앱 도우미 (내려받기·인쇄·새 창·공유)

앱 화면은 웹 브라우저와 달라서 내려받기·인쇄·새 창이 그대로는 안 돼요. 그래서 두 부분으로 나눠 맡겨요.

- **사이트의 `public/wolko-app.js`**: 실제 동작을 맡아요. 앱 안에서만 움직이고 웹 브라우저에서는 아무 일도 하지 않아요. **고칠 때는 이 파일만 고치면 앱을 다시 낼 필요가 없어요.**
  - 내려받기 → 휴대폰 공유·저장 창 / 같은 사이트 새 창 → 앱 안에서 이동 / 다른 사이트 → 휴대폰 브라우저 / 인쇄 → 휴대폰 인쇄 창 / 공유 대체
- **앱의 WolkoApp 도우미** (`android/.../WolkoAppPlugin.java`, `ios/App/App/WolkoApp.swift`): 모든 wolko.org 페이지에 위 파일을 불러 넣고, 인쇄 창을 띄워요.
- **안드로이드 `WolkoChromeClient.java`**: 사진 칸(경비 영수증 등)에서 카메라로 찍기와 사진·파일 고르기를 한 창에서 고르게 해요.

## 아이콘·시작 화면 바꾸기

`assets/` 의 그림(아이콘 1024×1024, 시작 화면 2732×2732)을 바꾼 뒤:

```bash
npm run icons
```

원본은 `public/images/portal-icon.svg` 예요.

## 안드로이드 만들기

필요한 것: 자바 21, 안드로이드 도구(이 맥에는 설치돼 있어요).

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
npx cap sync android
cd android && ./gradlew assembleDebug
```

만들어진 파일: `android/app/build/outputs/apk/debug/app-debug.apk`

## 아이폰 만들기

필요한 것: Xcode 26 이상(맥 앱스토어), 애플 개발자 계정.

```bash
npx cap sync ios
npx cap open ios
```

## 계정 준비

[계정-준비-안내.md](계정-준비-안내.md) 를 보세요.
