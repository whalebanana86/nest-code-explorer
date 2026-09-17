/** 도메인 예외. 코드 문자열만 들고 다니고 메시지는 응답 필터에서 붙인다 (탐색기: errors.className) */
export class AppError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
