import { test, expect } from '@playwright/test';

test('capture actual popup on page refresh', async ({ page }) => {
  console.log('📍 Testing page refresh behavior');

  // Go to the page
  await page.goto('http://localhost:3002');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Wait for any popups to appear

  // Take screenshot
  await page.screenshot({ path: 'test-screenshots/refresh-popup-capture.png', fullPage: true });

  // Check for any popups/banners
  const bodyText = await page.textContent('body');
  console.log('Page contains "Task Completed":', bodyText?.includes('Task Completed'));
  console.log('Page contains "platform":', bodyText?.includes('platform'));
  console.log('Page contains "jump":', bodyText?.includes('jump'));
  console.log('Page contains "game":', bodyText?.includes('game'));

  // Look for any visible green completion banner
  const completionBanner = page.locator('div:has-text("Task Completed Successfully!")');
  const bannerVisible = await completionBanner.isVisible().catch(() => false);
  console.log('Completion banner visible:', bannerVisible);

  if (bannerVisible) {
    const bannerText = await completionBanner.textContent();
    console.log('Banner text:', bannerText);
  }

  // Check localStorage
  const localStorageData = await page.evaluate(() => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key);
      }
    }
    return data;
  });

  console.log('localStorage keys:', Object.keys(localStorageData));
  console.log('localStorage data:', JSON.stringify(localStorageData, null, 2));
});
