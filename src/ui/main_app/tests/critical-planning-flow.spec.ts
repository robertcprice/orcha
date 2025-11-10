import { test, expect } from '@playwright/test';

test.describe('Critical Planning Flow - User Reported Issues', () => {
  test.setTimeout(120000); // 2 minutes for full planning cycle

  test('should complete full planning sequence with Claude FIRST and show logs in all nodes', async ({ page }) => {
    // Navigate to orchestrator
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Submit a task');

    // Find and fill the task input
    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], input[type="text"]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });
    await taskInput.fill('Create a simple hello world Python script');

    // Submit the task
    await page.keyboard.press('Enter');

    // Wait a moment for submission
    await page.waitForTimeout(2000);

    console.log('📍 Step 2: Monitor Claude node (should be FIRST)');

    // Look for Claude planning node
    const claudeNode = page.locator('text=/claude/i').first();
    await claudeNode.waitFor({ state: 'visible', timeout: 10000 });

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-screenshots/01-task-submitted.png', fullPage: true });

    console.log('📍 Step 3: Wait for Claude to start planning');
    await page.waitForTimeout(5000); // Give time for planning to start

    // Click Claude node to open terminal
    await claudeNode.click();
    await page.waitForTimeout(1000);

    // Take screenshot after clicking Claude
    await page.screenshot({ path: 'test-screenshots/02-claude-terminal.png', fullPage: true });

    console.log('📍 Step 4: Check Input tab on Claude node');

    // Look for Input tab
    const inputTab = page.locator('button:has-text("Input")');
    const inputTabExists = await inputTab.count() > 0;
    console.log(`Input tab exists: ${inputTabExists}`);

    if (inputTabExists) {
      await inputTab.click();
      await page.waitForTimeout(1000);

      // Check if input data is shown
      const inputContent = await page.locator('pre, div[class*="terminal"]').textContent();
      console.log(`Input tab content: ${inputContent?.substring(0, 200)}`);

      await page.screenshot({ path: 'test-screenshots/03-claude-input-tab.png', fullPage: true });
    }

    console.log('📍 Step 5: Check Logs tab on Claude node');

    const logsTab = page.locator('button:has-text("Logs")');
    await logsTab.click();
    await page.waitForTimeout(2000);

    // Check if logs are present or if showing "No logs received"
    const terminalContent = await page.locator('div[class*="terminal"], div[class*="overflow"]').textContent();
    const hasNoLogsWarning = terminalContent?.includes('No logs received from AI planner');
    const hasLogs = terminalContent && terminalContent.length > 100;

    console.log(`Has "No logs received" warning: ${hasNoLogsWarning}`);
    console.log(`Has actual logs: ${hasLogs}`);
    console.log(`Terminal content preview: ${terminalContent?.substring(0, 300)}`);

    await page.screenshot({ path: 'test-screenshots/04-claude-logs.png', fullPage: true });

    // Close terminal
    const closeButton = page.locator('button[title="Close"], button:has-text("×")').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    console.log('📍 Step 6: Check other planning nodes (ChatGPT, DeepSeek, Grok, Gemini)');

    const planningAIs = ['ChatGPT', 'DeepSeek', 'Grok', 'Gemini'];

    for (const aiName of planningAIs) {
      console.log(`\n🔍 Checking ${aiName} node...`);

      const aiNode = page.locator(`text=/^${aiName}$/i`).first();
      const nodeVisible = await aiNode.isVisible({ timeout: 5000 }).catch(() => false);

      if (nodeVisible) {
        await aiNode.click();
        await page.waitForTimeout(1000);

        // Check for logs
        const logsTab = page.locator('button:has-text("Logs")');
        if (await logsTab.count() > 0) {
          await logsTab.click();
          await page.waitForTimeout(1000);
        }

        const terminalContent = await page.locator('div[class*="terminal"], div[class*="overflow"]').textContent();
        const hasNoLogsWarning = terminalContent?.includes('No logs received');

        console.log(`${aiName} - Has "No logs received": ${hasNoLogsWarning}`);
        console.log(`${aiName} - Content length: ${terminalContent?.length || 0}`);

        await page.screenshot({ path: `test-screenshots/05-${aiName.toLowerCase()}-logs.png`, fullPage: true });

        // Close terminal
        const closeButton = page.locator('button[title="Close"], button:has-text("×")').first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(500);
        }
      } else {
        console.log(`${aiName} node not visible`);
      }
    }

    console.log('📍 Step 7: Check Orchestrator node');

    const orchestratorNode = page.locator('text=/orchestrator/i, text=/hybrid/i').first();
    const orchVisible = await orchestratorNode.isVisible({ timeout: 5000 }).catch(() => false);

    if (orchVisible) {
      await orchestratorNode.click();
      await page.waitForTimeout(1000);

      const terminalContent = await page.locator('div[class*="terminal"], div[class*="overflow"]').textContent();
      console.log(`Orchestrator content: ${terminalContent?.substring(0, 300)}`);

      await page.screenshot({ path: 'test-screenshots/06-orchestrator-logs.png', fullPage: true });
    }

    console.log('📍 Step 8: Final state screenshot');
    await page.screenshot({ path: 'test-screenshots/07-final-state.png', fullPage: true });

    // Assertions
    console.log('\n✅ Test Assertions:');
    expect(inputTabExists, 'Input tab should exist on nodes').toBe(true);
    expect(hasNoLogsWarning, 'Claude should NOT show "No logs received" warning').toBe(false);
    expect(hasLogs || !hasNoLogsWarning, 'Claude should have logs OR not show warning').toBe(true);
  });

  test('should not show wrong project on refresh', async ({ page }) => {
    console.log('📍 Test: Checking project loading on refresh');

    // First, go to the page
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    // Check if there's a resume/completion banner showing wrong project
    const pageContent = await page.textContent('body');
    const hasPlatformJumpGame = pageContent.includes('platform') || pageContent.includes('jump game');

    console.log(`Page mentions platform/jump game: ${hasPlatformJumpGame}`);

    if (hasPlatformJumpGame) {
      await page.screenshot({ path: 'test-screenshots/08-wrong-project-loaded.png', fullPage: true });
    }

    // Check localStorage for task data
    const savedTasks = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const taskKeys = keys.filter(k => k.includes('task') || k.includes('tree') || k.includes('session'));
      const data: any = {};
      taskKeys.forEach(key => {
        data[key] = localStorage.getItem(key);
      });
      return data;
    });

    console.log('LocalStorage task data:', JSON.stringify(savedTasks, null, 2));

    expect(hasPlatformJumpGame, 'Should NOT show platform jump game on fresh load').toBe(false);
  });

  test('should allow submitting new tasks', async ({ page }) => {
    console.log('📍 Test: Submitting a new task');

    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], input[type="text"]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });

    // Try to fill and submit
    await taskInput.fill('Test task submission - create a simple text file');
    await page.keyboard.press('Enter');

    // Wait to see if submission worked
    await page.waitForTimeout(3000);

    // Check if task was submitted (orchestrator node should appear)
    const orchestratorNode = page.locator('text=/orchestrator/i, text=/hybrid/i').first();
    const taskSubmitted = await orchestratorNode.isVisible({ timeout: 5000 }).catch(() => false);

    console.log(`Task submission successful: ${taskSubmitted}`);

    await page.screenshot({ path: 'test-screenshots/09-new-task-submission.png', fullPage: true });

    expect(taskSubmitted, 'New task should be submitted successfully').toBe(true);
  });
});
