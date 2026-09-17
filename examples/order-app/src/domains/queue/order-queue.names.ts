/** Job 이름 상수. 탐색기 manual-router 어댑터가 이 객체(namesConst)와 라우터의 switch 를 읽어 큐 경계를 잇는다 */
export const OrderJobName = {
  SHIP: 'ship',
  NOTIFY: 'notify',
} as const;
