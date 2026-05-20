import { test, expect } from './coverage';

test.describe('Token Replay Attack Protection Flow', () => {
  // Ensure tests run sequentially to avoid rate limits and state conflicts
  test.describe.configure({ mode: 'serial' });

  test('should synchronize device handles using a token and then block token reuse', async ({ page }) => {
    // 1. Go to Japanese home page
    await page.goto('/ja');
    await page.waitForTimeout(2000);

    // 2. Click "ハンドルを追加" (Add Handle) to establish a session and add a handle
    const addBtn = page.getByRole('button', { name: 'ハンドルを追加' });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // 3. Input handle and press Enter
    const handleInput = page.getByPlaceholder('example.bsky.social');
    await expect(handleInput).toBeVisible({ timeout: 10000 });
    await handleInput.fill('e2e-sync.bsky.social');

    const checkbox = page.locator('input[type="checkbox"]');
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }

    // 4. Submit the form
    await page.getByRole('button', { name: '追加する' }).click();

    // Wait for the modal to completely disappear
    await expect(page.getByRole('dialog', { name: 'ハンドルを追加' })).not.toBeVisible({ timeout: 15000 });
    await page.reload();

    // Verify the handle appears in the list on the main page
    const listElement = page.locator('.picker-item').getByText('@e2e-sync.bsky.social', { exact: true }).first();
    await expect(listElement).toBeVisible({ timeout: 20000 });

    // 5. Click "デバイス間で共有" button to open the share modal
    const shareBtn = page.getByRole('button', { name: 'デバイス間で共有' }).first();
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Verify the share modal is open
    await expect(page.getByRole('heading', { name: 'デバイス間で共有', exact: true })).toBeVisible();

    // 6. Extract the real generated share URL from the DOM
    const urlTextElement = page.locator('div.mantine-Box-root').locator('text=/ja/share/');
    await expect(urlTextElement).toBeVisible({ timeout: 10000 });
    
    const shareUrl = await urlTextElement.textContent();
    expect(shareUrl).not.toBeNull();
    console.log('Generated Share URL:', shareUrl);

    // Extract the token from the URL path
    const urlObj = new URL(shareUrl!);
    const pathnameParts = urlObj.pathname.split('/');
    const token = pathnameParts[pathnameParts.length - 1];
    expect(token).toBeTruthy();
    console.log('Extracted Share Token:', token);

    // Close the share modal
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'デバイス間で共有', exact: true })).not.toBeVisible();

    // 7. Navigate to the generated sync URL to simulate the second device sync
    await page.goto(urlObj.pathname);
    await page.waitForTimeout(2000);

    // Verify the confirmation UI shows up with the safety badge and description
    await expect(page.getByText('🛡️ セキュア同期（1回限り有効）')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'ハンドル情報を同期しますか？' })).toBeVisible();
    await expect(page.getByText('複数のデバイスに同期を行う場合は、もう一度QRコードを再発行してください。')).toBeVisible();

    // 8. Click the sync button
    const syncButton = page.getByRole('button', { name: '元のデバイスの内容と同期する' });
    await expect(syncButton).toBeVisible();
    await syncButton.click();

    // Wait for the sync to complete and redirect to the home page
    await page.waitForURL(/\/ja$/, { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Verify we are back on the homepage and the handle is present (meaning sync was successful)
    await expect(page.locator('.picker-item').getByText('@e2e-sync.bsky.social', { exact: true }).first()).toBeVisible({ timeout: 20000 });

    // 9. REPLAY ATTACK PREVENTION CHECK: Try to access the same share URL again
    await page.goto(urlObj.pathname);
    await page.waitForTimeout(2000);

    // Verify the invalid/used token screen is shown with secure deactivation badge & locked shield icon
    await expect(page.getByText('安全のため無効化済み')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: '無効または使用済みのリンク' })).toBeVisible();
    await expect(page.getByText('同期用のリンクは一度しか使用できない「使い捨て」の仕組みになっています。')).toBeVisible();
  });
});
