import { test, expect } from '@playwright/test';

test.describe('Redis Auto-Start Tests', () => {
  test('should not show Redis error banner when auto-started', async ({ page }) => {
    await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });

    // Wait for health check to complete (up to 5 seconds)
    await page.waitForTimeout(5000);

    // Check that Redis error banner is NOT visible
    const redisErrorBanner = page.getByText('Redis Server Error');
    await expect(redisErrorBanner).not.toBeVisible();

    // Verify the page loaded successfully
    const orchestratorNode = page.getByText('Hybrid Orchestrator');
    await expect(orchestratorNode).toBeVisible({ timeout: 10000 });
  });

  test('should show console log indicating Redis auto-started or running', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Check for Redis success message in console
    const hasRedisMessage = consoleMessages.some(msg =>
      msg.includes('Redis is running') || msg.includes('Redis started successfully')
    );
    expect(hasRedisMessage).toBeTruthy();
  });
});
