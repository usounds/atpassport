import { expect, test, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const extensionPath = path.resolve('.output/chrome-mv3');

test.describe('popup', () => {
  let context: BrowserContext;

  test.beforeEach(async ({ browserName, playwright }) => {
    test.skip(browserName !== 'chromium', 'Chrome extensions require Chromium');

    context = await playwright.chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: false,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
  });

  test.afterEach(async () => {
    await context?.close();
  });

  test('loads registered handles from the API', async () => {
    await context.route('https://atpassport.net/api/user/handles', async route => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ handles: ['alice.test', 'bob.test'] }),
      });
    });

    const extensionId = await getExtensionId(context);
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(popup.getByRole('button', { name: /alice\.test/ })).toBeVisible();
    await expect(popup.getByRole('button', { name: /bob\.test/ })).toBeVisible();
  });

  test('links login-required state to atpassport.net', async () => {
    await context.route('https://atpassport.net/api/user/handles', async route => {
      await route.fulfill({ status: 401, body: 'Unauthorized' });
    });

    const extensionId = await getExtensionId(context);
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    const loginMessage = popup.getByText(/Please register at the @passport site|利用登録をしてください/);
    await expect(loginMessage).toBeVisible();

    const pagePromise = context.waitForEvent('page');
    await loginMessage.click();
    const opened = await pagePromise;
    await expect(opened).toHaveURL(/^https:\/\/atpassport\.net\/(?:ja|en)?$/);
  });
});

async function getExtensionId(context: BrowserContext) {
  let [serviceWorker] = context.serviceWorkers();
  serviceWorker ??= await context.waitForEvent('serviceworker');
  return serviceWorker.url().split('/')[2];
}
