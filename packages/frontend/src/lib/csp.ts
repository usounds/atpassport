export function createContentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean,
  isHttps = true,
  pathname = '/',
): string {
  const isProduction = !isDevelopment;
  // Browser OAuth discovers arbitrary PDS/authorization servers on these pages.
  const usesBrowserOAuth = /^\/(?:[a-z]{2}\/)?developers(?:\/verify(?:\/callback)?|\/?)\/?$/.test(pathname);
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDevelopment ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // Mantine uses style attributes for dynamic layout and component variables.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://public.api.bsky.app https://cloudflareinsights.com${usesBrowserOAuth || isDevelopment ? ' https:' : ''}${isDevelopment ? ' ws: wss:' : ''}`,
    "frame-src 'self' https://embed.bsky.app",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction && isHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
