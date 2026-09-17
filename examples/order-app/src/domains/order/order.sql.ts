/** 주문 조회 SQL. 테이블 이름은 탐색기가 FROM/JOIN/UPDATE 에서 뽑는다 */
export const OrderSql = {
  findDetail() {
    return `SELECT o.ORDER_ID AS orderId, o.STATUS_CODE AS statusCode, o.TOTAL_AMOUNT AS totalAmount,
                   i.SKU AS sku, i.QTY AS qty
              FROM ORDERS o
              JOIN ORDER_ITEM i ON i.ORDER_ID = o.ORDER_ID
             WHERE o.ORDER_ID = :orderId AND o.TENANT_ID = :tenantId`;
  },
  findStaleDrafts() {
    return `SELECT ORDER_ID AS orderId
              FROM ORDERS
             WHERE STATUS_CODE = 'DRAFT' AND CREATED_AT < NOW() - INTERVAL 1 DAY`;
  },
};
