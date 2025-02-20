declare module 'paynow' {
  export class Paynow {
    constructor(integrationId: string, integrationKey: string);
    resultUrl: string;
    returnUrl: string;
    createPayment(reference: string, email: string): Payment;
    send(payment: Payment): Promise<InitResponse>;
    sendMobile(payment: Payment, phone: string, method: string): Promise<InitResponse>;
    pollTransaction(url: string): Promise<StatusResponse>;
  }

  export class Payment {
    add(name: string, price: number): void;
  }

  export interface InitResponse {
    success: boolean;
    error?: string;
    redirectUrl?: string;
    pollUrl?: string;
    instructions?: string;
  }

  export interface StatusResponse {
    paid(): boolean;
  }
} 