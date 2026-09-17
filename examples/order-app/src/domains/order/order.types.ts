export type CreateOrderCommand = { tenantId: string; items: { sku: string; qty: number; price: number }[] };
export type OrderDetail = { orderId: string; statusCode: string; totalAmount: number; items: { sku: string; qty: number }[] };
