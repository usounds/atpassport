import { test, expect } from './coverage';

test.describe('Basic UI Flow', () => {
  // Ensure tests run sequentially to avoid rate limits and state conflicts
  test.describe.configure({ mode: 'serial' });

  test('should load the home page and show the title', async ({ page }) => {
    await page.goto('/en');
    
    // Check if the logo exists in the header
    const header = page.getByRole('banner');
    const logo = header.getByText('@passport').first();
    await expect(logo).toBeVisible();
    
    // Check that the Add Handle button is rendered
    const addButton = page.getByRole('button', { name: 'Add Handle' });
    await expect(addButton).toBeVisible();
  });

  test('should switch language', async ({ page }) => {
    await page.goto('/en');
    await page.waitForTimeout(2000);

    // Find and click language picker
    const langBtn = page.getByRole('button', { name: 'change_language' }).filter({ visible: true }).first();
    await expect(langBtn).toBeVisible();
    await langBtn.click();

    const jaItem = page.getByRole('menuitem', { name: '日本語' });
    await expect(jaItem).toBeVisible();
    await jaItem.click({ force: true });

    // URL should contain /ja
    await expect(page).toHaveURL(/\/ja/);

    // Verify translation change
    await expect(page.locator('body')).toContainText('登録済みハンドル');
  });

  test('should toggle theme', async ({ page }) => {
    await page.goto('/en');
    await page.waitForTimeout(2000);

    const html = page.locator('html');

    // Initial scheme. The label is "Toggle color scheme" from Nav.toggle_color_scheme
    const themeToggle = page.getByRole('button', { name: 'Toggle color scheme' }).filter({ visible: true }).first();
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();

    // Verify state change on <html>
    await expect(html).toHaveAttribute('data-mantine-color-scheme', /light|dark/);
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/en');
    await page.waitForTimeout(2000);

    // Click About link. Label is "About" from Nav.about
    
    // Check if any About link is visible globally (Drawer content is in a Portal outside <header>)
    if (!(await page.getByRole('link', { name: 'About' }).filter({ visible: true }).isVisible())) {
      // If not, open the burger menu
      await page.getByRole('button', { name: 'Toggle navigation' }).click();
      // Wait for drawer animation
      await page.waitForTimeout(1000);
    }
    
    const aboutLink = page.getByRole('link', { name: 'About' }).filter({ visible: true }).first();
    await expect(aboutLink).toBeVisible({ timeout: 10000 });
    await aboutLink.click();

    await expect(page).toHaveURL(/\/about/);
    // Check for title in the main content of About page
    await expect(page.getByRole('heading').filter({ hasText: /About/i }).first()).toBeVisible();
  });

  test('should register a new handle via modal and show it in the list', async ({ page }) => {
    // 1. Go to Japanese home page
    await page.goto('/ja');
    await page.waitForTimeout(2000);

    // 2. Click "ハンドルを追加" (Add Handle)
    const addBtnJa = page.getByRole('button', { name: 'ハンドルを追加' });
    await expect(addBtnJa).toBeVisible();
    await addBtnJa.click();

    // 3. Input handle and press Enter
    const handleInput = page.getByPlaceholder('example.bsky.social');
    await expect(handleInput).toBeVisible({ timeout: 10000 });
    await handleInput.fill('bsky.app');

    // 4. Check the consent checkbox if it exists
    const checkbox = page.locator('input[type="checkbox"]');
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }

    // 5. Submit the form
    await page.getByRole('button', { name: '追加する' }).click();

    // Wait for the modal and backdrop to completely disappear
    await expect(page.getByRole('dialog', { name: 'ハンドルを追加' })).not.toBeVisible({ timeout: 15000 });
    // Force a reload to ensure the list is refreshed from the server
    await page.reload();

    // 6. Verify the handle appears in the list on the main page
    // Use a more specific locator to ensure we find it in the list
    const listElement = page.locator('.picker-item').getByText('@bsky.app', { exact: true }).first();
    await expect(listElement).toBeVisible({ timeout: 20000 });

    // --- NEW: Example App Login Flow ---

    // 7. Navigate to the Example page
    await page.goto('/ja/example');
    await expect(page.getByRole('heading', { name: 'お試しアプリ' })).toBeVisible();

    // 8. Click "@passportでログイン"
    await page.getByRole('button', { name: '@passportでログイン' }).click();

    // 9. Now we should be on the Auth (Account Selection) page
    await expect(page).toHaveURL(/\/ja\/authentication\?callback=/);
    await expect(page.getByRole('heading', { name: 'ハンドルを選択してください' })).toBeVisible();

    // 10. Select the handle we just registered (bsky.app)
    const accountItem = page.getByTestId('auth-account-select').filter({ hasText: /@bsky\.app/ }).first();
    await expect(accountItem).toBeVisible({ timeout: 10000 });
    await expect(accountItem).toContainText('Bluesky', { timeout: 10000 });
    await accountItem.click();

    // 11. Verify we are back on the Example page and it shows results
    await expect(page).toHaveURL(/\/ja\/example/);
    await expect(page.getByRole('heading', { name: '2. 実行結果' })).toBeVisible();

    // 12. Check if the parameters are correctly returned
    await expect(page.locator('body')).toContainText('bsky.app');
    await expect(page.locator('body')).toContainText('did:plc:'); // DID format
    await expect(page.locator('body')).toContainText('https://'); // PDS URL format

    // 13. Verify device sharing button appears on home page
    await page.goto('/ja');
    await page.waitForTimeout(2000);
    const shareBtn = page.getByRole('button', { name: 'デバイス間で共有' }).first();
    await expect(shareBtn).toBeVisible();

    // 14. Verify sharing modal and link generation
    await page.route('**/api/share/create', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'e2e-mock-token' }),
      });
    });
    await shareBtn.click();
    await expect(page.getByRole('heading', { name: 'デバイス間で共有', exact: true })).toBeVisible();
    await expect(page.getByText(/e2e-mock-token/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'URLをコピー' })).toBeVisible();
    
    // 15. Close modal
    const modal = page.getByRole('dialog', { name: 'デバイス間で共有', exact: true });
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('should manage handles (move up/down, delete)', async ({ page }) => {
    // 1. Go to Japanese home page
    await page.goto('/ja');
    await page.waitForTimeout(2000);

    // 2. Add first handle: jay.bsky.social
    const addBtn = page.getByRole('button', { name: 'ハンドルを追加' });
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    
    const handleInput = page.getByPlaceholder('example.bsky.social');
    await expect(handleInput).toBeVisible({ timeout: 10000 });
    await handleInput.fill('jay.bsky.social');
    const checkbox = page.locator('input[type="checkbox"]');
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }
    await page.getByRole('button', { name: '追加する' }).click();
    await expect(page.getByRole('dialog', { name: 'ハンドルを追加' })).not.toBeVisible({ timeout: 15000 });
    await page.reload();
    await expect(page.locator('.picker-item').getByText('@jay.bsky.social', { exact: true }).first()).toBeVisible({ timeout: 20000 });

    // 3. Add second handle: paul.bsky.social
    await addBtn.click();
    await expect(handleInput).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder('example.bsky.social').fill('paul.bsky.social');
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }
    await page.getByRole('button', { name: '追加する' }).click();
    await expect(page.getByRole('dialog', { name: 'ハンドルを追加' })).not.toBeVisible({ timeout: 15000 });
    await page.reload();
    await expect(page.locator('.picker-item').getByText('@paul.bsky.social', { exact: true }).first()).toBeVisible({ timeout: 20000 });

    // 4. Verify initial order: jay.bsky.social should be first, paul.bsky.social second
    const items = page.locator('.picker-item');
    await expect(items.nth(0)).toContainText('jay.bsky.social', { timeout: 15000 });
    await expect(items.nth(1)).toContainText('paul.bsky.social', { timeout: 15000 });

    // 5. Move "jay.bsky.social" down
    await items.nth(0).getByRole('button').click();
    await page.getByRole('menuitem', { name: '下に移動' }).click();

    // 6. Verify order changed: paul.bsky.social should be first, jay.bsky.social second
    await expect(items.nth(0)).toContainText('paul.bsky.social', { timeout: 15000 });
    await expect(items.nth(1)).toContainText('jay.bsky.social', { timeout: 15000 });

    // 7. Move "jay.bsky.social" up
    await items.nth(1).getByRole('button').click();
    await page.getByRole('menuitem', { name: '上に移動' }).click();

    // 8. Verify order changed back: jay.bsky.social should be first, paul.bsky.social second
    await expect(items.nth(0)).toContainText('jay.bsky.social', { timeout: 15000 });
    await expect(items.nth(1)).toContainText('paul.bsky.social', { timeout: 15000 });

    // 9. Verify order persistence after reload
    // Give a small delay to ensure revalidatePath and session refresh are completed
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForTimeout(2000); // Wait for metadata fetch on client side
    await expect(items.nth(0)).toContainText('jay.bsky.social', { timeout: 15000 });
    await expect(items.nth(1)).toContainText('paul.bsky.social', { timeout: 15000 });

    // 10. Refresh metadata
    await items.nth(0).getByRole('button').click();
    const refreshItem = page.getByRole('menuitem', { name: 'メタデータを更新' });
    await expect(refreshItem).toBeVisible();
    await refreshItem.click();
    // Wait for the update process to finish (loading state on the action icon disappears)
    await expect(items.nth(0).getByRole('button')).toBeEnabled();

    // 11. Delete "jay.bsky.social"
    await items.nth(0).getByRole('button').click();
    await page.getByRole('menuitem', { name: '削除' }).click();

    // Confirm deletion in modal
    await expect(page.getByRole('heading', { name: '削除の確認' })).toBeVisible();
    await page.getByRole('button', { name: '削除', exact: true }).click();

    // 12. Verify "jay.bsky.social" is gone
    await expect(page.getByText('jay.bsky.social', { exact: true })).not.toBeVisible({ timeout: 15000 });
    await expect(items.nth(0)).toContainText('paul.bsky.social');
  });
});
