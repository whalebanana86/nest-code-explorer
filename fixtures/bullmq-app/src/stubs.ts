/* NestJS / BullMQ 데코레이터 스텁. 분석기는 데코레이터 이름만 보므로 실제 패키지가 없어도 된다 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
export const Controller = (_prefix?: string) => (_t: any) => undefined;
export const Post = (_path?: string) => (_t: any, _k?: any, _d?: any) => undefined;
export const Get = (_path?: string) => (_t: any, _k?: any, _d?: any) => undefined;
export const Version = (_v: string) => (_t: any, _k?: any, _d?: any) => undefined;
export const Injectable = () => (_t: any) => undefined;
export const Processor = (_q: string | { name: string }) => (_t: any) => undefined;
export const Process = (_name?: string) => (_t: any, _k?: any, _d?: any) => undefined;
export const InjectQueue = (_q: string) => (_t: any, _k?: any, _i?: any) => undefined;
export const Cron = (_expr: string) => (_t: any, _k?: any, _d?: any) => undefined;
export class WorkerHost {}
export type Job = { name: string; data: unknown };
export type Queue = { add(name: string, data: unknown): Promise<unknown>; addBulk(jobs: unknown[]): Promise<unknown> };
export class AppError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
