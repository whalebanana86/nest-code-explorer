export class CreateOrderRequest {
  items: { sku: string; qty: number; price: number }[];
  email: string;
}
export class CreateOrderResponse {
  orderId: string;
}
