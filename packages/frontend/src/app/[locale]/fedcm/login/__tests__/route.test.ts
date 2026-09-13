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
    expect(response.headers.get("location")).toBe("https://atpassport.net/en?fedcm=1");
    expect(response.headers.get("Set-Login")).toBe("logged-out");
    expect(setFedCmSessionCookie).not.toHaveBeenCalled();
  });

  it("establishes the dedicated session and opens @passport when choosing a different account", async () => {
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

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://atpassport.net/en?fedcm=1");
    expect(response.headers.get("Set-Login")).toBe("logged-in");
    expect(setFedCmSessionCookie).toHaveBeenCalledWith("uuid");
  });

  it("establishes session but redirects to @passport when web session has no registered accounts", async () => {
    vi.mocked(getSessionUuid).mockResolvedValue("uuid");
    vi.mocked(getAssociations).mockResolvedValue([]);
    const response = await GET(
      new NextRequest("https://atpassport.net/en/fedcm/login"),
      { params: Promise.resolve({ locale: "en" }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://atpassport.net/en?fedcm=1");
    expect(response.headers.get("Set-Login")).toBe("logged-out");
    expect(setFedCmSessionCookie).toHaveBeenCalledWith("uuid");
  });

  it("uses the public host for redirects when bound to 0.0.0.0:3001", async () => {
    vi.mocked(getSessionUuid).mockResolvedValue(null);
    const response = await GET(
      new NextRequest("http://0.0.0.0:3001/en/fedcm/login", {
        headers: {
          host: "dev.atpassport.net",
          "x-forwarded-proto": "https",
        },
      }),
      { params: Promise.resolve({ locale: "en" }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://dev.atpassport.net/en?fedcm=1");
  });

  it("closes the FedCM login window when explicitly requested with close=1", async () => {
    vi.mocked(getSessionUuid).mockResolvedValue("uuid");
    const response = await GET(
      new NextRequest("https://atpassport.net/en/fedcm/login?close=1"),
      { params: Promise.resolve({ locale: "en" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Login")).toBe("logged-in");
    expect(await response.text()).toContain("IdentityProvider.close()");
  });
});
