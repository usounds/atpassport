import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("FedCM well-known endpoint", () => {
  it("advertises config and shared endpoints on preview origin", async () => {
    const response = GET(new Request("https://preview.atpassport.net/.well-known/web-identity"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provider_urls: ["https://preview.atpassport.net/fedcm/config.json"],
      accounts_endpoint: "https://preview.atpassport.net/api/fedcm/accounts",
      login_url: "https://preview.atpassport.net/en/fedcm/login",
    });
  });

  it("advertises preview config URL in addition to apex on atpassport.net", async () => {
    const response = GET(new Request("https://atpassport.net/.well-known/web-identity"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provider_urls: [
        "https://atpassport.net/fedcm/config.json",
        "https://preview.atpassport.net/fedcm/config.json",
      ],
      accounts_endpoint: "https://atpassport.net/api/fedcm/accounts",
      login_url: "https://atpassport.net/en/fedcm/login",
    });
  });
});
