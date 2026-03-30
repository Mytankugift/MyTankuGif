import { env } from '../../config/env';

const APIFY_BASE = 'https://apify.epayco.co';

export interface EpaycoSmartSessionPayload {
  checkout_version: '2';
  name: string;
  currency: string;
  amount: number;
  description?: string;
  lang?: 'ES' | 'EN';
  country?: string;
  invoice?: string;
  response: string;
  confirmation: string;
  taxBase?: number;
  tax?: number;
  taxIco?: number;
  method?: 'POST' | 'GET';
  extras?: Record<string, string>;
  billing?: {
    email?: string;
    name?: string;
    address?: string;
    typeDoc?: string;
    numberDoc?: string;
    callingCode?: string;
    mobilePhone?: string;
  };
}

function decodeJwtExpMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Cliente Apify para ePayco Smart Checkout (sesión checkout v2).
 * Token en memoria con caducidad según JWT.
 */
export class EpaycoApifyService {
  private token: string | null = null;
  private tokenExpiresAtMs = 0;

  private getBasicAuthHeader(): string {
    const raw = `${env.EPAYCO_PUBLIC_KEY}:${env.EPAYCO_PRIVATE_KEY}`;
    return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && now < this.tokenExpiresAtMs - 60_000) {
      return this.token;
    }

    const res = await fetch(`${APIFY_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getBasicAuthHeader(),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apify login failed: ${res.status} ${text}`);
    }

    const body = (await res.json()) as { token?: string };
    if (!body.token) {
      throw new Error('Apify login: respuesta sin token');
    }

    this.token = body.token;
    const expMs = decodeJwtExpMs(body.token);
    this.tokenExpiresAtMs = expMs ?? now + 50 * 60 * 1000;

    return body.token;
  }

  /**
   * Crea sesión Smart Checkout y devuelve sessionId para checkout-v2.js
   */
  async createSmartSession(payload: EpaycoSmartSessionPayload): Promise<{ sessionId: string }> {
    const accessToken = await this.getAccessToken();

    const res = await fetch(`${APIFY_BASE}/payment/session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Apify create session: respuesta no JSON: ${raw.slice(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(`Apify create session: ${res.status} ${raw.slice(0, 500)}`);
    }

    const obj = parsed as {
      success?: boolean;
      data?: { sessionId?: string };
      titleResponse?: string;
      textResponse?: string;
    };

    const sessionId = obj.data?.sessionId;
    if (!sessionId) {
      throw new Error(
        `Apify create session: sin sessionId. ${obj.titleResponse || ''} ${obj.textResponse || ''} ${raw.slice(0, 300)}`
      );
    }

    return { sessionId };
  }
}
