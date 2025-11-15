import { env } from './env.server.ts';

const EDGE_WEBHOOK_SECRET = env.EDGE_WEBHOOK_SECRET;

export class WebhookAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookAuthError';
  }
}

export function ensureWebhookSecret(authorizationHeader: string | null | undefined): void {
  if (!EDGE_WEBHOOK_SECRET) {
    throw new WebhookAuthError('EDGE_WEBHOOK_SECRET is not configured');
  }

  const raw = authorizationHeader?.trim();

  if (!raw?.startsWith('Bearer ')) {
    throw new WebhookAuthError('Missing or malformed Authorization header');
  }

  const token = raw.slice('Bearer '.length).trim();

  if (!token) {
    throw new WebhookAuthError('Authorization header contains empty token');
  }

  if (token !== EDGE_WEBHOOK_SECRET) {
    throw new WebhookAuthError('Invalid webhook secret');
  }
}
