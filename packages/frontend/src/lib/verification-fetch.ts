import dns from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const MAX_VERIFICATION_BYTES = 64 * 1024;

export type VerificationFetchResult =
  | { ok: true; content: string }
  | { ok: false; error: "dns_failed" | "private_ip" | "redirect_not_allowed" | "unreachable_url" | "response_too_large" | "connection_failed"; message: string };

function isUnsafeIPv4(parts: number[]): boolean {
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true;
  }
  const [first, second, third] = parts;
  return (
    first === 0 || // 0.0.0.0/8 current network
    first === 10 || // 10.0.0.0/8 private network
    (first === 100 && second >= 64 && second <= 127) || // 100.64.0.0/10 Shared Address Space (CGNAT)
    first === 127 || // 127.0.0.0/8 loopback
    (first === 169 && second === 254) || // 169.254.0.0/16 link-local / cloud metadata (AWS IMDS etc.)
    (first === 172 && second >= 16 && second <= 31) || // 172.16.0.0/12 private network
    (first === 192 && second === 0 && third === 0) || // 192.0.0.0/24 IETF Protocol Assignments
    (first === 192 && second === 0 && third === 2) || // 192.0.2.0/24 TEST-NET-1
    (first === 192 && second === 88 && third === 99) || // 192.88.99.0/24 6to4 relay anycast
    (first === 192 && second === 168) || // 192.168.0.0/16 private network
    (first === 198 && (second === 18 || second === 19)) || // 198.18.0.0/15 benchmarking
    (first === 198 && second === 51 && third === 100) || // 198.51.100.0/24 TEST-NET-2
    (first === 203 && second === 0 && third === 113) || // 203.0.113.0/24 TEST-NET-3
    first >= 224 // 224.0.0.0/4 multicast & 240.0.0.0/4 reserved & broadcast
  );
}

function parseIPv6Words(ip: string): number[] | null {
  let cleanIp = ip.toLowerCase();
  const zoneIndex = cleanIp.indexOf("%");
  if (zoneIndex !== -1) {
    cleanIp = cleanIp.slice(0, zoneIndex);
  }

  let embeddedIpv4Words: number[] | null = null;
  const lastColon = cleanIp.lastIndexOf(":");
  if (lastColon !== -1) {
    const tail = cleanIp.slice(lastColon + 1);
    if (tail.includes(".")) {
      const parts = tail.split(".").map(Number);
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        return null;
      }
      embeddedIpv4Words = [
        (parts[0] << 8) | parts[1],
        (parts[2] << 8) | parts[3],
      ];
      cleanIp = cleanIp.slice(0, lastColon) + ":0:0";
    }
  }

  const doubleColonCount = (cleanIp.match(/::/g) || []).length;
  if (doubleColonCount > 1) return null;

  let words: number[] = [];
  if (doubleColonCount === 1) {
    const [leftStr, rightStr] = cleanIp.split("::");
    const left = leftStr ? leftStr.split(":").map((s) => parseInt(s, 16)) : [];
    const right = rightStr ? rightStr.split(":").map((s) => parseInt(s, 16)) : [];
    if (
      left.some((w) => isNaN(w) || w < 0 || w > 0xffff) ||
      right.some((w) => isNaN(w) || w < 0 || w > 0xffff)
    ) {
      return null;
    }
    const missing = 8 - (left.length + right.length);
    if (missing < 0) return null;
    words = [...left, ...new Array(missing).fill(0), ...right];
  } else {
    words = cleanIp.split(":").map((s) => parseInt(s, 16));
    if (words.length !== 8 || words.some((w) => isNaN(w) || w < 0 || w > 0xffff)) {
      return null;
    }
  }

  if (embeddedIpv4Words) {
    words[6] = embeddedIpv4Words[0];
    words[7] = embeddedIpv4Words[1];
  }

  return words;
}

