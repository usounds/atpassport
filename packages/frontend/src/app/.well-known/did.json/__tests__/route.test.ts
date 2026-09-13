import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("did.json endpoint", () => {
  it("returns did:web document with public cache control", async () => {
    const response = await GET(new Request("https://atpassport.net/.well-known/did.json"));
    expect(response.status).toBe(200);

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("max-age=3600");
    expect(cacheControl).toContain("s-maxage=86400");

    const body = await response.json();
    expect(body).toEqual({
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: "did:web:atpassport.net",
      service: [
        {
          id: "#atpassport_appview",
          type: "AtprotoAppView",
          serviceEndpoint: "https://atpassport.net",
        },
      ],
    });
  });
});
