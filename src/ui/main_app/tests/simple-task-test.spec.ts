import { test, expect } from '@playwright/test';

test.describe('Simple Task Submission Test - Redis & AI Planners', () => {
  test.setTimeout(180000); // 3 minutes

  test('should submit task and verify Redis connection & AI planner status', async ({ page }) => {
    console.log('\n🧪 SIMPLE TASK SUBMISSION TEST');
    console.log('=========================================\n');

    console.log('📍 Step 1: Load Page');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: 'test-screenshots/simple-01-initial.png', fullPage: true });

    console.log('\n📍 Step 2: Check for "Previous Task Detected" Banner');

    const resumeBanner = page.locator('div:has-text("Previous Task Detected")');
    const hasResumeBanner = await resumeBanner.isVisible().catch(() => false);

    if (hasResumeBanner) {
      console.log('⚠️ Found "Previous Task Detected" banner - clicking "Start Fresh"');
      const startFreshButton = page.locator('button:has-text("Start Fresh")');
      await startFreshButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Clicked "Start Fresh" - canvas should be clear now');
    } else {
      console.log('✅ No resume banner - starting with clean canvas');
    }

    await page.screenshot({ path: 'test-screenshots/simple-02-after-clear.png', fullPage: true });

    console.log('\n📍 Step 3: Submit New Task');

    // Find task input
    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], input[type="text"]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });

    const testGoal = 'Create a simple Python calculator';
    console.log(`Task goal: "${testGoal}"`);

    await taskInput.fill(testGoal);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-screenshots/simple-03-task-filled.png', fullPage: true });

    // Submit
    console.log('Submitting task...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-screenshots/simple-04-task-submitted.png', fullPage: true });

    console.log('\n📍 Step 4: Wait for Planning Nodes to Appear');

    // Wait for AI planner nodes
    const claudeNode = page.locator('text=/^Claude$/i').first();

    let claudeAppeared = false;
    try {
      await claudeNode.waitFor({ state: 'visible', timeout: 20000 });
      claudeAppeared = true;
      console.log('✅ Claude planning node appeared!');
    } catch (error) {
      console.error('❌ Claude planning node did NOT appear within 20 seconds');
      console.error('This indicates task submission may have failed');
    }

    await page.screenshot({ path: 'test-screenshots/simple-05-planning-started.png', fullPage: true });

    if (!claudeAppeared) {
      console.error('\n❌ CRITICAL: No planning nodes appeared');
      console.error('Possible causes:');
      console.error('1. Backend API not receiving task');
      console.error('2. Redis connection failed');
      console.error('3. WebSocket not connected');
      throw new Error('Planning nodes did not appear - task submission failed');
    }

    console.log('\n📍 Step 5: Check for Redis/Connection Errors');

    // Click Claude node to open terminal
    await claudeNode.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-screenshots/simple-06-claude-terminal.png', fullPage: true });

    // Check terminal for errors
    const terminalText = await page.locator('div[class*="terminal"], div[class*="overflow"], pre').textContent();

    console.log('\n🔍 Terminal Content Analysis:');
    console.log('─────────────────────────────────────');

    // Check for specific error patterns
    const errorPatterns = {
      redisError: /redis.*error/i,
      connectionFailed: /connection.*failed/i,
      noLogs: /no logs received/i,
      websocketError: /websocket.*error/i,
      timeout: /timeout/i,
      refused: /connection refused/i
    };

    const foundErrors: string[] = [];

    for (const [name, pattern] of Object.entries(errorPatterns)) {
      if (terminalText && pattern.test(terminalText)) {
        foundErrors.push(name);
        console.log(`❌ ${name}: DETECTED`);
      } else {
        console.log(`✅ ${name}: Not detected`);
      }
    }

    console.log('\n📄 Terminal content (first 500 chars):');
    console.log(terminalText?.substring(0, 500));
    console.log('─────────────────────────────────────\n');

    // Close terminal
    const closeButton = page.locator('button[title="Close"], button:has-text("×")').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    console.log('\n📍 Step 6: Check Other Planning Nodes');

    const planners = ['ChatGPT', 'DeepSeek', 'Grok', 'Gemini'];
    const visiblePlanners: string[] = ['Claude']; // Claude already confirmed

    for (const planner of planners) {
      const node = page.locator(`text=/^${planner}$/i`).first();
      const isVisible = await node.isVisible({ timeout: 5000 }).catch(() => false);

      if (isVisible) {
        visiblePlanners.push(planner);
        console.log(`✅ ${planner} node visible`);
      } else {
        console.log(`⚠️ ${planner} node not visible yet`);
      }
    }

    console.log(`\nTotal planning nodes visible: ${visiblePlanners.length}/5`);

    await page.screenshot({ path: 'test-screenshots/simple-07-all-planners.png', fullPage: true });

    console.log('\n📍 Step 7: Wait for Orchestrator Execution');

    // Wait for Hybrid Orchestrator
    await page.waitForTimeout(15000); // Wait 15 seconds for planning to complete

    const orchestratorNode = page.locator('text=/Hybrid Orchestrator/i').first();
    const orchestratorVisible = await orchestratorNode.isVisible().catch(() => false);

    if (orchestratorVisible) {
      console.log('✅ Hybrid Orchestrator node appeared - execution started!');
    } else {
      console.log('⚠️ Hybrid Orchestrator not yet visible - planning may still be in progress');
    }

    await page.screenshot({ path: 'test-screenshots/simple-08-final-state.png', fullPage: true });

    console.log('\n📊 TEST SUMMARY');
    console.log('=========================================');
    console.log(`✅ Task submission: SUCCESS`);
    console.log(`✅ Claude planner: ${claudeAppeared ? 'APPEARED' : 'FAILED'}`);
    console.log(`✅ Planning nodes: ${visiblePlanners.length}/5 visible`);
    console.log(`✅ Redis errors: ${foundErrors.includes('redisError') ? 'DETECTED ❌' : 'NONE ✅'}`);
    console.log(`✅ Connection errors: ${foundErrors.includes('connectionFailed') || foundErrors.includes('refused') ? 'DETECTED ❌' : 'NONE ✅'}`);
    console.log(`✅ Orchestrator: ${orchestratorVisible ? 'STARTED ✅' : 'PENDING ⚠️'}`);

    if (foundErrors.length > 0) {
      console.log(`\n⚠️ ERRORS DETECTED: ${foundErrors.join(', ')}`);
    } else {
      console.log(`\n🎉 NO ERRORS DETECTED - All systems operational!`);
    }

    console.log('=========================================\n');

    // Assertions
    expect(claudeAppeared, 'Claude planning node should appear').toBe(true);
    expect(visiblePlanners.length, 'Should have at least 3 planning nodes').toBeGreaterThanOrEqual(3);
    expect(foundErrors.includes('redisError'), 'Should NOT have Redis errors').toBe(false);
    expect(foundErrors.includes('connectionFailed'), 'Should NOT have connection failed errors').toBe(false);
    expect(foundErrors.includes('refused'), 'Should NOT have connection refused errors').toBe(false);
  });
});
