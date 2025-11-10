import { test, expect } from '@playwright/test';

test.describe('Verify Completion Popup Fix', () => {
  test('should NOT show completion popup on multiple page refreshes', async ({ page }) => {
    console.log('📍 Test 1: First page load');

    // First page load
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(6000); // Wait 6 seconds (longer than 5s suppression)

    let completionBanner = page.locator('div:has-text("Task Completed Successfully!")');
    let bannerVisible = await completionBanner.isVisible().catch(() => false);

    console.log(`First load - Banner visible: ${bannerVisible}`);
    await page.screenshot({ path: 'test-screenshots/popup-fix-01-first-load.png', fullPage: true });

    expect(bannerVisible, 'No completion banner should show on first load').toBe(false);

    console.log('📍 Test 2: Second page load (refresh)');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(6000);

    completionBanner = page.locator('div:has-text("Task Completed Successfully!")');
    bannerVisible = await completionBanner.isVisible().catch(() => false);

    console.log(`Second load - Banner visible: ${bannerVisible}`);
    await page.screenshot({ path: 'test-screenshots/popup-fix-02-second-load.png', fullPage: true });

    expect(bannerVisible, 'No completion banner should show on second load').toBe(false);

    console.log('📍 Test 3: Third page load (another refresh)');

    // Refresh again
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(6000);

    completionBanner = page.locator('div:has-text("Task Completed Successfully!")');
    bannerVisible = await completionBanner.isVisible().catch(() => false);

    console.log(`Third load - Banner visible: ${bannerVisible}`);
    await page.screenshot({ path: 'test-screenshots/popup-fix-03-third-load.png', fullPage: true });

    expect(bannerVisible, 'No completion banner should show on third load').toBe(false);

    console.log('✅ All tests passed - no completion popup on any page load!');
  });
});
