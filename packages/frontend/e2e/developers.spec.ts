import { test, expect } from '@playwright/test';

test.describe('Developer Portal E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the XRPC calls for verification list
    await page.route('**/xrpc/net.atpassport.verify.list', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          domains: [
            {
              domain: 'test.bsky.social',
              status: 'verified',
              verifiedAt: new Date().toISOString(),
              isPublic: true,
              method: 'oauth'
            }
          ]
        }),
      });
    });

    // Consolidated Mock for Profile(s)
    await page.route(/\/xrpc\/app\.bsky\.actor\.getProfile(s)?/, async (route) => {
      const url = route.request().url();
      if (url.includes('getProfiles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            profiles: [
              {
                did: 'did:plc:mock',
                handle: 'test.bsky.social',
                displayName: 'Test User',
                avatar: 'https://placehold.jp/150x150.png'
              }
            ]
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            did: 'did:plc:mock',
            handle: 'test.bsky.social',
            displayName: 'Test User',
            avatar: 'https://placehold.jp/150x150.png'
          }),
        });
      }
    });
  });

  test('should login via Skip Auth mock and show dashboard', async ({ page }) => {
    await page.goto('/ja/developers/verify');
    await page.getByRole('button', { name: /別のハンドルを手動で入力する/ }).click();
    await page.getByRole('button', { name: 'Skip Login (E2E Mock)' }).click();

    await expect(page.getByText('test.bsky.social', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('公開', { exact: true })).toBeVisible();
  });

  test('should allow navigating between tabs', async ({ page }) => {
    await page.goto('/ja/developers/verify');
    await page.getByRole('button', { name: /別のハンドルを手動で入力する/ }).click();
    await page.getByRole('button', { name: 'Skip Login (E2E Mock)' }).click();

    await page.getByRole('tab', { name: /^新規ドメイン確認$/ }).click();
    await expect(page.getByText('方法を選択')).toBeVisible();

    await page.getByRole('tab', { name: /^ドメイン$/ }).click();
    await expect(page.getByText('test.bsky.social', { exact: true })).toBeVisible();
  });

  test('should handle file verification process and show in list', async ({ page }) => {
    await page.goto('/ja/developers/verify');
    await page.getByRole('button', { name: /別のハンドルを手動で入力する/ }).click();
    await page.getByRole('button', { name: 'Skip Login (E2E Mock)' }).click();

    await page.getByRole('tab', { name: /^新規ドメイン確認$/ }).click();
    await page.getByText('ファイル配置で検証').click();
    await page.getByPlaceholder('example.com').fill('e2e-test.com');
    
    // Mock submit success
    await page.route('**/xrpc/net.atpassport.verify.submit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock updated list after submission
    await page.route('**/xrpc/net.atpassport.verify.list', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          domains: [
            {
              domain: 'test.bsky.social',
              status: 'verified',
              verifiedAt: new Date().toISOString(),
              isPublic: true,
              method: 'oauth'
            },
            {
              domain: 'e2e-test.com',
              status: 'verified',
              verifiedAt: new Date().toISOString(),
              isPublic: true,
              method: 'file'
            }
          ]
        }),
      });
    });

    await page.locator('button:has-text("今すぐ検証する")').last().click();
    await expect(page.getByText('ドメイン e2e-test.com の所有権を確認しました。')).toBeVisible({ timeout: 10000 });

    // Go back to domains tab
    await page.getByRole('tab', { name: /^ドメイン$/ }).click();
    
    // Check if the new domain is visible
    await expect(page.getByText('e2e-test.com', { exact: true })).toBeVisible();
  });
});
