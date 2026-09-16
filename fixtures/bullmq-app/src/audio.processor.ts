import { Job, Processor, WorkerHost } from './stubs';
import { AudioRepository } from './audio.repository';
import { MailProvider } from './mail.service';

/** audio 큐의 Job 을 처리한다 (@nestjs/bullmq WorkerHost 방식) */
@Processor('audio')
export class AudioProcessor extends WorkerHost {
  constructor(
    private readonly repo: AudioRepository,
    private readonly mail: MailProvider,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    await this.repo.markDone(String(job.data));
    await this.mail.send('done');
  }
}
