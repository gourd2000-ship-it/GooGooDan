# 운영·배포 점검 절차

## 1. 환경변수

서버와 클라이언트에 실제 비밀값을 소스 코드나 Git에 저장하지 않는다. 필요한 값과 형식은 [환경변수 예시](./environment.example)를 따른다.

- 서버 `DATABASE_URL`, `GEMINI_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `CLIENT_ORIGINS`, `SCHOOL_TENANTS`, `NODE_ENV=production`
- 클라이언트 `VITE_API_URL`, `VITE_GOOGLE_OAUTH_CLIENT_ID`
- `SCHOOL_TENANTS`의 `host`는 한 학교의 전체 브라우저 호스트명이며, `schools.id`와 같은 UUID여야 한다.
- `initialAdminSubjects`에는 이메일이 아닌 Google 계정의 변경되지 않는 `sub` 값을 넣는다.

관리자 로그인은 Google Identity Services가 발급한 ID 토큰을 서버에서 검증한다. Google은 서버 측 검증과 `sub` 식별자 사용을 권장한다. <https://developers.google.com/identity/gsi/web/guides/verify-google-id-token>

## 2. DB 마이그레이션

운영 DB를 백업한 뒤 순서대로 적용한다. 아래 명령의 연결 문자열은 터미널 기록에 남지 않도록 배포 환경의 `DATABASE_URL`을 사용한다.

```powershell
psql $env:DATABASE_URL -f server/migrations/001_add_practice_types.sql
psql $env:DATABASE_URL -f server/migrations/002_tenant_auth_foundation.sql
```

적용 뒤 `schools` 테이블에 각 학교의 UUID·호스트명·Workspace 도메인을 등록하고, `admins`에 Google `sub`와 이메일을 등록한다. 최초 관리자는 `SCHOOL_TENANTS.initialAdminSubjects`로 한 번만 부트스트랩할 수 있다.

`002_tenant_auth_foundation.sql`은 기존 익명 기록을 삭제하지 않는다. 롤백이 필요하면 새 학생/세션/학교 데이터의 보존 여부를 판단한 뒤 별도 승인된 SQL로 진행한다. 운영 데이터가 있는 상태에서 무조건 테이블·열을 제거하지 않는다.

## 3. 배포 전 확인

1. 학생 학교 주소에서 학년·반·PIN으로 로그인하고, 새로고침과 새 탭에서도 세션이 복원되는지 확인한다.
2. 말하기와 누르기 기록을 각각 저장하고, 같은 학생의 최고 기록만 명예의 전당에 보이는지 확인한다.
3. `/admin`에서 허용된 Google Workspace 계정으로 로그인해 명부 검색·단건 등록·수정·CSV 등록과 성취 대시보드를 확인한다.
4. 다른 학교 호스트와 비관리자 계정에서 관리자 API가 거부되는지 확인한다.
5. 클라이언트와 서버가 다른 도메인이라면 HTTPS에서 `Secure; SameSite=None` 쿠키와 credentials CORS를 확인한다. credentialed fetch에는 서버의 명시적 허용 origin과 `Access-Control-Allow-Credentials`가 필요하다. <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#including_credentials>

SPA 배포는 `/admin`을 포함한 클라이언트 경로를 `index.html`로 재작성(rewrite)해야 한다.

## 4. CSV 템플릿

```csv
grade,classNumber,studentName,accessCode
3,2,김구구,1234
3,2,이단단,
```

`accessCode`는 네 자리 숫자이며 비우면 서버가 생성한다. 하나라도 형식 오류 또는 같은 학교·학년·반의 중복 PIN이 있으면 전체 등록이 취소된다. 화면은 클라이언트 형식 오류에 행 번호를 표시한다.

## 5. 장애 대응

- DB/랭킹 오류: 예시 랭킹을 보여 주지 말고 오류 화면을 확인한 뒤 DB 연결과 마이그레이션 적용 상태를 점검한다.
- Google 로그인 오류: 브라우저의 `VITE_GOOGLE_OAUTH_CLIENT_ID`, 서버의 `GOOGLE_OAUTH_CLIENT_ID`, Google Cloud의 승인된 JavaScript origin을 함께 확인한다.
- 학생 로그인 오류: 요청 호스트가 `SCHOOL_TENANTS`에 정확히 등록됐는지, 학생이 활성 상태인지, 학년·반·PIN이 맞는지 확인한다. PIN 원문이나 세션 토큰은 로그에 남기지 않는다.
- 쿠키 오류: HTTPS, `CLIENT_ORIGINS`, `credentials: include`, `Secure`/`SameSite` 속성을 함께 점검한다.

## 6. 로컬 검증 명령

```powershell
cd server; npm test
cd ../client; npm test
cd ../client; npm run build
```
