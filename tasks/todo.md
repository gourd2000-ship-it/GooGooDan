# 학생 계정·학습 현황 관리 작업 목록

작업은 **구조 → 공통 기능 → 개별 기능** 순서로 진행한다. DB 변경과 인증 계약은 후속 작업의 전제이므로 순차 적용한다.

## Phase 1. 구조

## Task 1: 학교 전용 주소와 관리자 정책 확정

**설명:** 학교 호스트명 규칙, Google Workspace 허용 도메인/초대 목록, 관리자 초기 등록 절차를 운영 설정으로 확정한다.

**완료 기준:**
- [ ] 각 학교가 하나의 고유 호스트명과 `school_id`를 가진다.
- [ ] 관리자 Google 계정 허용 규칙이 문서화된다.
- [ ] 개발·운영 OAuth 리디렉션 URI가 정해진다.

**검증:** 설정 검토와 테스트 호스트→학교 해석 확인
**의존성:** 없음
**예상 범위:** S

## Task 2: 테넌트·학생·세션 데이터 마이그레이션

**설명:** 학교, 관리자, 학생, 학생 세션과 기록 소유권·정답 수·인덱스 스키마를 추가한다.

**완료 기준:**
- [ ] 모든 새 학생과 기록이 `school_id`·`student_id`로 연결된다.
- [ ] 기존 `records`는 삭제되지 않는다.
- [ ] 접속번호 평문 컬럼이 없다.

**검증:** 테스트 DB에서 적용·롤백 및 제약조건 테스트
**의존성:** Task 1
**예상 파일:** `server/migrations/002_tenants_and_students.sql`, `server/migrations/003_sessions_and_records.sql`
**예상 범위:** S

## Task 3: 학교 경계와 Google 관리자 인증 기반

**설명:** 호스트명에서 학교를 해석하고 Google ID 토큰과 관리자 역할을 검증하는 공용 서버 미들웨어를 구현한다.

**완료 기준:**
- [ ] 미등록 호스트는 요청을 거부한다.
- [ ] 비관리자 및 다른 학교 관리자는 관리자 API에 접근할 수 없다.
- [ ] 관리자 인증 정보가 학생 세션과 섞이지 않는다.

**검증:** `cd server; npm test`
**의존성:** Task 1, Task 2
**예상 파일:** `server/tenant.js`, `server/adminAuth.js`, `server/adminAuth.test.js`, `server/index.js`
**예상 범위:** M

## 체크포인트: 구조

- [ ] 마이그레이션 적용·롤백 성공
- [ ] 학교 경계와 관리자 권한 테스트 통과
- [ ] Google Cloud 설정값은 환경 변수로만 관리됨

## Phase 2. 공통 기능

## Task 4: 학생 세션 API와 PIN 보안

**설명:** PIN 해시·검증, 로그인, 세션 확인·폐기, PIN 변경을 위한 공용 API를 구현한다.

**완료 기준:**
- [ ] 학교·학년·반·PIN이 모두 일치할 때만 로그인된다.
- [ ] 만료·폐기 세션은 복원되지 않는다.
- [ ] PIN은 응답·로그·DB 평문에 포함되지 않는다.

**검증:** `cd server; npm test`
**의존성:** Task 2, Task 3
**예상 파일:** `server/auth.js`, `server/auth.test.js`, `server/index.js`
**예상 범위:** M

## Task 5: 공용 클라이언트 세션 상태

**설명:** 서버 세션을 조회·복원·폐기하는 API 클라이언트와 Zustand 상태를 구현한다.

**완료 기준:**
- [ ] 앱 시작 시 세션 상태가 복원된다.
- [ ] 인증 요청은 쿠키를 포함한다.
- [ ] 로그아웃이 사용자·학습 상태를 초기화한다.

**검증:** `cd client; npm run test -- auth`; `cd client; npm run build`
**의존성:** Task 4
**예상 파일:** `client/src/lib/auth.ts`, `client/src/store/useStore.ts`, `client/src/App.tsx`, `client/src/lib/auth.test.ts`
**예상 범위:** M

