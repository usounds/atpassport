import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("FedCM well-known endpoint", () => {
  it("advertises the production config and shared endpoints", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provider_urls: ["https://atpassport.net/fedcm/config.json"],
      accounts_endpoint: "https://atpassport.net/api/fedcm/accounts",
      login_url: "https://atpassport.net/en/fedcm/login",
    });
  });
});
