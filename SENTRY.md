# Sentry 운영 모니터링

Next.js/Vercel과 ADK Worker/Cloud Run은 같은 Sentry 조직의 서로 다른
프로젝트를 사용한다. 두 런타임 모두 Production에서만 활성화하며 오류는
100%, 트레이싱은 5% 수집한다.

## Vercel Production 환경 변수

- `NEXT_PUBLIC_SENTRY_ENABLED=true`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

Preview와 Development에는 위 값을 설정하지 않는다. `SENTRY_AUTH_TOKEN`은
릴리스와 소스맵 업로드에 필요한 최소 권한만 부여하고 Vercel 환경 변수에만
저장한다. 소스맵 업로드는 `VERCEL_ENV=production` 빌드에서만 실행되며,
업로드가 끝난 소스맵은 배포 산출물에서 제거된다.

## Cloud Run 환경 변수

- `SENTRY_ENABLED=true`
- `SENTRY_DSN`: `chicken-stock-adk-worker` 프로젝트 DSN
- `SENTRY_ENVIRONMENT=production`

Cloud Run이 제공하는 `K_REVISION`을 Worker release로 사용한다. Worker는
`SENTRY_ENABLED`, `SENTRY_ENVIRONMENT`, `SENTRY_DSN`이 모두 유효할 때만
초기화된다.

## 개인정보 설정

- 두 Sentry 프로젝트에서 IP 주소 저장을 끈다.
- SDK는 사용자 정보, 요청 본문, query string, Cookie/Authorization 헤더,
  로컬 변수, console/log breadcrumb 및 임의 `extra` 값을 제거한다.
- 서버의 처리된 5xx와 백그라운드 실패에는 고정된 `component`, `operation`,
  `kind` 태그만 추가한다.
- Worker 부분 실패는 요청당 최대 한 이벤트만 만들고 10% 샘플링한다.

## 알림과 Uptime

각 프로젝트에서 Production의 첫 발생, 재발, 회귀 이슈를 이메일로
알리고 동일 이슈 알림 간격은 30분으로 제한한다.

무료 플랜의 Uptime Monitor 한 개는 다음과 같이 설정한다.

- URL: `https://www.chicken-stock.com/api`
- 주기: 5분
- 성공 조건: HTTP 200 및 JSON `$.ok == true`
- 알림: 실패와 복구 시 이메일

## 검증과 중단

배포 후 브라우저와 Next.js 서버 오류를 각각 한 번 발생시켜 Production
환경, release, 원본 TypeScript 파일/줄 번호를 확인한다. Worker는 인증된
잘못된 요청으로 미처리 예외를 한 번 확인한 뒤 `/health`가 다시 200을
반환하는지 점검한다. 이벤트에 이메일, IP, Cookie, Authorization, 요청
본문이 없는지도 두 프로젝트에서 확인한다.

장애나 예상 밖 사용량이 발생하면 Vercel의
`NEXT_PUBLIC_SENTRY_ENABLED=false` 또는 Cloud Run의
`SENTRY_ENABLED=false`로 바꾸고 해당 런타임을 재배포한다.
