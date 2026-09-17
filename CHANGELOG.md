# Changelog

## 0.2.0 (2026-09-17)

- `--init [--force]`: 기본값 전체를 `code-explorer.config.json` 으로 생성 (`$comment` 에 섹션 설명). 이미 있으면 `--force` 없이는 건드리지 않는다.
- 설정 파일이 없으면(`--config` 로 지정하지 않은 경우) 기본값으로 실행한다. 이전에는 `config not found` 로 종료했다.
- 출력 디렉터리(`docs/`, `docs/diagrams/`)가 없으면 만든다. 이전에는 새 프로젝트에서 ENOENT 로 실패했다.
- `run({ configPath })` 가 선택 인자가 됐고 `defaultConfig()` / `initConfig()` 를 export 한다.

## 0.1.0 (2026-09-17)

- 첫 배포: 구조 모드·실행 경로 모드 탐색기(단일 HTML), mermaid 코드 지도, 큐 어댑터(manual-router / nestjs-bullmq / none).
