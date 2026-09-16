# nest-code-explorer

NestJS 프로젝트의 소스를 정적 분석(ts-morph)해서 두 가지를 만든다. 앱을 띄우지 않으며 DB 도 필요 없다.

- **인터랙티브 코드 탐색기** (`code-explorer.html`, 단일 파일·오프라인): 진입점(Controller / Worker)에서 주입 클래스를 클릭으로 펼치는 구조 모드, HTTP 라우트·큐 Job·Cron 한 건이 지나가는 메서드 순서를 그리는 실행 경로 모드, 메서드 시그니처·JSDoc·에러 코드·접근 테이블·호출 관계를 보여 주는 Inspector, 전체 단어 검색
- **코드 지도** (`code-map.md` + mermaid/SVG): 파일 import 그래프, 계층별 클래스 다이어그램, 메서드 색인

## 사용

```bash
# 프로젝트 루트에서 (tsconfig.json 과 설정 파일이 있는 곳)
npx nest-code-explorer --config code-explorer.config.json --open
npx nest-code-explorer --no-svg          # mermaid SVG 렌더 생략 (빠름)
```

이 저장소(push-platform)에서는 `npm run graph:open` 이 이 명령을 부른다.

## 설정 (`code-explorer.config.json`)

프로젝트 규약은 전부 설정에 있고 분석기에는 프로젝트 이름이 없다. 주요 항목:

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

생략한 섹션은 NestJS 표준 관례 기본값을 쓴다(`include: ["src"]`, Controller/Service/Repository/Guard 계층, `HttpException`). 예시는 이 저장소 루트의 `code-explorer.config.json`(manual-router) 과 `fixtures/bullmq-app/code-explorer.config.json`(nestjs-bullmq).

## 출력 JSON

탐색기 HTML 안의 `DATA` 객체가 분석 결과다: `layers[]`, `classes[]{ name, layer, file, line, description, deps[], table, external, externalTerminal, methods[]{ name, line, scope, isAsync, description, params[], returnType, calls[], sql[], tables[], jobs[], errors[], route, cron } }`, `jobHandlers`, `baseRepoMethods`. 다른 UI 를 붙이려면 이 구조를 쓰면 된다.

## 개발

```bash
cd tools/code-explorer && npm run build     # src/analyze.ts → dist/
npm test                                    # fixtures/bullmq-app 을 분석해 라우트·큐 경계·호출을 검증 (node:test)
node bin/shot.js <url> <width> <out.png>    # headless Chrome 스크린샷 + 헤더 레이아웃 수치 (반응형 확인)
```

라이선스 MIT. vis-network(MIT) 를 HTML 에 인라인한다.
