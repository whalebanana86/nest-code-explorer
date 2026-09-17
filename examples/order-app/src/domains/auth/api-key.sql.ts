/** API 키 조회 SQL (조회는 RawSQL, 쓰기는 TypeORM 이라는 관례) */
export const ApiKeySql = {
  findActiveByHash() {
    return `SELECT API_KEY_ID AS apiKeyId, TENANT_ID AS tenantId
              FROM API_KEY
             WHERE KEY_HASH = :hash AND STATUS_CODE = 'ACTIVE'`;
  },
};
