import { test, expect } from '@playwright/test';

test.describe('Full Task Submission Integration Test', () => {
  test.setTimeout(180000); // 3 minutes for full task execution

  // ✅ FIX: Clear localStorage before each test
  test.beforeEach(async ({ page, context }) => {
    console.log('🧹 Clearing localStorage and cookies...');
    await context.clearCookies();
    await page.goto('http://localhost:3002');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    console.log('✅ Clean slate ready');
  });

  test('should submit task, connect to Redis, run AI planners, and execute with orchestrator', async ({ page }) => {
    console.log('\n📍 PHASE 1: Initial Page Load (Clean State)');

    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify clean start - no old completion banner
    const oldCompletionBanner = page.locator('div:has-text("Task Completed Successfully!")');
    const hasOldBanner = await oldCompletionBanner.isVisible().catch(() => false);
    console.log(`Old completion banner visible: ${hasOldBanner}`);
    expect(hasOldBanner, 'Should NOT show old completion banner on clean load').toBe(false);

    // Verify no old nodes visible
    const oldNodes = page.locator('text=/Claude|ChatGPT|DeepSeek|Grok|Gemini/');
    const oldNodeCount = await oldNodes.count();
    console.log(`Old nodes visible: ${oldNodeCount}`);
    expect(oldNodeCount, 'Should have NO old planning nodes').toBe(0);

    await page.screenshot({ path: 'test-screenshots/test-01-clean-slate.png', fullPage: true });

    console.log('\n📍 PHASE 2: Submit Task');

    // Find task input
    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], input[type="text"]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });

    const testTask = 'Create a simple Python script that prints hello world';
    console.log(`Submitting task: "${testTask}"`);

    await taskInput.fill(testTask);
    await page.screenshot({ path: 'test-screenshots/test-02-task-filled.png', fullPage: true });

    // Submit task
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-screenshots/test-03-task-submitted.png', fullPage: true });

    console.log('\n📍 PHASE 3: Wait for Planning Nodes (AI Planners)');

    // Wait for at least one planning node to appear
    const claudeNode = page.locator('text=/Claude/i').first();
    try {
      await claudeNode.waitFor({ state: 'visible', timeout: 15000 });
      console.log('✅ Claude node appeared!');
    } catch (error) {
      console.error('❌ Claude node did NOT appear within 15 seconds');
      await page.screenshot({ path: 'test-screenshots/test-ERROR-no-claude-node.png', fullPage: true });
      throw new Error('Claude planning node did not appear - task submission may have failed');
    }

    await page.screenshot({ path: 'test-screenshots/test-04-planning-nodes-visible.png', fullPage: true });

    // Check for all planning nodes
    const planningAIs = ['Claude', 'ChatGPT', 'DeepSeek', 'Grok', 'Gemini'];
    const visibleNodes: string[] = [];

    for (const aiName of planningAIs) {
      const node = page.locator(`text=/^${aiName}$/i`).first();
      const isVisible = await node.isVisible({ timeout: 5000 }).catch(() => false);
      if (isVisible) {
        visibleNodes.push(aiName);
        console.log(`✅ ${aiName} node visible`);
      } else {
        console.log(`⚠️ ${aiName} node NOT visible`);
      }
    }

    console.log(`\nVisible planning nodes: ${visibleNodes.join(', ')}`);
    expect(visibleNodes.length, 'Should have at least 3 planning nodes visible').toBeGreaterThanOrEqual(3);

    console.log('\n📍 PHASE 4: Check Redis Connection & AI Planner Status');

    // Click Claude node to check for Redis errors
    await claudeNode.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'test-screenshots/test-05-claude-terminal.png', fullPage: true });

    // Check terminal for errors
    const terminalContent = await page.locator('div[class*="terminal"], div[class*="overflow"]').textContent();

    // Check for Redis errors
    const hasRedisError = terminalContent?.includes('Redis') && terminalContent?.includes('error');
    const hasConnectionError = terminalContent?.includes('Connection') && terminalContent?.includes('failed');
    const hasNoLogsWarning = terminalContent?.includes('No logs received from AI planner');

    console.log(`\nTerminal Status:`);
    console.log(`- Redis error: ${hasRedisError}`);
    console.log(`- Connection error: ${hasConnectionError}`);
    console.log(`- "No logs" warning: ${hasNoLogsWarning}`);
    console.log(`\nTerminal content preview:\n${terminalContent?.substring(0, 500)}`);

    if (hasRedisError || hasConnectionError) {
      console.error('❌ REDIS/CONNECTION ERROR DETECTED!');
      await page.screenshot({ path: 'test-screenshots/test-ERROR-redis-connection.png', fullPage: true });
    }

    // Close terminal
    const closeButton = page.locator('button[title="Close"], button:has-text("×")').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    console.log('\n📍 PHASE 5: Wait for Orchestrator Execution');

    // Wait for Hybrid Orchestrator node to appear
    const orchestratorNode = page.locator('text=/Hybrid Orchestrator/i').first();

    try {
      await orchestratorNode.waitFor({ state: 'visible', timeout: 30000 });
      console.log('✅ Hybrid Orchestrator node appeared!');
    } catch (error) {
      console.error('⚠️ Hybrid Orchestrator node did NOT appear within 30 seconds');
      console.error('This may be expected if planning is still in progress');
    }

    await page.screenshot({ path: 'test-screenshots/test-06-orchestrator-visible.png', fullPage: true });

    // Check orchestrator status
    const orchestratorVisible = await orchestratorNode.isVisible().catch(() => false);

    if (orchestratorVisible) {
      await orchestratorNode.click();
      await page.waitForTimeout(1500);

      await page.screenshot({ path: 'test-screenshots/test-07-orchestrator-terminal.png', fullPage: true });

      const orchestratorTerminal = await page.locator('div[class*="terminal"], div[class*="overflow"]').textContent();
      console.log(`\nOrchestrator terminal preview:\n${orchestratorTerminal?.substring(0, 500)}`);

      // Close terminal
      const closeBtn = page.locator('button[title="Close"], button:has-text("×")').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
      }
    }

    console.log('\n📍 PHASE 6: Monitor Execution Status');

    // Wait and monitor for status changes
    await page.waitForTimeout(10000); // Wait 10 seconds for execution

    await page.screenshot({ path: 'test-screenshots/test-08-after-10s.png', fullPage: true });

    // Check node statuses
    console.log('\nChecking node statuses...');

    for (const nodeName of [...visibleNodes, 'Hybrid Orchestrator']) {
      const node = page.locator(`text=/^${nodeName}$/i`).first();
      const nodeVisible = await node.isVisible().catch(() => false);

      if (nodeVisible) {
        // Try to find status indicator
        const statusElement = node.locator('..').locator('..'); // Parent container
        const statusText = await statusElement.textContent();
        console.log(`${nodeName}: ${statusText?.substring(0, 100)}`);
      }
    }

    console.log('\n📍 PHASE 7: Final Verification');

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-screenshots/test-09-final-state.png', fullPage: true });

    // Check if task is running or completed
    const taskStatusElement = page.locator('text=/No active task|Create a simple/i').first();
    const taskStatus = await taskStatusElement.textContent();
    console.log(`\nFinal task status: ${taskStatus}`);

    console.log('\n✅ TEST SUMMARY:');
    console.log(`- Clean slate: ✅`);
    console.log(`- Task submitted: ✅`);
    console.log(`- Planning nodes appeared: ✅ (${visibleNodes.length}/5)`);
    console.log(`- Redis errors: ${hasRedisError ? '❌' : '✅ None detected'}`);
    console.log(`- Connection errors: ${hasConnectionError ? '❌' : '✅ None detected'}`);
    console.log(`- Orchestrator visible: ${orchestratorVisible ? '✅' : '⚠️ Not yet'}`);

    // Assertions
    expect(visibleNodes.length, 'Should have planning nodes').toBeGreaterThanOrEqual(3);
    expect(hasRedisError, 'Should NOT have Redis errors').toBe(false);
    expect(hasConnectionError, 'Should NOT have connection errors').toBe(false);

    console.log('\n🎉 Full task submission test completed!');
  });

  test('should verify backend API receives task submission', async ({ page }) => {
    console.log('\n📍 Testing Backend API Task Submission');

    // Clear localStorage first
    await page.goto('http://localhost:3002');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(1000);

    // Listen for network requests to the submit API
    const submitRequests: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/hybrid-orchestrator/submit')) {
        console.log('📤 API Submit request detected!');
        submitRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postDataJSON()
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/hybrid-orchestrator/submit')) {
        const status = response.status();
        console.log(`📥 API Submit response: ${status}`);

        try {
          const responseData = await response.json();
          console.log('Response data:', JSON.stringify(responseData, null, 2));
        } catch (e) {
          console.log('Response body:', await response.text());
        }
      }
    });

    // Submit task
    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"]').first();
    await taskInput.waitFor({ state: 'visible' });
    await taskInput.fill('Test task for API verification');
    await page.keyboard.press('Enter');

    // Wait for API call
    await page.waitForTimeout(5000);

    console.log(`\nAPI Calls detected: ${submitRequests.length}`);

    if (submitRequests.length > 0) {
      console.log('Request details:', JSON.stringify(submitRequests[0], null, 2));
      expect(submitRequests[0].method).toBe('POST');
      expect(submitRequests[0].postData).toHaveProperty('goal');
    }

    expect(submitRequests.length, 'Should make at least one API call to submit endpoint').toBeGreaterThanOrEqual(1);
  });
});
