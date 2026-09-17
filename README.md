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

```bash
# 프로젝트 루트(tsconfig.json 이 있는 곳)에서
npx nest-code-explorer --open              # 분석 → docs/code-explorer.html 생성 → 브라우저로 연다
npx nest-code-explorer --init              # 규약이 다르면: 기본 설정 전체를 code-explorer.config.json 으로 생성
npx nest-code-explorer --no-svg --open     # mermaid SVG 렌더 생략 (빠름)
```

| 옵션 | 뜻 |
| --- | --- |
| `--open` | 생성한 탐색기를 기본 브라우저로 연다 |
| `--init [--force]` | 기본값 전체를 `code-explorer.config.json` 으로 쓴다. 이미 있으면 `--force` 없이는 건드리지 않는다 |
| `--config <file>` | 설정 파일 경로 (기본 `code-explorer.config.json`, 없으면 기본값으로 실행) |
| `--no-svg` | 코드 지도(mermaid)의 SVG 렌더를 생략한다 |
| `--cwd <dir>` | 프로젝트 루트 (기본: 현재 디렉터리) |

설정 파일이 없으면 NestJS 표준 관례(`src`, `*.controller.ts` / `*.service.ts` / `*.repository.ts` / `*.guard.ts`, `HttpException`, 큐 없음)로 동작한다. 계층 이름·큐 방식·SQL 관례·에러 클래스·외부 시스템이 다르면 `--init` 으로 파일을 만들고 필요한 줄만 고친다. 모든 키가 생략 가능하고 각 키의 뜻은 생성된 파일의 `$comment` 에 있다.

설정 예시는 [`examples/order-app/code-explorer.config.json`](examples/order-app/code-explorer.config.json)(Job 이름 상수 + switch 라우터 큐, RawSQL/TypeORM, `AppError`, 외부 시스템)과 [`fixtures/bullmq-app/code-explorer.config.json`](fixtures/bullmq-app/code-explorer.config.json)(`@nestjs/bullmq`) 을 보면 된다. 아래 화면은 전부 `examples/order-app` 을 분석한 것이다.

```bash
git clone https://github.com/whalebanana86/nest-code-explorer.git
cd nest-code-explorer/examples/order-app
npx nest-code-explorer --open
```

생성물: `docs/code-explorer.html`(탐색기, vis-network 내장이라 오프라인에서 열림), `docs/code-map.md`(import 그래프·클래스 다이어그램 mermaid 코드 지도), `docs/diagrams/*.svg`.

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

### 그 밖에

- 헤더의 **◧ 목록 / 상세 ◨** 로 좌우 창을 접을 수 있다. 상태는 브라우저에 저장된다.
- 파일:줄 옆 `↗` 는 `vscode://` 링크로 에디터를 그 줄에서 연다.
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
