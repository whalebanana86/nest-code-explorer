import { Injectable } from '@nestjs/common';

/** 외부 SMTP (탐색기: externals 로 말단 노드) */
@Injectable()
export class MailProvider {
  async send(to: string, subject: string, body: string): Promise<void> {}
}
