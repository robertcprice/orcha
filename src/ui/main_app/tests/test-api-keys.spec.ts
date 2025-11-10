import { test } from '@playwright/test';

test('Submit task and check API key detection', async ({ page }) => {
  console.log('🔍 Testing API Key Detection\n');

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
  const taskInput = page.locator('input[placeholder*="Describe"]').first();
  await taskInput.fill('Debug test task');
  await page.keyboard.press('Enter');

  // Wait for response
  await page.waitForTimeout(3000);

  console.log('✅ Task submitted - check server logs for [DEBUG] API Key Check output');
});