export function isUnsafeIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    return isUnsafeIPv4(parts);
  }

  if (net.isIPv6(ip)) {
    const words = parseIPv6Words(ip);
    if (!words) return true;

    // 1. Unspecified (::)
    if (words.every((w) => w === 0)) return true;

    // 2. Loopback (::1)
    if (words.slice(0, 7).every((w) => w === 0) && words[7] === 1) return true;

    // 3. IPv4-mapped (::ffff:x.x.x.x)
    if (words.slice(0, 5).every((w) => w === 0) && words[5] === 0xffff) {
      return isUnsafeIPv4([words[6] >> 8, words[6] & 0xff, words[7] >> 8, words[7] & 0xff]);
    }

    // 4. IPv4-translated (::ffff:0:x.x.x.x)
    if (words.slice(0, 4).every((w) => w === 0) && words[4] === 0xffff && words[5] === 0) {
      return isUnsafeIPv4([words[6] >> 8, words[6] & 0xff, words[7] >> 8, words[7] & 0xff]);
    }

    // 5. NAT64 well-known prefix (64:ff9b::/96)
    if (words[0] === 0x64 && words[1] === 0xff9b && words.slice(2, 6).every((w) => w === 0)) {
      return isUnsafeIPv4([words[6] >> 8, words[6] & 0xff, words[7] >> 8, words[7] & 0xff]);
    }

    // 6. NAT64 local prefix (64:ff9b:1::/48)
    if (words[0] === 0x64 && words[1] === 0xff9b && words[2] === 1) return true;

    // 7. 6to4 (2002::/16)
    if (words[0] === 0x2002) {
      return isUnsafeIPv4([words[1] >> 8, words[1] & 0xff, words[2] >> 8, words[2] & 0xff]);
    }

    // 8. Unique Local Address (fc00::/7)
    if ((words[0] & 0xfe00) === 0xfc00) return true;

    // 9. Link-Local unicast (fe80::/10)
    if ((words[0] & 0xffc0) === 0xfe80) return true;

    // 10. Site-Local (fec0::/10 - deprecated)
    if ((words[0] & 0xffc0) === 0xfec0) return true;

    // 11. Multicast (ff00::/8)
    if ((words[0] & 0xff00) === 0xff00) return true;

    // 12. Documentation (2001:db8::/32)
    if (words[0] === 0x2001 && words[1] === 0x0db8) return true;

    // 13. Discard prefix (100::/64)
    if (words[0] === 0x100 && words.slice(1, 4).every((w) => w === 0)) return true;

    // 14. Deprecated IPv4-compatible (::x.x.x.x)
    if (words.slice(0, 6).every((w) => w === 0) && words[7] > 1) {
      return isUnsafeIPv4([words[6] >> 8, words[6] & 0xff, words[7] >> 8, words[7] & 0xff]);
    }

    return false;
  }

  return true;
}

export async function safeFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const urlString = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const parsed = new URL(urlString);

  const isDev = process.env.NODE_ENV === "development" || process.env.E2E_TEST === "true";
  const isLoopback =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]" ||
    parsed.hostname.endsWith(".localhost");

  if (parsed.protocol !== "https:") {
    if (!(isDev && parsed.protocol === "http:" && isLoopback)) {
      throw new Error(`SSRF protection: Insecure protocol ${parsed.protocol}`);
    }
  }

  if (net.isIP(parsed.hostname)) {
    if (isUnsafeIp(parsed.hostname)) {
      if (!(isDev && isLoopback)) {
        throw new Error(`SSRF protection: Private/unsafe IP blocked: ${parsed.hostname}`);
      }
    }
  } else if (!isLoopback) {
    const addresses = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some((addr) => isUnsafeIp(addr.address))) {
      throw new Error(`SSRF protection: Domain resolves to private/unsafe IP: ${parsed.hostname}`);
    }
  }

  const signal = init?.signal ?? AbortSignal.timeout(10000);
  return await fetch(input, {
    ...init,
    signal,
    redirect: "error",
  });
}

function requestPinnedVerificationFile(domain: string, address: string, protocol: "http" | "https", timeoutMs: number): Promise<VerificationFetchResult> {
  const client = protocol === "https" ? https : http;

  return new Promise((resolve) => {
    const req = client.request({
      protocol: `${protocol}:`,
      hostname: address,
      port: protocol === "https" ? 443 : 80,
      path: "/.well-known/atpassport",
      method: "GET",
      servername: domain,
      headers: {
        Host: domain,
        Accept: "text/plain,*/*;q=0.8",
      },
      timeout: timeoutMs,
    }, (res) => {
      const statusCode = res.statusCode ?? 0;

      if (statusCode >= 300 && statusCode < 400) {
        res.resume();
        resolve({ ok: false, error: "redirect_not_allowed", message: "Redirects are not allowed." });
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        resolve({ ok: false, error: "unreachable_url", message: `Verification file returned HTTP ${statusCode}.` });
        return;
      }

      const chunks: Buffer[] = [];
      let size = 0;

      res.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > MAX_VERIFICATION_BYTES) {
          req.destroy(new Error("response_too_large"));
          return;
        }
        chunks.push(buffer);
      });

      res.on("end", () => {
        resolve({ ok: true, content: Buffer.concat(chunks).toString("utf8") });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });

    req.on("error", (error) => {
      if (error.message === "response_too_large") {
        resolve({ ok: false, error: "response_too_large", message: "Verification file is too large." });
        return;
      }
      resolve({ ok: false, error: "connection_failed", message: error.message || "Connection failed." });
    });

    req.end();
  });
}

export async function fetchVerificationFile(domain: string, protocol: "http" | "https" = "https", timeoutMs = 10000): Promise<VerificationFetchResult> {
  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(domain, { all: true, verbatim: true });
  } catch (error) {
    console.warn('[verification-fetch] DNS lookup failed for %s:', domain, error);
    return { ok: false, error: "dns_failed", message: "Could not resolve domain name." };
  }

  if (addresses.length === 0 || addresses.some((addr) => isUnsafeIp(addr.address))) {
    console.warn('[verification-fetch] Unsafe address blocked for %s:', domain, addresses.map((addr) => addr.address).join(", "));
    return { ok: false, error: "private_ip", message: "Access to private or reserved network addresses is not allowed." };
  }

  let lastError: VerificationFetchResult | null = null;
  for (const { address } of addresses) {
    const result = await requestPinnedVerificationFile(domain, address, protocol, timeoutMs);
    if (result.ok) return result;
    lastError = result;
  }

  return lastError ?? { ok: false, error: "connection_failed", message: "Connection failed." };
}
