# Vercel 서울 리전 Preview 검증 설계

## 목적

Vercel Functions가 Washington D.C.(`iad1`)에서 실행되고 Supabase PostgreSQL이 서울(`ap-northeast-2`)에 있는 것으로 관측된 지역 불일치를 제거했을 때, 종목 주문 화면과 관련 API 응답 시간이 실제로 개선되는지 Preview 배포에서 검증한다.

이번 단계는 서버 실행 지역만 변경한다. 화면 구조, 스타일, 문구, 인증 계약, API 응답 형식은 변경하지 않는다.

## 확인된 원인

- 운영 응답의 `x-vercel-id`는 서울 요청이 `iad1` 함수에서 실행됨을 나타냈다.
- 현재 `vercel.json`에는 함수 지역 설정이 없다. Vercel Node.js Functions는 별도 설정이 없으면 `iad1`을 기본으로 사용한다.
- 로컬에서 연결된 `DATABASE_URL`의 호스트는 서울 Supabase pooler(`aws-1-ap-northeast-2.pooler.supabase.com`)다.
- 운영 측정에서 `/api/stocks/67/candles`는 약 2.06~4.68초, 캐시 MISS인 `/api/stocks/67/order-book`은 약 5.84~6.56초가 걸렸다.
- Vercel 런타임 로그에서도 같은 Prisma 연결을 사용하는 데이터 로드 구간이 수 초에서 15초 이상 걸렸다.

이 증거를 바탕으로, 프론트엔드 waterfall보다 함수와 DB 사이의 장거리 네트워크 왕복을 먼저 제거하는 것이 가장 큰 효과를 낼 가능성이 높다고 판단한다.

## 선택한 접근

저장소의 `vercel.json`에 프로젝트 함수 지역을 `icn1` 하나로 명시한다.

이 방식을 선택한 이유는 다음과 같다.

- 설정이 Git 이력에 남아 Preview와 Production에 동일하게 재현된다.
- Dashboard를 직접 바꾸지 않으므로 Preview 검증 전에 운영 설정이 변하지 않는다.
- 라우트별 `preferredRegion`을 반복하지 않아 누락과 설정 분산을 피한다.
- 모든 Prisma 기반 페이지와 API가 같은 DB 지역 정렬 효과를 받는다.

## 범위

### 포함

- Preview와 Production의 `DATABASE_URL`이 같은 서울 Supabase 호스트를 가리키는지 비밀값을 출력하지 않고 확인
- `vercel.json`에 `regions: ["icn1"]` 추가
- 로컬 production build 검증
- Preview 배포
- Preview 빌드 산출물의 함수 지역이 `icn1`인지 확인
- Production과 Preview의 페이지 및 공개 API 성능 비교
- 익명 사용자의 응답 상태와 API 데이터 계약 회귀 확인
- 로그인 사용자의 계약에 영향을 주는 코드 변경이 없음을 정적 검토

### 제외

- Production 배포
- React 컴포넌트, CSS, 문구 또는 레이아웃 변경
- dynamic import, React Query, polling, realtime 또는 인증 재시도 변경
- DB 스키마, 인덱스, 데이터 또는 Supabase 설정 변경
- Preview 도메인에서 Google OAuth 설정 변경

## 배포 및 데이터 안전성

- Preview 배포만 생성한다. Production alias는 변경하지 않는다.
- Preview와 Production의 환경변수 값은 출력하거나 문서에 저장하지 않는다.
- `DATABASE_URL`은 hostname, port, pooler 여부만 비교한다.
- Preview가 Production과 다른 DB를 사용하면 성능 비교를 중단하고 그 차이를 보고한다.
- Preview 배포 중 migration, seed, 주문 생성 또는 데이터 쓰기 API를 실행하지 않는다.
- 성능 검증은 GET 요청만 사용한다.

## 검증 설계

### 1. 배포 전 기준선

