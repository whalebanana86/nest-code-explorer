# nest-code-explorer

Static code explorer for NestJS projects. It reads your TypeScript sources with ts-morph (no app boot, no database) and generates an interactive single-file HTML explorer plus a mermaid code map: entry points (controllers, queue workers, cron) → injected classes → methods, JSDoc, thrown error codes, touched tables, queue boundaries, and per-request execution paths. Configured entirely by one JSON file; works offline.

```bash
npx nest-code-explorer --config code-explorer.config.json --open
```

---

NestJS 프로젝트의 소스를 정적 분석(ts-morph)해서 두 가지를 만든다. 앱을 띄우지 않으며 DB 도 필요 없다.

- **인터랙티브 코드 탐색기** (`code-explorer.html`, 단일 파일·오프라인): 진입점(Controller / Worker)에서 주입 클래스를 클릭으로 펼치는 구조 모드, HTTP 라우트·큐 Job·Cron 한 건이 지나가는 메서드 순서를 그리는 실행 경로 모드, 메서드 시그니처·JSDoc·에러 코드·접근 테이블·호출 관계를 보여 주는 Inspector, 전체 단어 검색
- **코드 지도** (`code-map.md` + mermaid/SVG): 파일 import 그래프, 계층별 클래스 다이어그램, 메서드 색인

## 사용

```bash
# 프로젝트 루트에서 (tsconfig.json 이 있는 곳)
npx nest-code-explorer --open           # 설정 파일 없으면 기본값으로 분석해 브라우저로 연다
npx nest-code-explorer --init           # 기본값 전체를 code-explorer.config.json 으로 생성 (있으면 --force 없이는 안 덮어씀)
npx nest-code-explorer --config code-explorer.config.json --open
npx nest-code-explorer --no-svg          # mermaid SVG 렌더 생략 (빠름)
```

설정 파일이 없으면 기본값(`src`, Controller/Service/Repository/Guard 계층, `HttpException`, 큐 없음)으로 동작한다. 프로젝트 규약이 다르면 `--init` 으로 파일을 만든 뒤 필요한 줄만 고친다. 모든 키가 생략 가능하다.

## 설정 (`code-explorer.config.json`)

프로젝트 규약은 전부 설정에 있고 분석기에는 프로젝트 이름이 없다. `npx nest-code-explorer --init` 이 기본값 전체를 `$comment` 와 함께 써 준다. 주요 항목:

| 키 | 뜻 |
| --- | --- |
| `include` / `exclude` | 분석할 디렉터리(루트 기준)와 제외 정규식 |
| `layers[]` | 파일 경로 정규식 → 계층 이름, 그래프 열(`column`), 색, 진입점 그룹명(`entry`), 제외(`skip`) |
| `defaultLayer` | 어느 규칙에도 안 맞는 클래스의 계층 |
| `classDiagramGroups` / `indexOrder` | 코드 지도의 클래스 다이어그램 묶음과 색인 순서 |
| `http` | `@Controller` / `@Get` … / `@Version` / `@Cron` 데코레이터 이름 |
| `queue` | 큐 경계 어댑터. `type: "nestjs-bullmq"`: `@Processor('q')` 클래스의 `process()` 또는 `@Process('name')` 메서드가 핸들러, `@InjectQueue('q')` 프로퍼티의 `.add('name')`/`.addBulk()` 가 생산 (키 `q` 또는 `q/name`). `type: "manual-router"`: Job 이름 상수 객체(`namesConst`)와 `case <namesConst>.X → this.<프로세서>.<메서드>()` 라우터 클래스. `type: "none"`(기본): 큐 경계 없음 |
| `sql` | named query 객체 관례(`XxxSql.name()`)와 테이블 추출 정규식 |
| `orm` | 엔티티 파일·`@Entity`·`@InjectRepository`·BaseRepository 메서드 목록 |
| `errors.className` | `new AppError('CODE')` 처럼 코드 문자열을 첫 인자로 받는 예외 클래스 |
| `externals[]` | 클래스 이름 정규식 → 외부 시스템 라벨. `terminal: true` 면 실행 경로 말단 노드 |
| `output` | `explorer`, `markdown`, `diagramsDir`. `template` 과 `visNetwork` 는 생략하면 패키지 내장 |

생략한 섹션은 NestJS 표준 관례 기본값을 쓴다(`include: ["src"]`, Controller/Service/Repository/Guard 계층, `HttpException`).

## 예시 프로젝트

| 경로 | 관례 |
| --- | --- |
| [`examples/order-app`](examples/order-app) | Controller → Usecase → Service → Repository/RawSQL, **manual-router** 큐(Job 이름 상수 + switch 라우터, Worker 가 다시 큐에 넣는 2단 경로), cron, `AppError` 코드, 외부 시스템 3종(PG·SMTP·택배사), Guard |
| [`fixtures/bullmq-app`](fixtures/bullmq-app) | **nestjs-bullmq** 어댑터 최소 예시(`@Processor` / `@InjectQueue`) |

```bash
git clone https://github.com/whalebanana86/nest-code-explorer.git
cd nest-code-explorer/examples/order-app
npx nest-code-explorer --open      # 의존성 설치 없이 소스만 읽어 docs/code-explorer.html 을 만든다
```

예시가 README 대로 분석되는지는 `test/example.test.js` 가 고정한다.

## 출력 JSON

탐색기 HTML 안의 `DATA` 객체가 분석 결과다: `layers[]`, `classes[]{ name, layer, file, line, description, deps[], table, external, externalTerminal, methods[]{ name, line, scope, isAsync, description, params[], returnType, calls[], sql[], tables[], jobs[], errors[], route, cron } }`, `jobHandlers`, `baseRepoMethods`. 다른 UI 를 붙이려면 이 구조를 쓰면 된다.

## 개발

```bash
npm run build                               # src/analyze.ts → dist/
npm test                                    # fixtures/bullmq-app 을 분석해 라우트·큐 경계·호출을 검증 (node:test)
node bin/shot.js <url> <width> <out.png>    # headless Chrome 스크린샷 + 헤더 레이아웃 수치 (반응형 확인)
```

## 배포

```bash
npm version patch        # 태그 + 버전
npm publish --access public   # prepublishOnly 가 build + test 를 먼저 돈다
```

라이선스 MIT. vis-network(MIT) 를 HTML 에 인라인한다.
