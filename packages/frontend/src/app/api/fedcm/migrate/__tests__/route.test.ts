import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";
import {
  getFedCmSessionUuid,
  getSessionUuid,
  setFedCmSessionCookie,
} from "@/lib/session";

vi.mock("@/lib/session");

const request = (headers: HeadersInit = {}) => new Request(
  "http://0.0.0.0:3001/api/fedcm/migrate",
  { method: "POST", headers: { host: "localhost:3001", ...headers } },
);

const sameOriginHeaders = {
  origin: "http://localhost:3001",
  "sec-fetch-site": "same-origin",
};

describe("FedCM session migration endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects cross-site requests", async () => {
    const response = await POST(request({
      origin: "https://rp.example",
      "sec-fetch-site": "cross-site",
    }));

    expect(response.status).toBe(403);
    expect(getSessionUuid).not.toHaveBeenCalled();
  });

  it("rejects an Origin that does not match the public request host", async () => {
    const response = await POST(request({
      origin: "https://evil.example",
      "sec-fetch-site": "same-origin",
    }));

    expect(response.status).toBe(403);
    expect(getSessionUuid).not.toHaveBeenCalled();
  });

  it("does nothing without an existing web session", async () => {
    vi.mocked(getSessionUuid).mockResolvedValue(null);
    vi.mocked(getFedCmSessionUuid).mockResolvedValue(null);

    const response = await POST(request(sameOriginHeaders));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ready: false });
    expect(setFedCmSessionCookie).not.toHaveBeenCalled();
  });

  it("reports an existing FedCM session without exposing its UUID", async () => {
    vi.mocked(getSessionUuid).mockResolvedValue(null);
    vi.mocked(getFedCmSessionUuid).mockResolvedValue("fedcm-uuid");

    const response = await POST(request(sameOriginHeaders));

    expect(await response.json()).toEqual({ ready: true });
    expect(setFedCmSessionCookie).not.toHaveBeenCalled();
  });

  it("does not rewrite a matching FedCM session", async () => {
    vi.mocked(getSessionUuid).mockResolvedValue("uuid");
    vi.mocked(getFedCmSessionUuid).mockResolvedValue("uuid");

    const response = await POST(request(sameOriginHeaders));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ready: true });
    expect(setFedCmSessionCookie).not.toHaveBeenCalled();
  });

  it("creates a FedCM session from the existing web session", async () => {
    vi.mocked(getSessionUuid).mockResolvedValue("uuid");
    vi.mocked(getFedCmSessionUuid).mockResolvedValue(null);

    const response = await POST(request(sameOriginHeaders));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ready: true });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(setFedCmSessionCookie).toHaveBeenCalledWith("uuid");
  });
});
