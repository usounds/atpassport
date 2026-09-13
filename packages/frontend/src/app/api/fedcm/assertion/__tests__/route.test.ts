import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";
import { validateFedCmClient } from "@/lib/fedcm";
import { getAssociations } from "@/lib/models";
import { getFedCmSessionUuid } from "@/lib/session";

vi.mock("@/lib/fedcm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/fedcm")>();
  return { ...actual, validateFedCmClient: vi.fn() };
});
vi.mock("@/lib/models");
vi.mock("@/lib/session");

const makeRequest = (body: Record<string, string>, headers: HeadersInit = {}) => new Request(
  "https://atpassport.net/api/fedcm/assertion",
  {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "sec-fetch-dest": "webidentity",
      origin: "https://rp.example",
      ...headers,
    },
    body: new URLSearchParams(body),
  },
);

describe("FedCM assertion endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects direct requests without Sec-Fetch-Dest", async () => {
    const response = await POST(makeRequest({}, { "sec-fetch-dest": "empty" }));
    expect(response.status).toBe(400);
  });

  it("rejects a spoofed or unregistered client", async () => {
    vi.mocked(validateFedCmClient).mockResolvedValue(null);
    const response = await POST(makeRequest({
      client_id: "https://other.example",
      account_id: "did:plc:1",
    }));
    expect(response.status).toBe(403);
    expect(getFedCmSessionUuid).not.toHaveBeenCalled();
  });

  it("rejects missing sessions and accounts not owned by the session", async () => {
    vi.mocked(validateFedCmClient).mockResolvedValue({ origin: "https://rp.example", registration: null });
    vi.mocked(getFedCmSessionUuid).mockResolvedValueOnce(null).mockResolvedValueOnce("uuid");
    vi.mocked(getAssociations).mockResolvedValue([]);
    const body = { client_id: "https://rp.example", account_id: "did:plc:other" };

    expect((await POST(makeRequest(body))).status).toBe(401);
    expect((await POST(makeRequest(body))).status).toBe(403);
  });

  it("returns a non-authentication handle token with credentialed CORS", async () => {
    vi.mocked(validateFedCmClient).mockResolvedValue({ origin: "https://rp.example", registration: null });
    vi.mocked(getFedCmSessionUuid).mockResolvedValue("uuid");
    vi.mocked(getAssociations).mockResolvedValue([
      {
        uuid: "uuid",
        did: "did:plc:1",
        handle: "alice.bsky.social",
        pdsUrl: "https://pds.example",
        createdAt: "now",
      },
    ]);

    const response = await POST(makeRequest({
      client_id: "https://rp.example",
      account_id: "did:plc:1",
    }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://rp.example");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(JSON.parse(data.token)).toEqual({
      v: 1,
      did: "did:plc:1",
      handle: "alice.bsky.social",
    });
  });
});
