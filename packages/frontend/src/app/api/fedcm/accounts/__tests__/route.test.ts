import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { getAssociations } from "@/lib/models";
import { getFedCmSessionUuid } from "@/lib/session";

vi.mock("@/lib/models");
vi.mock("@/lib/session");

const request = (headers?: HeadersInit) => new Request("https://atpassport.net/api/fedcm/accounts", { headers });

describe("FedCM accounts endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects direct requests without Sec-Fetch-Dest", async () => {
    const response = await GET(request());
    expect(response.status).toBe(400);
    expect(getFedCmSessionUuid).not.toHaveBeenCalled();
  });

  it("returns 401 and logged-out status without a FedCM session", async () => {
    vi.mocked(getFedCmSessionUuid).mockResolvedValue(null);
    const response = await GET(request({ "sec-fetch-dest": "webidentity" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("Set-Login")).toBe("logged-out");
  });

  it("returns handles as usernames without fake email addresses", async () => {
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

    const response = await GET(request({ "sec-fetch-dest": "webidentity" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Login")).toBe("logged-in");
    expect(await response.json()).toEqual({
      accounts: [{
        id: "did:plc:1",
        username: "alice.bsky.social",
        approved_clients: [],
      }],
    });
  });

  it("returns an empty account list without inventing an account", async () => {
    vi.mocked(getFedCmSessionUuid).mockResolvedValue("uuid");
    vi.mocked(getAssociations).mockResolvedValue([]);
    const response = await GET(request({ "sec-fetch-dest": "webidentity" }));
    expect(await response.json()).toEqual({ accounts: [] });
    expect(response.headers.get("Set-Login")).toBe("logged-out");
  });
});