이미 수집한 Production 결과를 기준선으로 사용하되, Preview 측정 직전에 다음 GET 요청을 같은 환경에서 다시 5회 측정한다.

- `/stock/67/order`
- `/api/stocks/67/candles?interval=DAY`
- `/api/stocks/67/order-book`

각 요청에서 HTTP 상태, TTFB, 전체 시간, 응답 크기, `x-vercel-cache`, `x-vercel-id`를 기록한다. 모든 요청에는 최대 시간을 설정해 무한 대기를 방지한다.

### 2. 로컬 검증

- `vercel.json` 구문 확인
- `npm run build`
- 빌드 과정에서 기존 타입·컴파일 오류가 없는지 확인
- Git diff가 `vercel.json`과 승인된 문서·계획 파일로 한정되는지 확인

### 3. Preview 검증

- Preview 배포가 `Ready`인지 확인
- `vercel inspect`에서 함수 산출물이 `icn1`인지 확인
- Production과 동일한 세 GET 요청을 Preview에서 각각 5회 측정
- 첫 요청과 후속 요청을 분리해 cold/warm 및 cache MISS/HIT 차이를 기록
- JSON의 `ok`, `data`, 핵심 필드 구조와 HTTP 상태가 Production과 동일한지 확인

### 4. 로그인·비로그인 고려

비로그인 검증에서는 다음을 확인한다.

- 주문 페이지가 정상 응답한다.
- 공개 캔들·호가 API 계약이 동일하다.
- `/api/stocks/67/orders`가 기존과 동일하게 인증 오류를 반환한다.
- UI 디자인과 서버 HTML 구조를 변경하는 코드가 diff에 없다.

로그인 검증은 이번 Preview에서 OAuth/cookie 도메인을 변경하지 않으므로 실제 로그인 세션 성능을 조작해 측정하지 않는다. 대신 다음을 보장한다.

- 인증·cookie·주문 API 코드는 수정하지 않는다.
- 지역 설정은 로그인·비로그인 요청 모두 동일한 함수 실행 위치에 적용된다.
- Preview 결과가 유효하면 Production 반영 승인을 별도로 받고, 운영 반영 후 기존 로그인 세션으로 `/orders` 응답 시간을 측정한다.

## 성공 기준

- Preview 함수가 `icn1`에서 실행된다.
- Preview와 Production이 동일 지역의 Supabase DB를 사용한다.
- 페이지와 공개 API의 HTTP 상태 및 JSON 계약이 동일하다.
- 캔들 API warm 응답 중앙값이 Production보다 명확히 감소한다.
- 호가 API cache MISS 전체 시간이 Production보다 명확히 감소한다.
- 빌드가 성공하고 UI 관련 파일 변경이 없다.

정확한 개선율을 사전에 강제하지 않는다. 지역 정렬 후에도 응답이 1초 이상이면 다음 병목 후보인 Prisma 연결 수, 쿼리 직렬화, 호가 집계 비용을 후속 단계에서 조사한다.

## 실패 및 중단 조건

다음 중 하나가 발생하면 Production 반영을 제안하지 않고 원인을 보고한다.

- Preview가 `icn1`이 아닌 지역에서 실행됨
- Preview와 Production의 DB 호스트가 다름
- build 또는 Preview 배포 실패
- API 상태나 데이터 계약 변경
- Preview 응답 시간이 유의미하게 개선되지 않거나 악화됨
- 의도하지 않은 UI 또는 인증 코드 변경 발견

## 결과 보고 형식

1단계 완료 후 다음 순서로 보고한다.

1. 원인: 지역 불일치 증거
2. 결정 이유: 왜 프로젝트 수준 `icn1` 설정을 선택했는지
3. 변경: 실제 변경 파일과 배포 범위
4. 결과: Production/Preview cold·warm 비교 표
5. 로그인·비로그인 영향
6. 디자인 변경 여부
7. 잔여 위험과 다음 병목 후보
8. Production 반영 또는 다음 단계 진행 여부 질문
