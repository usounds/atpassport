import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "atpassport.net" })),
}));

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["en", "ja", "pt", "de", "fr", "es"],
    defaultLocale: "en",
  },
}));

import { GET } from "../route";

describe("oauth-client-metadata.json endpoint", () => {
  it("returns client metadata with public cache control", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("max-age=3600");
    expect(cacheControl).toContain("s-maxage=86400");

    const body = await response.json();
    expect(body).toMatchObject({
      client_id: "https://atpassport.net/oauth-client-metadata.json",
      client_name: "@passport",
      client_uri: "https://atpassport.net",
      application_type: "web",
    });
  });
});
