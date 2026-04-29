import { test, expect } from '@playwright/test';

test.describe('Legal Pages E2E', () => {
  test('should show Privacy Policy page', async ({ page }) => {
    await page.goto('/ja/privacy');
    // The title is in a Title component, we check for the text
    await expect(page.getByRole('heading', { level: 2 }).first()).toContainText(/プライバシーポリシー/);
    await expect(page.locator('body')).toContainText(/プライバシー/);
  });

  test('should show Terms of Service page', async ({ page }) => {
    await page.goto('/ja/terms');
    await expect(page.getByRole('heading', { level: 2 }).first()).toContainText(/利用規約/);
    await expect(page.locator('body')).toContainText(/規約/);
  });

  test('should be accessible from footer if it exists', async ({ page }) => {
    await page.goto('/ja');
    
    // Check for links in footer or navigation
    const privacyLink = page.getByRole('link', { name: /プライバシー/i });
    if (await privacyLink.isVisible()) {
      await privacyLink.click();
      await expect(page).toHaveURL(/\/privacy/);
    }

    await page.goto('/ja');
    const termsLink = page.getByRole('link', { name: /利用規約/i });
    if (await termsLink.isVisible()) {
      await termsLink.click();
      await expect(page).toHaveURL(/\/terms/);
    }
  });
});
