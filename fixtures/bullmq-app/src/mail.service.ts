import { Injectable } from './stubs';

/** 외부 SMTP 로 메일을 보낸다 (externals 설정으로 말단 노드) */
@Injectable()
export class MailProvider {
  async send(_subject: string): Promise<void> {}
}