## Task 6: 인증 학생 기록 귀속

**설명:** 말하기와 누르기 기록을 인증된 학생 ID·정답 수에 연결하고 클라이언트 이름을 소유권 판정에서 제거한다.

**완료 기준:**
- [ ] 인증 없는 기록 요청은 거부된다.
- [ ] 두 학습 방식의 기록이 같은 학생 ID에 저장된다.
- [ ] 클라이언트 이름 변경으로 기록 소유자를 바꿀 수 없다.

**검증:** `cd server; npm test`; 말하기·누르기 흐름 수동 확인
**의존성:** Task 4
**예상 파일:** `server/index.js`, `server/utils.js`, `server/utils.test.js`, `client/src/screens/PracticeScreen.tsx`, `client/src/lib/tapRecord.ts`
**예상 범위:** M

## Task 7: 최고 기록과 성취 집계 계약

**설명:** 학생별 최고 기록·동점 시간 규칙과 단별 말하기/누르기 성취 집계 API를 구현한다.

**완료 기준:**
- [ ] 랭킹 결과는 학생당 한 행이다.
- [ ] 집계는 두 학습 유형 점수와 완전 정답 여부를 반환한다.
- [ ] 익명 과거 기록은 새 집계에서 제외된다.

**검증:** `cd server; npm test`
**의존성:** Task 6
**예상 파일:** `server/ranking.js`, `server/ranking.test.js`, `server/index.js`
**예상 범위:** S

## 체크포인트: 공통 기능

- [ ] 세션·기록·랭킹·집계 서버 테스트 통과
- [ ] 클라이언트 빌드 성공
- [ ] 같은 학생의 두 가지 학습 기록이 동일한 ID로 조회됨

## Phase 3. 개별 기능 — 학생

## Task 8: 키패드 학생 로그인 화면

**설명:** 학년·반 드롭다운, 숫자가 보이지 않는 3×4 PIN 키패드, 자동 로그인과 오류 안내를 구현한다.

**완료 기준:**
- [ ] 네 번째 번호 입력 때 자동 로그인한다.
- [ ] 입력된 숫자는 점 개수 외에 노출되지 않는다.
- [ ] 전용 학교 주소의 학생만 로그인된다.

**검증:** `cd client; npm run test -- StudentLoginScreen`; `cd client; npm run build`
**의존성:** Task 5
**예상 파일:** `client/src/screens/StudentLoginScreen.tsx`, `client/src/screens/StudentLoginScreen.test.tsx`, `client/src/App.tsx`
**예상 범위:** S

## Task 9: 학생 프로필·로그아웃과 탐색 복원

**설명:** 개인정보 화면, PIN 변경, 로그아웃, 뒤로 가기·새로고침 시 보호 화면 복원 UX를 구현한다.

**완료 기준:**
- [ ] 학생은 자신의 PIN만 변경할 수 있다.
- [ ] 로그아웃 후에는 보호 화면에 남지 않는다.
- [ ] 새로고침·새 탭·뒤로 가기에서 유효 세션이 복원된다.

**검증:** `cd client; npm run test -- ProfileScreen`; 수동 브라우저 확인
**의존성:** Task 5, Task 8
**예상 파일:** `client/src/screens/ProfileScreen.tsx`, `client/src/screens/ProfileScreen.test.tsx`, `client/src/App.tsx`, `client/src/store/useStore.ts`
**예상 범위:** M

## Task 10: 학생별 최고 기록 명예의 전당

**설명:** 명예의 전당을 학생당 최고 기록 한 행으로 표시하고, DB 오류와 재시도 상태를 올바르게 보여 준다.

**완료 기준:**
- [ ] 동일 학생이 같은 필터에 두 번 나타나지 않는다.
- [ ] 동점은 더 짧은 시간이 앞선다.
- [ ] DB 미연결 시 샘플 데이터가 표시되지 않는다.

