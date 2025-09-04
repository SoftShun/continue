# RAG Context Provider 설정 가이드

## 개요

RAG Context Provider는 Backend API를 통해 동적으로 group name 목록을 가져와서 RAG 검색을 수행하는 기능입니다.

## 기능

1. **동적 그룹 목록 로드**: Backend API (`http://localhost:8001/api/v1/groups`)에서 그룹 목록을 실시간으로 가져옵니다.
2. **자동 fallback**: API 연결이 실패하면 기본 그룹 목록을 사용합니다.
3. **커스터마이징 가능한 API URL**: 설정을 통해 API 서버 URL을 변경할 수 있습니다.

## 사용 방법

### 1. 기본 사용 (자동 활성화)

RAG Context Provider는 Continue 확장에서 자동으로 활성화됩니다. 별도 설정 없이 사용 가능합니다.

**사용 단계:**

1. 채팅 입력창에서 `@` 입력
2. 목록에서 "📚 RAG 검색" 선택
3. Backend API에서 실시간으로 가져온 그룹 목록에서 선택
4. 선택한 그룹에 대한 RAG 검색 결과가 자동으로 컨텍스트에 포함됨

**예시:**

- `@rag:PaymentServiceTeam` → PaymentServiceTeam 관련 코드 검색
- `@rag:AuthenticationTeam` → 인증 관련 코드 검색

### 2. 커스텀 API URL 설정

Continue 설정 파일 (`~/.continue/config.yaml`)에서 RAG Context Provider를 직접 설정할 수 있습니다:

```yaml
# ~/.continue/config.yaml

models:
  - provider: openai
    model: gpt-4
    apiKey: your-api-key

context:
  - provider: rag
    params:
      apiBaseUrl: "http://localhost:8001"
      groups:
        - authentication
        - database
        - api
        - ui-components
        - tests
        - utils
        - models
        - services
        - controllers
        - middleware
```

### 3. 설정 옵션

#### RAG Context Provider 파라미터:

- **`apiBaseUrl`** (선택사항): Backend API의 기본 URL

  - 기본값: `"http://localhost:8001"`
  - 예시: `"http://your-backend-server:8080"`

- **`groups`** (선택사항): API 연결 실패 시 사용할 기본 그룹 목록
  - 기본값: `["authentication", "database", "api", ...]`
  - API가 정상 작동하면 이 값은 무시됩니다

#### 완전한 설정 예시:

```yaml
# ~/.continue/config.yaml

models:
  - provider: openai
    model: gpt-4
    apiKey: ${OPENAI_API_KEY}

context:
  # RAG 검색을 위한 설정
  - provider: rag
    params:
      apiBaseUrl: "http://localhost:8001"
      groups:
        - PaymentServiceTeam
        - UserManagementTeam
        - AuthenticationTeam
        - MyTeamA

  # 다른 context provider들
  - provider: file
  - provider: folder
```

## Backend API 스펙

RAG Context Provider는 다음 API 엔드포인트를 호출합니다:

```
GET http://localhost:8001/api/v1/groups
```

**응답 예시:**

```json
["PaymentServiceTeam", "UserManagementTeam", "AuthenticationTeam", "MyTeamA"]
```

**요구사항:**

- HTTP GET 메서드 지원
- JSON 배열 형태의 응답
- 5초 이내 응답

## 로그 및 디버깅

다음 로그를 통해 동작 상태를 확인할 수 있습니다:

```
RAG 그룹 목록 API 호출: http://localhost:8001/api/v1/groups
RAG 그룹 목록 로드 성공: 4개 그룹 ["PaymentServiceTeam", "UserManagementTeam", ...]
```

API 연결 실패 시:

```
Backend API 호출 오류: Error: fetch failed
그룹 목록 로드 중 오류: [에러 메시지]
```

## troubleshooting

### 1. 그룹 목록이 로드되지 않는 경우

- Backend API 서버가 실행 중인지 확인
- API URL이 올바른지 확인
- 네트워크 연결 상태 확인

### 2. 기본 그룹만 표시되는 경우

- Console에서 에러 로그 확인
- API 응답 형태가 JSON 배열인지 확인
- 타임아웃(5초) 내에 응답하는지 확인

### 3. RAG 검색 결과가 없는 경우

- 임베딩 데이터베이스가 올바르게 설정되었는지 확인
- 선택한 그룹에 대한 데이터가 있는지 확인
