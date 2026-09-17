# nest-code-explorer

[![npm](https://img.shields.io/npm/v/nest-code-explorer)](https://www.npmjs.com/package/nest-code-explorer) [![license](https://img.shields.io/npm/l/nest-code-explorer)](LICENSE)

**NestJS API 하나가 Controller → Usecase → Service → Repository → DB / Queue / External API 를 어떻게 거쳐가는지 브라우저에서 클릭하며 따라가는 코드 탐색기입니다.**

앱을 띄우지 않고, DB 없이, 프로젝트 코드를 수정하지 않고 TypeScript 소스를 정적 분석합니다.

```bash
npx nest-code-explorer
```

NestJS 프로젝트 루트에서 위 명령어 하나만 실행하면 브라우저에서 바로 확인할 수 있습니다.

**앱 실행 없음 · DB 연결 없음 · 코드 수정 없음 · 별도 설치 없음**

![실행 경로: POST /v1/orders/:id/cancel](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/08-flow-cancel.png)

---

## 이게 뭔가요?

처음 보는 NestJS 프로젝트에서 이런 게 궁금할 때 사용합니다.

> **"이 API 를 호출하면 어떤 클래스의 어떤 함수를 거쳐 어느 테이블·외부 시스템까지 가는가?"**

보통은 Controller 를 열고, 주입된 Usecase 를 찾아 열고, Service 를 열고, Repository 를 찾고, Queue 가 있다면 다시 Worker 까지 찾아가야 합니다.

`nest-code-explorer` 는 이 흐름을 브라우저에서 클릭하며 따라갈 수 있게 보여줍니다.

예를 들어:

```text
POST /v1/orders/:id/cancel

Controller
    ↓
Usecase
    ↓
Service
    ↓
Repository
    ↓
DB
```

Queue 가 있다면:

```text
Controller
    ↓
Service
    ↓
Queue
    ↓
Worker
    ↓
External API
```

처럼 Worker 너머까지 이어서 볼 수 있습니다.

---

## 실제로 어떻게 보이나요?

### 1. Controller 에서 시작해서 코드를 따라갑니다

처음에는 HTTP Controller 와 Queue·Cron Worker 같은 진입점만 보입니다.

![진입점](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/01-structure-entries.png)

노드를 누르면 주입받는 클래스가 오른쪽에 펼쳐집니다. 지나온 경로는 검은 테두리로 남고, 더블클릭은 접기, 드래그로 위치를 옮길 수 있습니다.

![경로 강조](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/02-structure-trail.png)

즉 파일을 하나씩 열어보는 대신 그래프에서:

```text
Controller → Usecase → Service → Repository
```

순서로 내려가며 프로젝트 구조를 확인할 수 있습니다.

---

### 2. 전체 구조도 볼 수 있습니다

**전부 펼치기**를 누르면 전체 의존 그래프가 열별로 정렬돼 겹치지 않게 표시됩니다.

![전부 펼치기](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/03-structure-expand-all.png)

---

### 3. 클래스뿐 아니라 코드 내용으로도 검색합니다

클래스 이름만 검색하는 것이 아닙니다.

다음과 같은 값으로도 찾을 수 있습니다.

```text
OrderService
cancel
환불
/v1/orders/:id
ORDER_ITEM
ORDER_NOT_FOUND
```

즉 다음을 모두 검색합니다.

**클래스 · 메서드 · 한글 주석 · 라우트 · 테이블 · 에러 코드**

검색 결과를 선택하면 해당 클래스까지 경로가 펼쳐지고 메서드가 열립니다.

![검색](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/04-search.png)

---

### 4. 클래스와 메서드 상세를 확인합니다

오른쪽 Inspector 에서는 선택한 클래스의:

- 계층
- 파일:줄
- 의존 수
- 사용처 수
- 설명
- Dependencies
- Used by
- Tables

를 확인할 수 있습니다.

Methods 탭에서는:

- 메서드 이름
- 한 줄 설명
- 반환 타입

을 볼 수 있습니다.

메서드를 누르면:

- 파라미터
- 반환 타입
- 던지는 에러 코드
- 호출하는 메서드
- 접근 테이블
- 투입하는 Job
- 소스 위치

가 표시됩니다.

| Overview | Methods | 메서드 상세 |
| --- | --- | --- |
| ![Overview](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/05-inspector-overview.png) | ![Methods](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/06-inspector-methods.png) | ![메서드 상세](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/07-inspector-method.png) |

한 줄 설명은 메서드의 JSDoc 첫 줄입니다.

주석을 달아 두면 탐색기가 곧 문서가 됩니다.

---

### 5. API 하나의 실행 경로를 볼 수 있습니다

구조뿐 아니라 **API·Job·Cron 하나가 지나가는 메서드 순서**도 볼 수 있습니다.

왼쪽 목록에서 라우트, Queue Job, Cron 중 하나를 선택하면 해당 요청이 지나가는 메서드 단위 경로가 그려집니다. 라우트는 HTTP 메서드별 색(GET 파랑 · POST 초록 · PUT 주황 · PATCH 청록 · DELETE 빨강)으로 구분됩니다.

실선은 메서드 호출입니다.

점선은:

- 테이블
- 외부 시스템
- Queue 경계

를 나타냅니다.

오른쪽에는:

- 지나가는 메서드 수
- 접근 테이블
- 외부 시스템
- 발생 가능한 에러 코드

가 요약됩니다.

![실행 경로: POST /v1/orders/:id/cancel](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/08-flow-cancel.png)

---

### 6. Queue 너머 Worker 까지 이어서 볼 수 있습니다

**큐 너머 Worker 처리까지 이어서**를 켜면 Queue 에 넣은 Job 을 어느 Worker 메서드가 꺼내 처리하는지까지 이어서 그립니다.

예를 들어:

```text
API
 ↓
Service
 ↓
ship Job
 ↓
Shipping Worker
 ↓
택배사 API
 ↓
notify Job
 ↓
Notification Worker
 ↓
Mail
```

처럼 Queue 경계 너머까지 한 흐름으로 볼 수 있습니다.

아래는 `ship` Job 이 택배사 API 를 부르고 다시 `notify` Job 을 넣어 메일까지 가는 2단 경로입니다.

![큐 너머 Worker 까지](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/09-flow-job-cross-queue.png)

요약 패널의 "지나가는 메서드"는 들여쓰기로 호출 깊이를 표현합니다.

항목이나 노드를 누르면 해당 메서드의 상세로 이동합니다.

| 요약 패널 (POST /v1/orders, 큐 너머까지 16개 메서드) | cron 진입점 |
| --- | --- |
| ![요약](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/10-flow-summary.png) | ![cron](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/11-flow-cron.png) |

---

## 30초 만에 시작하기

### 1. 일단 실행합니다

NestJS 프로젝트 루트(`tsconfig.json` 이 있는 폴더)에서 한 줄만 실행합니다.

```bash
npx nest-code-explorer
```

설치할 것은 없습니다.

첫 실행은 npx 가 패키지를 받느라 10초쯤 걸릴 수 있습니다.

기동할 때 소스를 한 번 분석해 메모리에 올리고 [http://localhost:4545](http://localhost:4545) 를 브라우저로 엽니다.

파일을 하나도 쓰지 않으므로 저장소에 생성물이 생기지 않고 `.gitignore` 를 손댈 일도 없습니다.

코드가 바뀐 뒤 다시 보려면:

```text
Ctrl+C
```

로 끄고 다시 실행합니다.

```bash
npx nest-code-explorer
```

다음 관례를 사용하는 프로젝트라면 여기서 끝입니다.

```text
*.controller.ts
*.usecase.ts
*.service.ts
*.repository.ts
*.guard.ts
```

---

## 프로젝트 규칙이 다르면 설정 파일을 만듭니다

Usecase 나 Worker 같은 계층이 `Etc` 로 뭉치거나, Queue 경계가 안 이어지거나, 에러 코드·테이블·외부 시스템이 안 보인다면 프로젝트 규약이 기본값과 다른 것입니다.

설정 파일을 만들어 그 부분만 수정합니다.

```bash
npx nest-code-explorer --init      # code-explorer.config.json 생성 (기본값 전체 + 각 키 설명)
```

생성된 파일에서 보통 손대는 키는 넷입니다.

| 키 | 언제 고치나 | 예 |
| --- | --- | --- |
| `layers[]` | 파일 이름 규칙이 다르거나 계층을 더 나누고 싶을 때 | `{ "name": "Usecase", "match": "\\.usecase\\.ts$", "column": 1, "color": "#7a4fd6" }` |
| `queue` | 큐를 쓸 때. `nestjs-bullmq`(`@Processor`/`@InjectQueue`) 또는 `manual-router`(Job 이름 상수 + switch 라우터) | `{ "type": "nestjs-bullmq" }` |
| `errors.className` | `new AppError('CODE')` 처럼 코드 문자열을 첫 인자로 받는 예외 클래스 | `{ "className": "AppError" }` |
| `externals[]` | 외부 API·SMTP 클라이언트 클래스를 말단 노드로 그리고 싶을 때 | `[{ "match": "^PaymentGateway$", "label": "PG API", "terminal": true }]` |

고친 뒤 다시 실행하면 같은 폴더의 설정 파일을 자동으로 읽습니다.

```bash
npx nest-code-explorer
```

완성된 설정 예시:

[`examples/order-app/code-explorer.config.json`](examples/order-app/code-explorer.config.json)

- manual-router Queue
- RawSQL/TypeORM
- `AppError`
- 외부 시스템 3종

[`fixtures/bullmq-app/code-explorer.config.json`](fixtures/bullmq-app/code-explorer.config.json)

- `@nestjs/bullmq`

---

## 큰 프로젝트에서는

클래스가 수백 개라면 **전부 펼치기**는 읽기 어려운 그래프가 될 수 있습니다.

그래서 네 가지 장치를 제공합니다.

### 폴더로 펼치기

구조 모드의 왼쪽 목록은:

```text
contexts/admin
domains/member
domains/order
domains/payment
```

처럼 `src/` 아래 폴더별 클래스 수를 보여줍니다.

기본 두 단계이며 `folderDepth` 로 조절할 수 있습니다.

체크한 폴더의 클래스만 그래프에 올리고, 거기서 노드를 누르면 폴더 밖 의존성으로 더 내려갈 수 있습니다.

### 초점 모드

헤더의 `초점` 버튼 또는 왼쪽 체크박스로 활성화합니다.

고른 노드로 들어오는 것과 그 노드에서 나가는 것만 남기고 나머지는 숨깁니다.

다른 노드를 고르면 새로운 노드를 기준으로 다시 잡힙니다.

### 미니맵과 최소 줌

전체 맞춤은 글자가 읽히는 배율까지만 줄입니다.

화면 밖에 노드가 있으면 오른쪽 아래 미니맵이 나타납니다.

미니맵을 누르거나 끌면 해당 위치로 이동합니다.

노드를 눌러 펼칠 때는 Zoom 을 유지하고 새 노드가 화면 밖에 있을 때만 이동합니다.

### 전부 펼치기 임계값

클래스가 60개를 넘으면 바로 전부 펼치지 않고 안내를 띄운 뒤 폴더 목록을 엽니다.

그래도 보고 싶다면 안내의 링크를 통해 전체 그래프를 펼칠 수 있습니다.

| 폴더로 펼치기 (`domains/order`, `domains/payment` 체크) | 초점 모드 (`OrderService` 기준) |
| --- | --- |
| ![폴더로 펼치기](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/12-folders.png) | ![초점 모드](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/13-focus.png) |

---

## 그 밖에

- 헤더의 **◧ 목록 / 상세 ◨** 로 좌우 창을 접을 수 있습니다. 상태는 브라우저에 저장됩니다.
- 파일:줄 옆 `↗` 는 에디터를 그 줄에서 엽니다.
- 헤더의 드롭다운에서 VS Code · Cursor · Windsurf · Zed · WebStorm · IntelliJ · Sublime 중 고르거나 "경로 복사"를 선택할 수 있습니다.
- 선택한 에디터는 브라우저에 저장됩니다.
- 기본값은 설정 `editor` 입니다.
- 프리셋 이름 또는 `{path}` `{line}` 을 사용하는 URL 템플릿을 지정할 수 있습니다.
- 화면 폭이 좁으면 헤더가 두 줄로 접힙니다.

---

## 파일로 남기고 싶을 때

Slack 에 공유하거나, 오프라인에서 열거나, CI 에서 문서로 만들 때는 파일 모드를 사용합니다.

```bash
npx nest-code-explorer --open              # docs/code-explorer.html (+ code-map.md, diagrams/) 를 만들고 그 파일을 연다
npx nest-code-explorer --write --no-svg    # 만들기만 (CI). --no-svg 는 느린 mermaid SVG 렌더 생략
```

파일 모드 생성물:

```text
docs/code-explorer.html
docs/code-map.md
docs/diagrams/*.svg
```

`docs/code-explorer.html` 은 오프라인에서 열 수 있습니다.

`docs/code-explorer.html` 에는 vis-network 가 들어 있어 800KB 쯤 되므로 커밋하지 말고 `.gitignore` 에 넣습니다.

---

## 옵션

| 옵션 | 뜻 |
| --- | --- |
| (없음) | **기본**: 파일 없이 기동 때 한 번 분석해 [http://localhost:4545](http://localhost:4545) 를 연다 |
| `--open` | 파일(`docs/code-explorer.html`, `code-map.md`, `diagrams/`)을 만들고 그 파일을 연다 |
| `--write` | 파일만 만들고 열지 않는다 (CI) |
| `--no-open` | 브라우저를 열지 않는다 (기본 모드면 주소만 출력) |
| `--port <n>` | 기본 모드 포트 (기본 4545) |
| `--init [--force]` | 기본값 전체를 `code-explorer.config.json` 으로 쓴다. 이미 있으면 `--force` 없이는 건드리지 않는다 |
| `--config <file>` | 설정 파일 경로 (기본 `code-explorer.config.json`, 없으면 기본값으로 실행) |
| `--no-svg` | 파일 모드에서 코드 지도(mermaid)의 SVG 렌더를 생략한다 |
| `--cwd <dir>` | 프로젝트 루트 (기본: 현재 디렉터리) |

---

## 예시 프로젝트로 먼저 보기

README 에 있는 화면은 전부 [`examples/order-app`](examples/order-app) 을 분석한 것입니다.

내 프로젝트에 붙이기 전에 어떤 화면이 나오는지 보고 싶다면 실행해 볼 수 있습니다.

```bash
git clone https://github.com/whalebanana86/nest-code-explorer.git
cd nest-code-explorer/examples/order-app
npx nest-code-explorer
```

---

## 왜 만들었나

처음 보는 NestJS 저장소에서 알고 싶은 건 늘 같았습니다.

> **"이 API 를 치면 어떤 클래스의 어떤 함수를 거쳐 어느 테이블·외부 시스템까지 가는가."**

그런데 그걸 보려면 Controller 를 열고, 주입된 Usecase 를 찾아 열고, 그 안의 Service 를 또 열고, Repository 를 열고, Queue 가 있다면 Worker 까지 찾아가야 합니다.

파일을 여러 개 따라가야 API 하나의 전체 흐름이 보입니다.

기존 도구는 조금 다른 문제를 해결합니다.

- 모듈 DI 그래프(nestjs-spelunker 류)는 **모듈** 단위라 함수가 안 보입니다.
- Compodoc 은 클래스별 **문서**라 흐름이 이어지지 않습니다.
- OpenTelemetry/Jaeger 는 **실행 중인 요청**을 추적하기 때문에 앱과 인프라를 띄워야 하고, 소스 코드를 이해하는 용도와는 다릅니다.

그래서 만들었습니다.

Controller 목록에서 시작해 누르면 주입받는 클래스가 펼쳐지고, 클래스를 누르면 메서드·한글 주석·에러 코드·테이블이 나오며, API 하나를 고르면 Queue 경계를 넘어 Worker 까지 지나가는 메서드 순서가 그려집니다.

프로젝트 이름은 코드에 없고 규약은 설정 파일 하나에 있어서 어느 NestJS 프로젝트에나 붙일 수 있도록 했습니다.

---

## 어떻게 동작하나

NestJS 애플리케이션을 실행해 Trace 를 수집하는 방식이 아닙니다.

`ts-morph` 로 TypeScript 소스를 정적 분석합니다.

```text
TypeScript Source
        ↓
     ts-morph
        ↓
   Import Graph
        ↓
Class / Method Index
        ↓
Route / Queue / SQL
Error / External 분석
        ↓
    Explorer Data
        ↓
 Browser Explorer
```

따라서 기본적인 코드 탐색에는:

```text
NestJS 앱
DB
Redis
Worker
외부 API
```

를 실제로 실행할 필요가 없습니다.

대신 결과는 **실행 시점 소스의 정적 분석 결과**입니다.

코드가 바뀌었다면 다시 실행해야 합니다.

---

## 개발

```bash
npm run build                               # src/analyze.ts → dist/*
npm test                                    # examples/order-app · fixtures/bullmq-app 분석 결과, --init, 기본(서버) 모드를 검증 (node:test)
node bin/cli.js --cwd examples/order-app --write --no-svg                                 # 예시 프로젝트 탐색기를 파일로
node scripts/readme-shots.js examples/order-app/docs/code-explorer.html docs/screenshots   # README 스크린샷 재생성 (headless Chrome)
```

구조:

```text
src/analyze.ts
template/code-explorer.template.html
bin/cli.js
examples/order-app
fixtures/bullmq-app
test/
```

`src/analyze.ts`

분석기입니다.

```text
설정 로드
→ import 그래프
→ 클래스·메서드 색인
→ 라우트·큐·SQL·에러·외부 추출
→ HTML/markdown 생성
```

`write:false` 이면 HTML 문자열만 반환합니다.

`template/code-explorer.template.html`

탐색기 UI 입니다.

`__DATA__` 에 분석 결과가 들어갑니다.

`bin/cli.js`

기본 서버 모드 · `--open` / `--write` 파일 모드 · `--init` 을 담당합니다.

`examples/order-app`

예시 프로젝트입니다.

`fixtures/bullmq-app`

nestjs-bullmq 어댑터 Fixture 입니다.

`test/`

분석기와 CLI 를 검증합니다.

---

## 배포

```bash
npm version patch             # 태그 + 버전
npm publish --access public   # prepublishOnly 가 build + test 를 먼저 돈다
```

라이선스 MIT.

vis-network(MIT) 를 HTML 에 인라인합니다.
