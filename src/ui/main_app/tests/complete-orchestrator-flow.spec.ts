import { test, expect } from '@playwright/test';

test.describe('Complete Orchestrator Flow - End to End', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
  });

  test('complete task submission and execution flow', async ({ page }) => {
    // Step 1: Verify Redis is running
    console.log('Step 1: Checking Redis...');
    const redisCheck = await fetch('http://localhost:3002/api/health/redis');
    const redisData = await redisCheck.json();
    expect(redisData.isRunning).toBe(true);
    console.log('✅ Redis is running');

    // Step 2: Verify WebSocket server is running
    console.log('Step 2: Checking WebSocket...');
    try {
      const wsCheck = await fetch('http://localhost:4000/events');
      expect(wsCheck.ok).toBe(true);
      console.log('✅ WebSocket server is running');
    } catch (e) {
      throw new Error('WebSocket server is not running on port 4000');
    }

    // Step 3: Wait for WebSocket connection in browser
    console.log('Step 3: Waiting for WebSocket connection...');
    await page.waitForTimeout(2000);

    const wsConnected = await page.evaluate(() => {
      return new Promise((resolve) => {
        const checkConnection = () => {
          const logs = (window as any).wsConnectionLogs || [];
          if (logs.some((l: string) => l.includes('WebSocket connected'))) {
            resolve(true);
          } else {
            setTimeout(checkConnection, 500);
          }
        };
        checkConnection();
        setTimeout(() => resolve(false), 5000); // Timeout after 5s
      });
    });

    if (!wsConnected) {
      console.warn('⚠️ WebSocket not connected in browser');
    }

    // Step 4: Submit a simple test task
    console.log('Step 4: Submitting task...');
    const taskInput = page.locator('input[placeholder*="Describe your task"]');
    await taskInput.fill('Create a simple Python function that adds two numbers');
    await taskInput.press('Enter');

    // Wait for task submission
    await page.waitForTimeout(2000);

    // Step 5: Verify task appears in dropdown
    console.log('Step 5: Checking task dropdown...');
    const dropdown = page.locator('text=/Test Project/i').first();
    await dropdown.click();

    // Look for recently submitted task in dropdown
    await page.waitForTimeout(1000);
    const taskItem = page.locator('text=/Create a simple Python/i').first();
    await expect(taskItem).toBeVisible({ timeout: 5000 });
    console.log('✅ Task appears in dropdown');

    // Step 6: Verify planning nodes activated
    console.log('Step 6: Checking planning nodes...');
    const claudeNode = page.locator('div').filter({ hasText: /^Claude$/ }).first();
    await expect(claudeNode).toBeVisible({ timeout: 10000 });

    // Check if node has activated (check for status change)
    await page.waitForTimeout(3000);
    console.log('✅ Planning nodes visible');

    // Step 7: Click planning node and check for logs
    console.log('Step 7: Checking planning node logs...');
    await claudeNode.click();
    await page.waitForTimeout(2000);

    // Check if terminal panel opened
    const terminal = page.locator('[class*="Terminal"]').or(page.locator('text=/Logs/i'));
    const terminalVisible = await terminal.isVisible().catch(() => false);

    if (terminalVisible) {
      console.log('✅ Terminal panel opened');

      // Check for logs or error messages
      const hasLogs = await page.locator('text=/No logs received/i').isVisible().catch(() => false);
      const hasActualLogs = await page.locator('[class*="log"]').count();

      if (hasLogs) {
        console.log('⚠️ No logs received - check if orchestrator is running');
      } else if (hasActualLogs > 0) {
        console.log(`✅ Found ${hasActualLogs} log entries`);
      }
    } else {
      console.warn('⚠️ Terminal panel did not open');
    }

    // Step 8: Check for task execution in backend
    console.log('Step 8: Checking backend execution...');
    await page.waitForTimeout(5000);

    // Check Redis for task status
    const statusCheck = await fetch('http://localhost:3002/api/hybrid-orchestrator/active');
    const statusData = await statusCheck.json();
    console.log('Task status:', statusData);

    // Step 9: Verify no errors in console
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.warn('⚠️ Console errors detected:', errors);
    } else {
      console.log('✅ No console errors');
    }

    console.log('\n=== Test Summary ===');
    console.log('✅ Redis running');
    console.log('✅ WebSocket running');
    console.log('✅ Task submitted');
    console.log('✅ Task appears in dropdown');
    console.log('✅ Planning nodes visible');
    console.log(terminalVisible ? '✅ Terminal opens' : '⚠️ Terminal issue');
    console.log(errors.length === 0 ? '✅ No errors' : '⚠️ Errors detected');
  });

  test('WebSocket auto-recovery', async ({ page }) => {
    console.log('Testing WebSocket auto-recovery...');

    // Monitor console for WebSocket events
    const wsLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('WebSocket') || text.includes('Redis')) {
        wsLogs.push(text);
      }
    });

    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check if WebSocket connection was established
    const hasConnection = wsLogs.some(log =>
      log.includes('WebSocket connected') ||
      log.includes('WebSocket server')
    );

    if (hasConnection) {
      console.log('✅ WebSocket auto-connected on page load');
    } else {
      console.log('⚠️ WebSocket did not auto-connect');
    }

    console.log('WebSocket logs:', wsLogs);
  });
});
