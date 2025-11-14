const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:5173';
const ALLOWED_HEADERS = 'authorization, x-client-info, apikey, content-type';
const ALLOWED_METHODS = 'GET, POST, OPTIONS';

export function getAllowedOrigin(): string {
  return Deno.env.get('ALLOWED_ORIGIN') ?? DEFAULT_ALLOWED_ORIGIN;
}

export function buildCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(),
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Credentials': 'true'
  };
}

export function createPreflightResponse(): Response {
  return new Response('ok', {
    headers: buildCorsHeaders()
  });
}
