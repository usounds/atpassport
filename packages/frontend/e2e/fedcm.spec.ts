import { expect, test } from "@playwright/test";

test.describe("FedCM handle input assist", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "FedCM is tested in Chromium");

  test("shows FedCM readiness on the home page when the dedicated session exists", async ({ page }) => {
    await page.route("**/api/fedcm/migrate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ready: true }),
      });
    });
    await page.route("**/api/fedcm/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ready: true }),
      });
    });

    await page.goto("/ja");

    await expect(page.getByText("FedCM 入力アシスト利用可能")).toBeVisible();
  });

  test("fills the handle selected by the browser without authenticating the RP", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "IdentityCredential", { value: class IdentityCredential {} });
      Object.defineProperty(navigator, "credentials", {
        configurable: true,
        value: {
          get: async () => ({
            token: JSON.stringify({
              v: 1,
              did: "did:plc:fedcm-test",
              username: "selected.bsky.social",
            }),
          }),
        },
      });
    });

    await page.goto("/en/example");
    await page.getByRole("button", { name: "Choose with @passport" }).click();
    await expect(page.getByLabel("Handle", { exact: true })).toHaveValue("selected.bsky.social");
    await expect(page).toHaveURL(/\/en\/example$/);
  });

  test("keeps the form and page intact when the user dismisses the chooser", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "IdentityCredential", { value: class IdentityCredential {} });
      Object.defineProperty(navigator, "credentials", {
        configurable: true,
        value: {
          get: async () => {
            throw new DOMException("Dismissed", "AbortError");
          },
        },
      });
    });

    await page.goto("/en/example");
    const input = page.getByLabel("Handle", { exact: true });
    await input.fill("unchanged.example");
    await page.getByRole("button", { name: "Choose with @passport" }).click();
    await expect(input).toHaveValue("unchanged.example");
    await expect(page).toHaveURL(/\/en\/example$/);
  });

  test("uses the existing redirect flow after a browser network failure", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "IdentityCredential", { value: class IdentityCredential {} });
      Object.defineProperty(navigator, "credentials", {
        configurable: true,
        value: {
          get: async () => {
            throw new DOMException("Network failed", "NetworkError");
          },
        },
      });
    });

    await page.goto("/en/example");
    await page.getByRole("button", { name: "Choose with @passport" }).click();
    await expect(page).toHaveURL(/\/en\/authentication\?callback=/);
  });
});
