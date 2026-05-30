export function isAllowedCallbackUrl(callback: string): boolean {
  try {
    const url = new URL(callback);
    const hostname = url.hostname.toLowerCase();
    const isLoopback =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost");

    return url.protocol === "https:" || (url.protocol === "http:" && isLoopback);
  } catch {
    return false;
  }
}

export function getCallbackUrlError(callback: string): string | null {
  try {
    const url = new URL(callback);
    const hostname = url.hostname.toLowerCase();
    const isLoopback =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost");

    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
      return "Invalid callback URL: HTTPS is required";
    }

    return null;
  } catch {
    return "Invalid callback URL";
  }
}