**검증:** `cd client; npm run test -- RankingScreen`
**의존성:** Task 7, Task 8
**예상 파일:** `client/src/screens/RankingScreen.tsx`, `client/src/screens/RankingScreen.test.tsx`, `client/src/lib/ranking.ts`
**예상 범위:** S

## Phase 4. 개별 기능 — 관리자 명부

## Task 11: 관리자 학생 목록·단건 관리 API

**설명:** 관리자 학교 범위에서 학생 목록, 단건 등록, 허용 필드 수정 API를 구현한다.

**완료 기준:**
- [ ] 이름과 학생 ID는 수정할 수 없다.
- [ ] 관리자 쿼리는 자신의 학교 학생만 반환한다.
- [ ] PIN은 재설정만 가능하며 응답에 포함되지 않는다.

**검증:** `cd server; npm test`
**의존성:** Task 3, Task 4
**예상 파일:** `server/routes/adminStudents.js`, `server/routes/adminStudents.test.js`, `server/index.js`
**예상 범위:** S

## Task 12: CSV 일괄 학생 배정 API

**설명:** CSV 검증, 빈 PIN 자동 생성, 원자적 학생 일괄 등록을 구현한다.

**완료 기준:**
- [ ] 유효하지 않은 CSV는 학생을 하나도 생성하지 않는다.
- [ ] 같은 학교·학년·반의 중복 PIN을 거부한다.
- [ ] 빈 PIN에는 4자리 PIN을 생성한다.

**검증:** `cd server; npm test`
**의존성:** Task 11
**예상 파일:** `server/csvImport.js`, `server/csvImport.test.js`, `server/routes/adminStudents.js`
**예상 범위:** S

## Task 13: 관리자 학생 관리 화면

**설명:** Google Workspace 관리자에게 검색·단건 등록·수정·CSV 일괄 등록 화면을 제공한다.

**완료 기준:**
- [ ] 학교·학년·반 필터와 등록·수정 흐름이 동작한다.
- [ ] CSV 오류는 행 번호와 사유를 표시한다.
- [ ] 비관리자는 관리 화면으로 이동할 수 없다.

**검증:** `cd client; npm run test -- AdminStudentsScreen`; `cd client; npm run build`
**의존성:** Task 11, Task 12
**예상 파일:** `client/src/screens/AdminStudentsScreen.tsx`, `client/src/screens/AdminStudentsScreen.test.tsx`, `client/src/lib/admin.ts`, `client/src/App.tsx`
**예상 범위:** M

## Phase 5. 개별 기능 — 관리자 대시보드

## Task 14: 성취 대시보드 화면

**설명:** 관리자용 학교·학년·반 필터와 학생×2~9단 매트릭스를 구현한다.

**완료 기준:**
- [ ] 말하기/누르기 점수와 더 높은 점수가 함께 보인다.
- [ ] 100점 이상 초록, 30~99점 노랑, 그 이하는 빨강이다.
- [ ] 완전 정답 기록에는 표지가 보인다.

**검증:** `cd client; npm run test -- AdminDashboardScreen`; `cd client; npm run build`
**의존성:** Task 7, Task 13
**예상 파일:** `client/src/screens/AdminDashboardScreen.tsx`, `client/src/screens/AdminDashboardScreen.test.tsx`, `client/src/lib/admin.ts`, `client/src/App.tsx`
**예상 범위:** M

## 체크포인트: 개별 기능 완료

- [ ] 전체 서버·클라이언트 테스트 통과
- [ ] 실제 HTTPS 배포에서 Google 로그인·세션 쿠키·CORS 확인
- [ ] 학교별 주소, 명부 관리, 대시보드를 한 학급으로 시범 운영
## M1 execution checklist (2026-08-24)

- [ ] Task 1: Add and test student PIN/session APIs.
- [ ] Task 2: Add and test client session restore/logout state.
- [ ] Task 3: Add and test authenticated speech/tap record ownership.
- [ ] Task 4: Add and test best-record ranking and progress aggregation.
- [ ] Checkpoint: Server and client suites pass; client production build passes.
