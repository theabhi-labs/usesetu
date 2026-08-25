declare module 'xss-clean' {
  import { RequestHandler } from 'express';

  const xssClean: () => RequestHandler;

  export = xssClean;
}

declare module 'sib-api-v3-sdk' {
  export class ApiClient {
    static instance: {
      authentications: Record<string, { apiKey: string }>;
    };
  }

  export interface SendSmtpEmailPayload {
    sender: { email: string; name?: string };
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
  }

  export class TransactionalEmailsApi {
    sendTransacEmail(payload: SendSmtpEmailPayload): Promise<unknown>;
  }

  const SibApiV3Sdk: {
    ApiClient: typeof ApiClient;
    TransactionalEmailsApi: typeof TransactionalEmailsApi;
  };

  export default SibApiV3Sdk;
}

declare module 'supertest';
