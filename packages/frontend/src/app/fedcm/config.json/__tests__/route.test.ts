import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("FedCM config endpoint", () => {
  it("publishes the required IdP endpoints and active-mode branding", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      accounts_endpoint: "/api/fedcm/accounts",
      client_metadata_endpoint: "/api/fedcm/client_metadata",
      id_assertion_endpoint: "/api/fedcm/assertion",
      login_url: "/en/fedcm/login",
      supports_use_other_account: true,
    });
    expect(body.branding.icons[0]).toEqual({
      url: "https://atpassport.net/icon128.png",
      size: 128,
    });
  });
});
