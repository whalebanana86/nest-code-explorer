# Changelog

## 0.2.4 (2026-09-17)

- 실행 경로 모드의 테이블 노드를 높이 고정 원통으로 직접 그린다. vis 의 `database` 모양은 라벨이 길수록 높이도 커져서 테이블끼리 겹치고 글자 양끝이 잘렸다.

## 0.2.3 (2026-09-17)

- README 사용법을 실행 순서(실행 → 설정 → 반복)로 다시 썼다. 코드 변경 없음.

## 0.2.2 (2026-09-17)

- 탐색기 제목이 템플릿에 박혀 있던 것("Push Platform 코드 탐색기")을 설정 `title` → `package.json` name → 폴더 이름 순으로 정한다.
- README 를 왜 만들었나 · 사용법 · 화면과 기능(스크린샷) 중심으로 다시 썼다. 스크린샷은 `scripts/readme-shots.js` 로 재생성한다.

## 0.2.1 (2026-09-17)

- `examples/order-app` 예시 프로젝트 추가 (manual-router 큐, RawSQL/TypeORM, cron, AppError, 외부 시스템, Guard). README 의 "push-platform 설정 참고" 를 이 예시로 대체.
- `test/example.test.js` 가 예시 분석 결과(라우트·큐 경계·테이블·에러·외부·cron)를 고정한다.

## 0.2.0 (2026-09-17)

- `--init [--force]`: 기본값 전체를 `code-explorer.config.json` 으로 생성 (`$comment` 에 섹션 설명). 이미 있으면 `--force` 없이는 건드리지 않는다.
- 설정 파일이 없으면(`--config` 로 지정하지 않은 경우) 기본값으로 실행한다. 이전에는 `config not found` 로 종료했다.
- 출력 디렉터리(`docs/`, `docs/diagrams/`)가 없으면 만든다. 이전에는 새 프로젝트에서 ENOENT 로 실패했다.
- `run({ configPath })` 가 선택 인자가 됐고 `defaultConfig()` / `initConfig()` 를 export 한다.

## 0.1.0 (2026-09-17)

- 첫 배포: 구조 모드·실행 경로 모드 탐색기(단일 HTML), mermaid 코드 지도, 큐 어댑터(manual-router / nestjs-bullmq / none).
