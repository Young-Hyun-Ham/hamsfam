# 프런트 빌드
npm run build

# 기존 ios 폴더 백업 또는 제거
rm -rf ios

# iOS 플랫폼 새로 추가 (Podfile 생성됨)
npx @capacitor/cli@latest add ios

# 동기화
npx @capacitor/cli@latest sync ios

# Xcode실행
open > [project root] > ios > App
