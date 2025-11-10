import { test, expect } from '@playwright/test';

test.describe('Verify Fixes: No WebSocket Error + Offline Mode Message', () => {
  test.setTimeout(60000); // 1 minute

  test('should show no WebSocket errors and display offline mode message when submitting task', async ({ page }) => {
    console.log('\n🔍 Testing Fixes');
    console.log('=========================================\n');

    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Step 1: Load page
    console.log('📍 Step 1: Loading page...');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Handle previous task banner if present
    const startFreshButton = page.locator('button:has-text("Start Fresh")');
    const hasResumeBanner = await startFreshButton.isVisible().catch(() => false);
    if (hasResumeBanner) {
      await startFreshButton.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'test-screenshots/fix-test-01-initial.png', fullPage: true });
    console.log('✅ Page loaded');

    // Check for WebSocket errors in console
    const hasWebSocketErrors = consoleErrors.some(err =>
      err.includes('WebSocket') || err.includes('websocket')
    );

    if (hasWebSocketErrors) {
      console.log('❌ Found WebSocket errors in console:');
      consoleErrors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log('✅ No WebSocket errors in console');
    }

    // Step 2: Submit a task
    console.log('\n📍 Step 2: Submitting task (should trigger offline mode message)...');
    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], input[type="text"]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });

    const testTask = 'Test task for offline mode';
    await taskInput.fill(testTask);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-screenshots/fix-test-02-task-submitted.png', fullPage: true });
    console.log('✅ Task submitted');

    // Step 3: Check for offline mode banner
    console.log('\n📍 Step 3: Checking for offline mode message...');

    // Look for error banner with offline mode message
    const errorBanner = page.locator('div:has-text("offline mode")').first();
    const hasBanner = await errorBanner.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasBanner) {
      console.log('✅ Offline mode banner displayed');
      const bannerText = await errorBanner.textContent();
      console.log(`   Message: ${bannerText?.substring(0, 100)}...`);

      await page.screenshot({ path: 'test-screenshots/fix-test-03-offline-banner.png', fullPage: true });
    } else {
      console.log('⚠️ No offline mode banner found');
    }

    // Step 4: Summary
    console.log('\n📊 TEST RESULTS');
    console.log('=========================================');
    console.log(`WebSocket Errors: ${hasWebSocketErrors ? '❌ FOUND' : '✅ NONE'}`);
    console.log(`Offline Mode Banner: ${hasBanner ? '✅ DISPLAYED' : '❌ NOT FOUND'}`);
    console.log('=========================================\n');

    // Assertions
    expect(hasWebSocketErrors).toBe(false);
    expect(hasBanner).toBe(true);

    console.log('✅ All fixes verified!');
  });
});
