## 1. 안드로이드 SDK 설치
1️⃣ https://developer.android.com/studio
 → Windows Installer 다운로드
2️⃣ 실행 → “Next → Next → Finish” (기본 경로 그대로)
3️⃣ 실행 후 More Actions → SDK Manager
  - 첫 화면 오른쪽 상단에 보이는 ⋯ (세로 점 3개) 버튼 클릭
  - 메뉴가 뜨면 거기에서 “SDK Manager” 선택
  - SDK Location 탭 → SDK 경로 확인
  - SDK Tools 탭 → 하단 Show Package Details 체크
  - 목록에서 Android SDK Command-line Tools (latest) 체크
  - Apply → OK
  - sdkmanager --version 버전 나오면 성공!

설치 경로 확인 (기본)
C:\Users\<사용자명>\AppData\Local\Android\Sdk

## 2. 환경변수 설정
시스템 속성 → 고급 → 환경 변수
새 시스템 변수 추가
변수 이름: ANDROID_HOME
변수 값: C:\Users\<사용자명>\AppData\Local\Android\Sdk

1️⃣ Path 편집 → 다음 경로 추가
``` bash
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\cmdline-tools\latest\bin
```
2️⃣ PowerShell 재시작 후 확인
``` bash
adb --version
sdkmanager --version
```
3️⃣ 라이선스 수락
```bash
sdkmanager --licenses
```

## 3. 필수 SDK 패키지 설치
```bash
sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-35" "build-tools;35.0.0"

# 에뮬레이터용 시스템 이미지 설치
sdkmanager "system-images;android-34;google_apis;x86_64"
```

## 4. AVD(가상 기기) 생성
```bash
avdmanager create avd -n Pixel_7_API_34 `
  -k "system-images;android-34;google_apis;x86_64" -d pixel_7

# 이미 같은 이름의 AVD가 있다면 -n 이름을 바꾸세요(예: Pixel_8_API_34).
```

## 5. 에뮬레이터 실행
emulator -avd Pixel_7_API_34