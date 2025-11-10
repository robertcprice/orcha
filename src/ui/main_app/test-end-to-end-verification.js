/**
 * COMPREHENSIVE END-TO-END VERIFICATION TEST
 *
 * Tests the complete flow:
 * 1. Task submission through UI
 * 2. Agent nodes appearing and branching
 * 3. Agent thoughts and outputs being logged
 * 4. WebSocket events flowing through system
 */

const { chromium } = require('playwright');

async function runEndToEndTest() {
  console.log('\n🔬 COMPREHENSIVE END-TO-END VERIFICATION TEST\n');
  console.log('=' + '='.repeat(79));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Tracking
  const consoleLogs = [];
  const wsEvents = [];
  const agentNodes = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ time: Date.now(), text });

    // Track WebSocket events
    if (text.includes('WebSocket event received:')) {
      console.log(`   📨 ${text}`);
      wsEvents.push({ time: Date.now(), text });
    }

    // Track agent spawning
    if (text.includes('agent_spawned') || text.includes('agent_started')) {
      console.log(`   🤖 Agent event detected`);
    }

    // Track WebSocket connection
    if (text.includes('WebSocket connected')) {
      console.log(`   ✅ WebSocket connected`);
    }

    if (text.includes('WebSocket disconnected')) {
      console.log(`   ❌ WebSocket disconnected`);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`   🐛 Error: ${error.message}`);
  });

  try {
    console.log('\n📋 PHASE 1: Initial Setup');
    console.log('-'.repeat(80));

    console.log('   → Loading http://localhost:3002...');
    await page.goto('http://localhost:3002', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('   → Waiting for UI to stabilize (5s)...');
    await page.waitForTimeout(5000);

    // Take initial screenshot
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/e2e-01-initial.png',
      fullPage: true
    });
    console.log('   📸 Screenshot: e2e-01-initial.png');

    // Check for orchestrator node
    console.log('\n   → Checking for initial orchestrator node...');
    const orchestratorNodes = await page.locator('text=/orchestrator|hybrid/i').count();
    console.log(`   📊 Found ${orchestratorNodes} orchestrator elements`);

    console.log('\n📋 PHASE 2: Task Submission');
    console.log('-'.repeat(80));

    // Find task input
    console.log('   → Looking for task input field...');
    const taskInput = await page.locator('input[type="text"], textarea').first();
    const inputCount = await page.locator('input[type="text"], textarea').count();
    console.log(`   📊 Found ${inputCount} input fields`);

    if (inputCount === 0) {
      console.log('   ❌ FAIL: No input fields found!');
      await page.screenshot({
        path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/e2e-02-no-input.png',
        fullPage: true
      });
      throw new Error('No input fields found on page');
    }

    // Fill in task
    const testTask = 'Create a simple hello world Python function';
    console.log(`   → Typing task: "${testTask}"`);
    await taskInput.fill(testTask);
    await page.waitForTimeout(1000);

    // Submit by pressing ENTER (no button - minimalist UI design)
    console.log('   → Submitting task (pressing ENTER)...');
    await taskInput.press('Enter');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/e2e-04-task-submitted.png',
      fullPage: true
    });
    console.log('   📸 Screenshot: e2e-04-task-submitted.png');

    console.log('\n📋 PHASE 3: Agent Node Monitoring (30 seconds)');
    console.log('-'.repeat(80));
    console.log('   → Monitoring for agent nodes to appear and branch...\n');

    const startTime = Date.now();
    const monitoringDuration = 30000; // 30 seconds
    let lastNodeCount = 0;
    let checkInterval = 0;

    while (Date.now() - startTime < monitoringDuration) {
      checkInterval++;

      // Look for agent nodes (various possible selectors)
      const nodeSelectors = [
        '[class*="agent"]',
        '[class*="node"]',
        'svg circle',
        'text=/planning|active|spawning|complete/i'
      ];

      let totalNodes = 0;
      for (const selector of nodeSelectors) {
        const count = await page.locator(selector).count();
        totalNodes = Math.max(totalNodes, count);
      }

      // Check if node count changed
      if (totalNodes !== lastNodeCount) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   [+${elapsed}s] 📊 Agent nodes detected: ${totalNodes} (was ${lastNodeCount})`);
        lastNodeCount = totalNodes;

        // Take screenshot when nodes change
        await page.screenshot({
          path: `/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/e2e-05-nodes-${checkInterval}.png`,
          fullPage: true
        });
        console.log(`   📸 Screenshot: e2e-05-nodes-${checkInterval}.png`);
      }

      await page.waitForTimeout(2000);
    }

    console.log(`\n   📊 Final node count: ${lastNodeCount}`);

    console.log('\n📋 PHASE 4: Agent Output Verification');
    console.log('-'.repeat(80));

    // Check for agent output/logs on the page
    console.log('   → Looking for agent output/logs...');
    const logSelectors = [
      'text=/thinking|output|result|response/i',
      '[class*="log"]',
      '[class*="output"]',
      '[class*="terminal"]',
      'pre',
      'code'
    ];

    let foundLogs = false;
    for (const selector of logSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   📊 Found ${count} elements matching: ${selector}`);
        foundLogs = true;
      }
    }

    if (!foundLogs) {
      console.log('   ⚠️  No obvious log/output elements found');
    }

    // Final screenshot
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/e2e-06-final.png',
      fullPage: true
    });
    console.log('   📸 Screenshot: e2e-06-final.png');

    console.log('\n📋 PHASE 5: WebSocket Event Analysis');
    console.log('-'.repeat(80));
    console.log(`   📊 Total WebSocket events captured: ${wsEvents.length}`);

    if (wsEvents.length > 0) {
      console.log('   ✅ WebSocket events are flowing');
      console.log('\n   Recent WebSocket events:');
      wsEvents.slice(-5).forEach((event, idx) => {
        console.log(`      ${idx + 1}. ${event.text.substring(0, 80)}...`);
      });
    } else {
      console.log('   ⚠️  No WebSocket events captured in browser console');
    }

    // ========================================================================
    // FINAL ANALYSIS
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL TEST RESULTS');
    console.log('='.repeat(80));

    const testResults = [];

    // Test 1: Task submission input available
    if (inputCount > 0) {
      console.log('   ✅ Task submission input available');
      testResults.push({ test: 'Task Input Field', passed: true });
    } else {
      console.log('   ❌ Task submission input not found');
      testResults.push({ test: 'Task Input Field', passed: false });
    }

    // Test 2: WebSocket connection
    const wsConnected = consoleLogs.some(log => log.text.includes('WebSocket connected'));
    if (wsConnected) {
      console.log('   ✅ WebSocket connection established');
      testResults.push({ test: 'WebSocket Connection', passed: true });
    } else {
      console.log('   ❌ WebSocket connection failed');
      testResults.push({ test: 'WebSocket Connection', passed: false });
    }

    // Test 3: Agent nodes appearing
    if (lastNodeCount > 1) {
      console.log(`   ✅ Agent nodes appeared (${lastNodeCount} nodes)`);
      testResults.push({ test: 'Agent Node Rendering', passed: true });
    } else {
      console.log(`   ❌ No agent nodes appeared (only ${lastNodeCount})`);
      testResults.push({ test: 'Agent Node Rendering', passed: false });
    }

    // Test 4: WebSocket events
    if (wsEvents.length > 0) {
      console.log(`   ✅ WebSocket events flowing (${wsEvents.length} events)`);
      testResults.push({ test: 'WebSocket Event Flow', passed: true });
    } else {
      console.log('   ❌ No WebSocket events detected');
      testResults.push({ test: 'WebSocket Event Flow', passed: false });
    }

    // Test 5: No JavaScript errors
    if (errors.length === 0) {
      console.log('   ✅ No JavaScript errors');
      testResults.push({ test: 'No JS Errors', passed: true });
    } else {
      console.log(`   ❌ JavaScript errors detected (${errors.length})`);
      testResults.push({ test: 'No JS Errors', passed: false });
    }

    // Test 6: Agent outputs visible
    if (foundLogs) {
      console.log('   ✅ Agent output elements found');
      testResults.push({ test: 'Agent Output Display', passed: true });
    } else {
      console.log('   ⚠️  Agent output elements not found (may need navigation)');
      testResults.push({ test: 'Agent Output Display', passed: false });
    }

    const passedTests = testResults.filter(t => t.passed).length;
    const totalTests = testResults.length;

    console.log(`\n   Final Score: ${passedTests}/${totalTests} tests passed`);

    console.log('\n' + '='.repeat(80));
    if (passedTests === totalTests) {
      console.log('✅ VERDICT: SYSTEM FULLY FUNCTIONAL - All components working!');
    } else if (passedTests >= totalTests - 1) {
      console.log('⚠️  VERDICT: SYSTEM MOSTLY FUNCTIONAL - Minor issues detected');
    } else {
      console.log('❌ VERDICT: SYSTEM HAS ISSUES - Multiple components not working');
    }
    console.log('='.repeat(80));

    // Summary of what needs investigation
    console.log('\n📋 INVESTIGATION SUMMARY:');
    console.log('-'.repeat(80));

    const failedTests = testResults.filter(t => !t.passed);
    if (failedTests.length > 0) {
      console.log('   Issues to investigate:');
      failedTests.forEach(test => {
        console.log(`   ❌ ${test.test}`);
      });
    } else {
      console.log('   ✅ No issues detected - system fully operational');
    }

    console.log('\n   Console log summary:');
    console.log(`   - Total console messages: ${consoleLogs.length}`);
    console.log(`   - WebSocket events: ${wsEvents.length}`);
    console.log(`   - JavaScript errors: ${errors.length}`);

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/e2e-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('\n✅ Test complete. Browser closed.\n');
  }
}

runEndToEndTest().catch(console.error);
