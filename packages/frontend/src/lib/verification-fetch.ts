import dns from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const MAX_VERIFICATION_BYTES = 64 * 1024;

export type VerificationFetchResult =
  | { ok: true; content: string }
  | { ok: false; error: "dns_failed" | "private_ip" | "redirect_not_allowed" | "unreachable_url" | "response_too_large" | "connection_failed"; message: string };

export function isUnsafeIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const first = parts[0];
    const second = parts[1];
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 192 && second === 0) ||
      (first === 198 && (second === 18 || second === 19))
    );
  }

  if (net.isIPv6(ip)) {
    const lowerIp = ip.toLowerCase();
    return (
      lowerIp === "::1" ||
      lowerIp === "::" ||
      lowerIp.startsWith("64:ff9b:") ||
      lowerIp.startsWith("100:") ||
      lowerIp.startsWith("2001:db8:") ||
      lowerIp.startsWith("fc") ||
      lowerIp.startsWith("fd") ||
      lowerIp.startsWith("fe80:") ||
      lowerIp.startsWith("ff")
    );
  }

  return true;
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
