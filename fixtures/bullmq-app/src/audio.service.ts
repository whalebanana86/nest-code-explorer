import { AppError, Injectable, InjectQueue, Queue } from './stubs';
import { AudioRepository } from './audio.repository';

@Injectable()
export class AudioService {
  constructor(
    @InjectQueue('audio') private readonly queue: Queue,
    private readonly repo: AudioRepository,
  ) {}

  /** 파일을 기록하고 transcode Job 을 넣는다 */
  async enqueueTranscode(file: string): Promise<void> {
    if (!file) throw new AppError('AUDIO.FILE_REQUIRED');
    await this.repo.save(file);
    await this.queue.add('transcode', { file });
  }

  /** 여러 파일 일괄 */
  async enqueueMany(files: string[]): Promise<void> {
    await this.queue.addBulk(files.map((f) => ({ name: 'transcode', data: { f } })));
  }
}
