import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { validateFedCmClient } from "@/lib/fedcm";

vi.mock("@/lib/fedcm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/fedcm")>();
  return { ...actual, validateFedCmClient: vi.fn() };
});

describe("FedCM client metadata endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unregistered clients", async () => {
    vi.mocked(validateFedCmClient).mockResolvedValue(null);
    const request = new Request(
      "https://atpassport.net/api/fedcm/client_metadata?client_id=https%3A%2F%2Frp.example",
      { headers: { "sec-fetch-dest": "webidentity", origin: "https://rp.example" } },
    );
    expect((await GET(request)).status).toBe(403);
  });

  it("returns registered policy links for registered clients", async () => {
    vi.mocked(validateFedCmClient).mockResolvedValue({
      origin: "https://app.rp.example",
      registration: {
        domain: "rp.example",
        verifiedByDid: "did:plc:1",
        status: "approved",
        verifiedAt: "now",
        method: "oauth",
        privacyPolicyUrl: "https://legal.rp.example/privacy",
        termsOfServiceUrl: "https://rp.example/legal/terms",
      },
    });
    const request = new Request(
      "https://atpassport.net/api/fedcm/client_metadata?client_id=https%3A%2F%2Fapp.rp.example",
      { headers: { "sec-fetch-dest": "webidentity", origin: "https://app.rp.example" } },
    );
    const response = await GET(request);
    expect(await response.json()).toEqual({
      privacy_policy_url: "https://legal.rp.example/privacy",
      terms_of_service_url: "https://rp.example/legal/terms",
    });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://app.rp.example");
  });

  it("omits optional policy links when the registration has none", async () => {
    vi.mocked(validateFedCmClient).mockResolvedValue({
      origin: "https://rp.example",
      registration: {
        domain: "rp.example",
        verifiedByDid: "did:plc:1",
        status: "approved",
        verifiedAt: "now",
      },
    });
    const request = new Request(
      "https://atpassport.net/api/fedcm/client_metadata?client_id=https%3A%2F%2Frp.example",
      { headers: { "sec-fetch-dest": "webidentity", origin: "https://rp.example" } },
    );

    expect(await (await GET(request)).json()).toEqual({});
  });
});
