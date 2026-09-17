import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { ApiKeySql } from './api-key.sql';
import { AppError } from '../../common/app-error';

/** API 키 해시로 테넌트를 찾는다 */
@Injectable()
export class ApiKeyService {
  constructor(private readonly dataSource: DataSource) {}

  /** 키가 유효하면 tenantId 를 돌려주고 아니면 AUTH_INVALID_KEY */
  async verify(rawKey: string): Promise<string> {
    const hash = createHash('sha256').update(rawKey).digest('hex');
    const [row] = await this.dataSource.query(ApiKeySql.findActiveByHash(), [hash]);
    if (!row) throw new AppError('AUTH_INVALID_KEY');
    return String(row.tenantId);
  }
}
