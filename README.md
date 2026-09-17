# nest-code-explorer

[![npm](https://img.shields.io/npm/v/nest-code-explorer)](https://www.npmjs.com/package/nest-code-explorer) [![license](https://img.shields.io/npm/l/nest-code-explorer)](LICENSE)

NestJS 프로젝트의 소스를 읽어 **클릭해서 내려가는 코드 탐색기**(단일 HTML)를 만든다. 앱을 띄우지 않고, DB 도 없이, ts-morph 로 TypeScript 를 정적 분석한다.

```bash
npx nest-code-explorer --open
```

## 왜 만들었나

처음 보는 NestJS 저장소에서 알고 싶은 건 늘 같았다. **"이 API 를 치면 어떤 클래스의 어떤 함수를 거쳐 어느 테이블·외부 시스템까지 가는가."** 그런데 그걸 보려면 Controller 를 열고, 주입된 Usecase 를 찾아 열고, 그 안의 Service 를 또 열고… 파일을 열 개쯤 따라가야 했다.

기존 도구는 이 질문에 맞지 않았다.

- 모듈 DI 그래프(nestjs-spelunker 류)는 **모듈** 단위라 함수가 안 보인다.
- Compodoc 은 클래스별 **문서**라 흐름이 이어지지 않는다.
- OpenTelemetry/Jaeger 는 **실행 중인 요청**을 추적하는 것이라 앱과 인프라를 띄워야 하고, 코드를 이해하는 용도가 아니다.

그래서 만들었다. Controller 목록에서 시작해 누르면 주입받는 클래스가 펼쳐지고, 클래스를 누르면 메서드·한글 주석·에러 코드·테이블이 나오며, API 하나를 고르면 큐 경계를 넘어 Worker 까지 지나가는 메서드 순서가 그려지는 것. 프로젝트 이름은 코드에 없고 규약은 전부 설정 파일 하나에 있어서 어느 NestJS 프로젝트에나 붙는다.

## 사용법

### 1. 일단 실행해 본다

NestJS 프로젝트 루트(`tsconfig.json` 이 있는 폴더)에서 한 줄.

```bash
npx nest-code-explorer --serve --open     # 파일을 남기지 않고 http://localhost:4545 로 본다
```

설치할 것은 없다. 기동할 때 한 번 분석해 메모리에 들고 있으므로 저장소에 생성물이 생기지 않고 `.gitignore` 를 손댈 일도 없다. 코드가 바뀐 뒤 다시 보려면 서버를 다시 띄운다. 파일로 남겨 공유하거나 오프라인에서 열려면 `--serve` 대신 `--open` 만 준다(`docs/code-explorer.html` 생성). 첫 실행은 npx 가 패키지를 받느라 10초쯤 걸리고, 끝나면 `docs/code-explorer.html` 이 생기고 브라우저가 열린다. `*.controller.ts` / `*.usecase.ts` / `*.service.ts` / `*.repository.ts` / `*.guard.ts` 관례를 쓰는 프로젝트라면 여기서 끝이다.

### 2. 잘못 잡힌 게 있으면 설정 파일을 만든다

Usecase 나 Worker 같은 계층이 "Etc" 로 뭉치거나, 큐 경계가 안 이어지거나, 에러 코드·테이블·외부 시스템이 안 보이면 프로젝트 규약이 기본값과 다른 것이다. 설정 파일을 만들어 그 부분만 고친다.

```bash
npx nest-code-explorer --init      # code-explorer.config.json 생성 (기본값 전체 + 각 키 설명)
```

생성된 파일에서 보통 손대는 키는 넷이다.

| 키 | 언제 고치나 | 예 |
| --- | --- | --- |
| `layers[]` | 파일 이름 규칙이 다르거나 계층을 더 나누고 싶을 때 | `{ "name": "Usecase", "match": "\\.usecase\\.ts$", "column": 1, "color": "#7a4fd6" }` |
| `queue` | 큐를 쓸 때. `nestjs-bullmq`(`@Processor`/`@InjectQueue`) 또는 `manual-router`(Job 이름 상수 + switch 라우터) | `{ "type": "nestjs-bullmq" }` |
| `errors.className` | `new AppError('CODE')` 처럼 코드 문자열을 첫 인자로 받는 예외 클래스 | `{ "className": "AppError" }` |
| `externals[]` | 외부 API·SMTP 클라이언트 클래스를 말단 노드로 그리고 싶을 때 | `[{ "match": "^PaymentGateway$", "label": "PG API", "terminal": true }]` |

고친 뒤 다시 실행하면 같은 폴더의 설정 파일을 자동으로 읽는다.

```bash
npx nest-code-explorer --open
```

완성된 설정 예시: [`examples/order-app/code-explorer.config.json`](examples/order-app/code-explorer.config.json)(manual-router 큐, RawSQL/TypeORM, `AppError`, 외부 시스템 3종), [`fixtures/bullmq-app/code-explorer.config.json`](fixtures/bullmq-app/code-explorer.config.json)(`@nestjs/bullmq`).

### 3. 코드가 바뀌면 다시 돌린다

탐색기는 실행 시점의 소스를 읽은 정적 결과다. `package.json` 에 넣어 두면 편하다.

```json
"scripts": { "explore": "nest-code-explorer --serve --open" }
```

파일로 남기는 쪽은 `nest-code-explorer --no-svg --open`.

`--no-svg` 는 mermaid SVG 렌더(느림)를 빼고 탐색기 HTML 만 만든다. `docs/code-explorer.html` 은 vis-network 가 들어 있어 800KB 쯤 되므로 `.gitignore` 에 넣는 편이 낫다.

### 옵션

| 옵션 | 뜻 |
| --- | --- |
| `--serve` | 파일을 쓰지 않고 기동 때 한 번 분석해 로컬 HTTP 로 보여 준다 (온보딩용) |
| `--port <n>` | `--serve` 포트 (기본 4545) |
| `--open` | 탐색기를 기본 브라우저로 연다 (`--serve` 면 서버 주소를 연다) |
| `--init [--force]` | 기본값 전체를 `code-explorer.config.json` 으로 쓴다. 이미 있으면 `--force` 없이는 건드리지 않는다 |
| `--config <file>` | 설정 파일 경로 (기본 `code-explorer.config.json`, 없으면 기본값으로 실행) |
| `--no-svg` | 코드 지도(mermaid)의 SVG 렌더를 생략한다 |
| `--cwd <dir>` | 프로젝트 루트 (기본: 현재 디렉터리) |

생성물: `docs/code-explorer.html`(탐색기, 오프라인에서 열림), `docs/code-map.md`(import 그래프·클래스 다이어그램 mermaid 코드 지도), `docs/diagrams/*.svg`.

### 예시 프로젝트로 먼저 보기

아래 화면은 전부 [`examples/order-app`](examples/order-app) 을 분석한 것이다. 내 프로젝트에 붙이기 전에 어떤 게 나오는지 보고 싶으면 이걸 돌려 본다.

```bash
git clone https://github.com/whalebanana86/nest-code-explorer.git
cd nest-code-explorer/examples/order-app
npx nest-code-explorer --open
```

## 화면과 기능

### 구조 모드 — 진입점에서 클릭해 내려가기

처음엔 진입점만 보인다. HTTP Controller 와 큐·cron Worker 가 그룹으로 나뉜다.

![진입점](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/01-structure-entries.png)

노드를 누르면 주입받는 클래스가 오른쪽 열에 펼쳐진다. 지나온 경로는 검은 테두리와 진한 화살표로 남고, 화살표 색은 출발 계층 색을 따른다. 관계없는 노드는 흐려진다. 더블클릭은 접기, 드래그로 위치를 옮길 수 있다.

![경로 강조](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/02-structure-trail.png)

**전부 펼치기**를 누르면 전체 의존 그래프가 열별로 정렬돼 겹치지 않게 나온다. 여기서도 노드를 누르면 그 노드에서 나가는 화살표만 강조된다.

![전부 펼치기](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/03-structure-expand-all.png)

### 검색 — 클래스·메서드·주석·라우트·테이블·에러 코드

이름만이 아니라 한글 주석, `/v1/orders/:id` 같은 라우트, `ORDER_ITEM` 같은 테이블, `ORDER_NOT_FOUND` 같은 에러 코드로도 찾는다. 고르면 그 클래스까지 경로가 펼쳐지고 메서드가 열린다.

![검색](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/04-search.png)

### 상세 창 — 클래스 개요, 메서드 목록, 메서드 상세

오른쪽 창은 선택한 클래스의 계층·파일:줄(`↗` 로 에디터 열기)·의존 수·사용처 수를 머리에 두고, Overview 탭에 설명·Dependencies·Used by·Tables 를, Methods 탭에 메서드 목록(이름·한 줄 설명·반환 타입, 검색 가능)을 보여 준다. 메서드를 누르면 파라미터·반환·던지는 에러 코드·호출하는 메서드·접근 테이블·투입하는 Job·소스 위치가 나온다.

| Overview | Methods | 메서드 상세 |
| --- | --- | --- |
| ![Overview](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/05-inspector-overview.png) | ![Methods](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/06-inspector-methods.png) | ![메서드 상세](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/07-inspector-method.png) |

한 줄 설명은 메서드의 JSDoc 첫 줄이다. 주석을 달아 두면 탐색기가 곧 문서가 된다.

### 실행 경로 모드 — API·Job·Cron 하나가 지나가는 메서드 순서

왼쪽 목록에서 라우트, 큐 Job, cron 중 하나를 고르면 그 한 건이 지나가는 **메서드 단위** 경로가 그려진다. 실선은 메서드 호출, 점선은 테이블·외부 시스템·큐 경계다. 오른쪽에는 지나가는 메서드 수, 접근 테이블, 외부 시스템, 던질 수 있는 에러 코드가 요약된다.

![실행 경로: POST /v1/orders/:id/cancel](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/08-flow-cancel.png)

**큐 너머 Worker 처리까지 이어서**를 켜면 큐에 넣은 Job 을 어느 Worker 메서드가 꺼내 처리하는지까지 이어 그린다. 아래는 `ship` Job 이 택배사 API 를 부르고 다시 `notify` Job 을 넣어 메일까지 가는 2단 경로다.

![큐 너머 Worker 까지](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/09-flow-job-cross-queue.png)

요약 패널의 "지나가는 메서드" 는 들여쓰기가 호출 깊이다. 항목이나 노드를 누르면 그 메서드의 상세로 간다.

| 요약 패널 (POST /v1/orders, 큐 너머까지 16개 메서드) | cron 진입점 |
| --- | --- |
| ![요약](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/10-flow-summary.png) | ![cron](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/11-flow-cron.png) |

### 큰 프로젝트에서 — 폴더로 펼치기, 초점 모드

클래스가 수백 개면 "전부 펼치기" 는 읽을 수 없는 실뭉치가 된다. 그래서 세 가지를 둔다.

- **폴더로 펼치기**: 구조 모드의 왼쪽 목록은 폴더(`contexts/admin`, `domains/member` 처럼 `src/` 아래 두 단계, `folderDepth` 로 조절)별 클래스 수를 보여 주고, 체크한 폴더의 클래스만 그래프에 올린다. 거기서 노드를 누르면 폴더 밖 의존으로 더 내려간다.
- **초점 모드** (헤더 `초점` 버튼 또는 왼쪽 체크박스): 고른 노드로 들어오는 것과 거기서 나가는 것만 남기고 나머지는 숨긴다. 다른 노드를 고르면 그 기준으로 다시 잡힌다.
- **미니맵과 최소 줌**: 전체 맞춤은 글자가 읽히는 배율까지만 줄이고, 화면 밖에 노드가 있으면 오른쪽 아래 미니맵이 나타난다. 미니맵을 누르거나 끌면 그곳으로 간다. 노드를 눌러 펼칠 때는 줌을 유지하고 새 노드가 화면 밖일 때만 이동한다.
- **전부 펼치기 임계값**: 클래스가 60개를 넘으면 전부 펼치기 대신 안내를 띄우고 폴더 목록을 연다. 그래도 보고 싶으면 안내의 링크로 펼친다.

| 폴더로 펼치기 (`domains/order`, `domains/payment` 체크) | 초점 모드 (`OrderService` 기준) |
| --- | --- |
| ![폴더로 펼치기](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/12-folders.png) | ![초점 모드](https://raw.githubusercontent.com/whalebanana86/nest-code-explorer/main/docs/screenshots/13-focus.png) |

### 그 밖에

- 헤더의 **◧ 목록 / 상세 ◨** 로 좌우 창을 접을 수 있다. 상태는 브라우저에 저장된다.
- 파일:줄 옆 `↗` 는 에디터를 그 줄에서 연다. 헤더의 드롭다운에서 VS Code · Cursor · Windsurf · Zed · WebStorm · IntelliJ · Sublime 중 고르거나 "경로 복사"를 고른다(브라우저에 저장). 기본값은 설정 `editor`(프리셋 이름 또는 `{path}` `{line}` 을 쓰는 URL 템플릿).
- 화면 폭이 좁으면 헤더가 두 줄로 접힌다.

## 개발

```bash
npm run build                               # src/analyze.ts → dist/
npm test                                    # examples/order-app · fixtures/bullmq-app 분석 결과와 --init 을 검증 (node:test)
node scripts/readme-shots.js examples/order-app/docs/code-explorer.html docs/screenshots   # README 스크린샷 재생성 (headless Chrome)
```

구조: `src/analyze.ts`(분석기: 설정 로드 → import 그래프 → 클래스·메서드 색인 → 라우트·큐·SQL·에러·외부 추출 → HTML/markdown 출력), `template/code-explorer.template.html`(탐색기 UI, `__DATA__` 에 분석 결과가 들어간다), `bin/cli.js`, `examples/order-app`(예시 프로젝트), `fixtures/bullmq-app`(nestjs-bullmq 어댑터 픽스처), `test/`.

## 배포

```bash
npm version patch             # 태그 + 버전
npm publish --access public   # prepublishOnly 가 build + test 를 먼저 돈다
```

라이선스 MIT. vis-network(MIT) 를 HTML 에 인라인한다.
