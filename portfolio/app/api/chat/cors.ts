// lib/cors.ts
const ALLOW_ORIGINS = ["http://localhost:3001", "https://clt-nextjs-apps-frontend.vercel.app"]; // 프론트 주소들 나열

export function corsHeaders(origin?: string) {
  const allowed = origin && ALLOW_ORIGINS.includes(origin);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = origin!;
  return headers;
}
