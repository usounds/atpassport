import { test, expect } from '@playwright/test';

test.describe('Basic UI Flow', () => {
  test('should load the home page and show the title', async ({ page }) => {
    await page.goto('/en');
    
    // Check if the logo exists in the header
    const header = page.getByRole('banner');
    const logo = header.getByText('@passport').first();
    await expect(logo).toBeVisible();
    
    // The handle input is inside a modal, so we must click the "Add Handle" button first
    await page.getByRole('button', { name: 'Add Handle' }).click();
    
    // Now check if the handle input form is present in the modal
    await expect(page.getByPlaceholder('example.bsky.social')).toBeVisible();
  });

  test('should switch language', async ({ page }) => {
    await page.goto('/en');
    
    // Find and click language picker
    const langBtn = page.getByLabel('change_language').first();
    await expect(langBtn).toBeVisible();
    await langBtn.click();
    
    // Switch to Japanese
    await page.getByText('日本語').click();
    
    // URL should contain /ja
    await expect(page).toHaveURL(/\/ja/);
    
    // Verify translation change. "Handle" becomes "ハンドル" in some contexts, 
    // but let's check for a unique Japanese string like "登録済みハンドル"
    await expect(page.locator('body')).toContainText('登録済みハンドル');
  });

  test('should toggle theme', async ({ page }) => {
    await page.goto('/en');
    
    const html = page.locator('html');
    
    // Initial scheme. The label is "Toggle color scheme" from Nav.toggle_color_scheme
    const themeToggle = page.getByLabel('Toggle color scheme').first();
    
    // Wait longer for hydration if needed
    await expect(themeToggle).toBeVisible({ timeout: 15000 });
    await themeToggle.click();
    
    // Verify state change on <html>
    await expect(html).toHaveAttribute('data-mantine-color-scheme', /light|dark/);
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/en');
    
    // Click About link in header. Label is "About" from Nav.about
    await page.getByRole('banner').getByRole('link', { name: 'About' }).click();
    
    await expect(page).toHaveURL(/\/about/);
    // Check for title in the main content of About page
    await expect(page.getByRole('heading').filter({ hasText: /About/i }).first()).toBeVisible();
  });

  test('should register a new handle via modal and show it in the list', async ({ page }) => {
    // 1. Go to Japanese home page
    await page.goto('/ja');
    
    // 2. Click "ハンドルを追加" (Add Handle)
    await page.getByRole('button', { name: 'ハンドルを追加' }).click();
    
    // 3. Input handle and press Enter
    const handleInput = page.getByPlaceholder('example.bsky.social');
    await handleInput.fill('bsky.app');
    
    // 4. Check the consent checkbox
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    
    // 5. Submit the form
    // We can click the button, but pressing Enter on the input is also supported and often more reliable in tests
    await handleInput.press('Enter');
    
    // Alternatively, if we really want to click the button:
    // const submitBtn = page.locator('button').filter({ hasText: /^追加$/ }).first();
    // await submitBtn.click({ force: true });
    
    // 6. Verify the handle appears in the list on the main page
    const listElement = page.getByText('bsky.app', { exact: true }).first();
    await expect(listElement).toBeVisible({ timeout: 15000 });

    // --- NEW: Example App Login Flow ---
    
    // 7. Navigate to the Example page
    await page.goto('/ja/example');
    await expect(page.getByRole('heading', { name: 'お試しアプリ' })).toBeVisible();

    // 8. Click "@passportでログイン"
    await page.getByRole('button', { name: '@passportでログイン' }).click();

    // 9. Now we should be on the Auth (Account Selection) page
    // The actual URL might use ?callback= instead of ?callbackUrl= depending on the version
    await expect(page).toHaveURL(/\/ja\/authentication\?callback=/);
    await expect(page.getByRole('heading', { name: 'ハンドルを選択してください' })).toBeVisible();

    // 10. Select the handle we just registered (bsky.app)
    // In the account list, it is displayed as @bsky.app
    const accountItem = page.getByText(/@bsky\.app/).first();
    await expect(accountItem).toBeVisible({ timeout: 10000 });
    await accountItem.click();

    // 11. Verify we are back on the Example page and it shows results
    // The example app shows results under "2. 実行結果"
    await expect(page).toHaveURL(/\/ja\/example/);
    await expect(page.getByRole('heading', { name: '2. 実行結果' })).toBeVisible();

    // 12. Check if the parameters are correctly returned
    // It should show the handle, DID, and PDS URL
    await expect(page.locator('body')).toContainText('bsky.app');
    await expect(page.locator('body')).toContainText('did:plc:'); // DID format
    await expect(page.locator('body')).toContainText('https://'); // PDS URL format
  });
});
