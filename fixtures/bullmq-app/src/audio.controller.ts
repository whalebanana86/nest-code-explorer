import { Controller, Post, Version } from './stubs';
import { AudioService } from './audio.service';

/** 오디오 변환 요청 */
@Controller('audio')
export class AudioController {
  constructor(private readonly audio: AudioService) {}

  /** 변환 Job 을 큐에 넣는다 */
  @Post('transcode')
  @Version('1')
  async transcode(): Promise<{ queued: boolean }> {
    await this.audio.enqueueTranscode('file.wav');
    return { queued: true };
  }
}
