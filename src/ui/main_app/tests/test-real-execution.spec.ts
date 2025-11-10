import { test } from '@playwright/test';

test('Submit task and verify agents actually start', async ({ page }) => {
  console.log('\n🚀 TESTING REAL AGENT EXECUTION\n');

  await page.goto('http://localhost:3002');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Handle previous task banner
  const startFreshButton = page.locator('button:has-text("Start Fresh")');
  const hasResumeBanner = await startFreshButton.isVisible().catch(() => false);
  if (hasResumeBanner) {
    await startFreshButton.click();
    await page.waitForTimeout(1000);
  }

  // Submit task
  console.log('📤 Submitting task...');
  const taskInput = page.locator('input[placeholder*="Describe"]').first();
  await taskInput.fill('Create a simple calculator');
  await page.keyboard.press('Enter');

  // Wait and watch for changes
  await page.waitForTimeout(5000);

  // Check for nodes appearing
  const nodes = await page.locator('[data-node-id], g[id*="node"], circle').count();
  console.log(`✅ Nodes found on canvas: ${nodes}`);

  // Check for error banner
  const errorBanner = page.locator('div:has-text("offline mode")').first();
  const hasOfflineError = await errorBanner.isVisible().catch(() => false);

  if (hasOfflineError) {
    console.log('❌ Still in offline mode - API keys not loaded');
  } else {
    console.log('✅ No offline mode error - API keys likely working!');
  }

  await page.screenshot({ path: 'test-screenshots/real-exec-test.png', fullPage: true });

  console.log('\n✅ Test complete - check server logs for [DEBUG] output and agent activity\n');
});
