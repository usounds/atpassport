export function createContentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean,
  isHttps = true,
): string {
  const isProduction = !isDevelopment;
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://embed.bsky.app https://static.cloudflareinsights.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: https://cloudflareinsights.com",
    "frame-src 'self' https://embed.bsky.app",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction && isHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
