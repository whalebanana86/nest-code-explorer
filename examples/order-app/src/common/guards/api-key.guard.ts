import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiKeyService } from '../../domains/auth/api-key.service';
import { AppError } from '../app-error';

/** X-Api-Key 헤더를 검증해 request.tenantId 를 채운다 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-api-key'];
    if (!key) throw new AppError('AUTH_KEY_MISSING');
    req.tenantId = await this.apiKeyService.verify(String(key));
    return true;
  }
}
