import { Injectable } from './stubs';

@Injectable()
export class AudioRepository {
  /** 파일 행 저장 */
  async save(_file: string): Promise<void> {}
  /** 완료 표시 */
  async markDone(_file: string): Promise<void> {}
}
