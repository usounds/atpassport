import { describe, expect, it, vi, beforeEach } from "vitest";
import dns from "node:dns/promises";
import http from "node:http";
import { fetchVerificationFile, isUnsafeIp } from "../verification-fetch";

vi.mock("node:dns/promises", () => ({
  default: {
    lookup: vi.fn(),
  },
}));

vi.mock("node:http", () => ({
  default: {
    request: vi.fn(),
  },
}));

vi.mock("node:https", () => ({
  default: {
    request: vi.fn(),
  },
}));

describe("verification-fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks private and reserved IPv4 ranges", () => {
    expect(isUnsafeIp("10.0.0.1")).toBe(true);
    expect(isUnsafeIp("127.0.0.1")).toBe(true);
    expect(isUnsafeIp("169.254.169.254")).toBe(true);
    expect(isUnsafeIp("172.16.0.1")).toBe(true);
    expect(isUnsafeIp("192.168.0.1")).toBe(true);
    expect(isUnsafeIp("100.64.0.1")).toBe(true);
    expect(isUnsafeIp("198.18.0.1")).toBe(true);
    expect(isUnsafeIp("224.0.0.1")).toBe(true);
    expect(isUnsafeIp("93.184.216.34")).toBe(false);
  });

  it("blocks private and reserved IPv6 ranges", () => {
    expect(isUnsafeIp("::1")).toBe(true);
    expect(isUnsafeIp("fe80::1")).toBe(true);
    expect(isUnsafeIp("fc00::1")).toBe(true);
    expect(isUnsafeIp("fd00::1")).toBe(true);
    expect(isUnsafeIp("ff02::1")).toBe(true);
    expect(isUnsafeIp("2606:2800:220:1:248:1893:25c8:1946")).toBe(false);
  });

  it("does not connect when DNS resolves to an unsafe address", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);

    const result = await fetchVerificationFile("example.com", "http");

    expect(result).toEqual(expect.objectContaining({ ok: false, error: "private_ip" }));
    expect(http.request).not.toHaveBeenCalled();
  });
});
