import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("FedCM well-known endpoint", () => {
  it("advertises config and shared endpoints on the current IdP origin", async () => {
    const response = GET(new Request("https://dev.atpassport.net/.well-known/web-identity"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provider_urls: ["https://dev.atpassport.net/fedcm/config.json"],
      accounts_endpoint: "https://dev.atpassport.net/api/fedcm/accounts",
      login_url: "https://dev.atpassport.net/en/fedcm/login",
    });
  });
});
