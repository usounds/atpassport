import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { getAssociations } from "@/lib/models";
import { getSessionUuid, setFedCmSessionCookie } from "@/lib/session";

vi.mock("@/lib/models");
vi.mock("@/lib/session");

describe("FedCM login endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the user to @passport when no web session exists", async () => {
    vi.mocked(getSessionUuid).mockResolvedValue(null);
    const response = await GET(
      new NextRequest("https://atpassport.net/en/fedcm/login"),
      { params: Promise.resolve({ locale: "en" }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://atpassport.net/en");
    expect(response.headers.get("Set-Login")).toBe("logged-out");
    expect(setFedCmSessionCookie).not.toHaveBeenCalled();
  });

  it("establishes the dedicated session and closes the FedCM login window", async () => {
    vi.mocked(getSessionUuid).mockResolvedValue("uuid");
    vi.mocked(getAssociations).mockResolvedValue([
      {
        uuid: "uuid",
        did: "did:plc:1",
        handle: "alice.bsky.social",
        pdsUrl: "https://pds.example",
        createdAt: "now",
      },
    ]);
    const response = await GET(
      new NextRequest("https://atpassport.net/en/fedcm/login"),
      { params: Promise.resolve({ locale: "en" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Login")).toBe("logged-in");
    expect(setFedCmSessionCookie).toHaveBeenCalledWith("uuid");
    expect(await response.text()).toContain("IdentityProvider.close()");
  });
});
