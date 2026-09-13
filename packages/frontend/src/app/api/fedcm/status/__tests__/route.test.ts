import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { getFedCmSessionUuid } from "@/lib/session";

vi.mock("@/lib/session");

const request = (site: string) => new Request(
  "https://atpassport.net/api/fedcm/status",
  { headers: { "sec-fetch-site": site } },
);

describe("FedCM session status endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects cross-site status checks", async () => {
    const response = await GET(request("cross-site"));

    expect(response.status).toBe(403);
    expect(getFedCmSessionUuid).not.toHaveBeenCalled();
  });

  it("reports only whether a valid dedicated session exists", async () => {
    vi.mocked(getFedCmSessionUuid).mockResolvedValueOnce(null).mockResolvedValueOnce("uuid");

    expect(await (await GET(request("same-origin"))).json()).toEqual({ ready: false });
    expect(await (await GET(request("same-origin"))).json()).toEqual({ ready: true });
  });
});
