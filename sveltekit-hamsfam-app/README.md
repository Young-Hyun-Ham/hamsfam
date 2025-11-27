
## Creating a project
```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## sveltekit CLI 설치
```sh
┌  Welcome to the Svelte CLI! (v0.10.4)
│
◇  Which template would you like?
│  SvelteKit minimal
│
◇  Add type checking with TypeScript?
│  Yes, using TypeScript syntax
│
◇  What would you like to add to your project? (use arrow keys / space bar)
│  tailwindcss, sveltekit-adapter
│
◇  tailwindcss: Which plugins would you like to add?
│  typography, forms
│
◇  sveltekit-adapter: Which SvelteKit adapter would you like to use?
│  static
│
◆  Project created
│
◆  Successfully setup add-ons: tailwindcss, sveltekit-adapter
│
◇  Which package manager do you want to install dependencies with?
│  npm
│
│  npx sv create --template minimal --types ts --add tailwindcss="plugins:typography,forms" sveltekit-adapter="adapter:static" --install npm sveltekit-hamsfam-app
│
│
◆  Successfully installed dependencies with npm
│
◇  What's next? ───────────────────────────────╮
│                                              │
│  📁 Project steps                            │
│                                              │
│    1: cd sveltekit-hamsfam-app               │
│    2: npm run dev -- --open                  │
│                                              │
│  To close the dev server, hit Ctrl-C         │
│                                              │
│  Stuck? Visit us at https://svelte.dev/chat  │
│                                              │
├──────────────────────────────────────────────╯
│
└  You're all set!

- CAPACITOR 패키지 다운로드
  npm install @capacitor/core @capacitor/cli @capacitor/android
  # 추가로 설치한 패키지
	# "dependencies": {
	# 	"@capacitor-firebase/authentication": "^7.4.0",
	# 	"@capacitor/android": "^7.4.4",
	# 	"@capacitor/cli": "^7.4.4",
	# 	"@capacitor/core": "^7.4.4",
	# 	"@capacitor/ios": "^7.4.4",
	# 	"firebase": "^11.10.0"
	# }

- CAPACITOR 설치
  npx cap init [앱이름] [앱ID] * 앱ID는 회사 구분 ID 예)com.example.appname or com.appname.app

- CPAPCITOR 에 Android 개발환경 설치
  npx cap add android
- CPAPCITOR 에 iOS 개발환경 설치
  npx cap add ios

- sveltekit 빌드 + CAPACITOR SYNC 연결 그리고 안드로이드 스튜디오 실행
- sveltekit 빌드
  npm run build

- capacitor sync
  # 전체 플랫폼 싱크
  npx cap sync
  # 또는 Android만
  npx cap sync android
  # 또는 iOS만
  npx cap sync ios

- capacitor sync 는 build 폴더안의 내용을 android 폴더의 웹서버 폴더로 복사해줍니다.
- capacitor cli 로 안드로이드스튜디오 실행
  npx cap open android
```

# app에서 firebase 로그인 설정
1. firebase 콘솔 > 톱니바퀴 > 프로젝트 설정 > 일반 탭에서 아래에서 앱 추가 하여 안드로이드 선택 google-services.json 다운로드
2. android/app/ 폴더 안에 google-services.json 다운로드 받은 파일 추가
3. PS [workspace]\android> .\gradlew.bat :app:signingReport 실행
4. 콘솔에 나오는 SHA1 또는 SHA-256값을 복사해서 firebase 콘솔 > 톱니바퀴 > 프로젝트 설정 > 일반 > 추가한 안드로이드앱 하단에 디지털 지문 추가