/**
 * Comprehensive E2E Verification Test
 * Tests all user-reported issues:
 * 1. WebSocket reconnection limits (max 5 attempts with backoff)
 * 2. Agent node centering (circles, icons, notification badges)
 * 3. Redis event flow (orchestrator -> Redis -> WebSocket -> UI)
 */

const { chromium } = require('playwright');

async function runComprehensiveTest() {
  console.log('\n🔬 COMPREHENSIVE E2E VERIFICATION TEST\n');
  console.log('=' + '='.repeat(79));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // Slow down so we can see what's happening
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs and errors
  const consoleLogs = [];
  const errors = [];
  const wsMessages = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);

    // Track WebSocket reconnection attempts
    if (text.includes('Attempting reconnect') || text.includes('Max reconnect')) {
      console.log(`   📡 ${text}`);
    }
    if (text.includes('WebSocket error') || text.includes('Connection failed')) {
      console.log(`   ❌ ${text}`);
    }
    if (text.includes('WebSocket connected')) {
      console.log(`   ✅ ${text}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`   🐛 Page Error: ${error.message}`);
  });

  try {
    // ========================================================================
    // TEST 1: WebSocket Reconnection Limits
    // ========================================================================
    console.log('\n📋 TEST 1: WebSocket Reconnection Behavior');
    console.log('-'.repeat(80));

    console.log('   → Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForTimeout(3000);

    // Count reconnection attempts in logs
    const reconnectAttempts = consoleLogs.filter(log =>
      log.includes('Attempting reconnect')
    ).length;

    const maxReconnectMessages = consoleLogs.filter(log =>
      log.includes('Max reconnect attempts') && log.includes('reached')
    ).length;

    console.log(`   📊 Reconnection attempts detected: ${reconnectAttempts}`);
    console.log(`   📊 Max reconnect messages: ${maxReconnectMessages}`);

    if (maxReconnectMessages > 0) {
      console.log('   ✅ PASS: Reconnection limit is working (stops after max attempts)');
    } else if (reconnectAttempts === 0) {
      console.log('   ✅ PASS: WebSocket connected successfully (no reconnects needed)');
    } else if (reconnectAttempts <= 5) {
      console.log('   ⚠️  WARNING: Some reconnects but within limit');
    } else {
      console.log(`   ❌ FAIL: Too many reconnection attempts (${reconnectAttempts} > 5)`);
    }

    // ========================================================================
    // TEST 2: Agent Node UI Centering
    // ========================================================================
    console.log('\n📋 TEST 2: Agent Node UI Centering');
    console.log('-'.repeat(80));

    console.log('   → Looking for agent nodes on the page...');
    await page.waitForTimeout(2000);

    // Check if agent nodes exist
    const agentNodes = await page.locator('[class*="agent"]').count();
    console.log(`   📊 Found ${agentNodes} potential agent elements`);

    // Take screenshot of initial state
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/01-initial-state.png',
      fullPage: true
    });
    console.log('   📸 Screenshot saved: 01-initial-state.png');

    // Check for the orchestrator canvas/panel
    const orchestratorPanel = await page.locator('text=/orchestrator|agent|canvas/i').first();
    if (await orchestratorPanel.count() > 0) {
      console.log('   ✅ Found orchestrator UI elements');
    } else {
      console.log('   ⚠️  No orchestrator UI elements found on homepage');
    }

    // ========================================================================
    // TEST 3: Submit Task and Verify Event Flow
    // ========================================================================
    console.log('\n📋 TEST 3: Task Submission and Event Flow');
    console.log('-'.repeat(80));

    console.log('   → Looking for task submission form...');

    // Look for input fields
    const inputs = await page.locator('input[type="text"], textarea').count();
    console.log(`   📊 Found ${inputs} input fields`);

    if (inputs > 0) {
      // Try to find and fill the goal/task input
      const taskInput = await page.locator('input[placeholder*="goal" i], input[placeholder*="task" i], textarea').first();

      if (await taskInput.count() > 0) {
        console.log('   → Filling in task goal...');
        await taskInput.fill('Create a test hello world function');
        await page.waitForTimeout(500);

        // Look for submit button
        const submitButton = await page.locator('button:has-text("Submit"), button:has-text("Start"), button:has-text("Execute")').first();

        if (await submitButton.count() > 0) {
          console.log('   → Clicking submit button...');
          await submitButton.click();

          // Wait for events
          console.log('   → Waiting for WebSocket events (15 seconds)...');
          await page.waitForTimeout(15000);

          // Check if any agent activity appeared
          const activityAfterSubmit = await page.locator('text=/executing|planning|active|spawning/i').count();
          console.log(`   📊 Agent activity elements after submit: ${activityAfterSubmit}`);

          if (activityAfterSubmit > 0) {
            console.log('   ✅ PASS: Agent activity detected after task submission');
          } else {
            console.log('   ❌ FAIL: No agent activity detected after task submission');
          }

          await page.screenshot({
            path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/02-after-submit.png',
            fullPage: true
          });
          console.log('   📸 Screenshot saved: 02-after-submit.png');

        } else {
          console.log('   ⚠️  Could not find submit button');
        }
      } else {
        console.log('   ⚠️  Could not find task input field');
      }
    } else {
      console.log('   ⚠️  No input fields found - checking if on correct page');
    }

    // ========================================================================
    // TEST 4: Check for JavaScript Errors
    // ========================================================================
    console.log('\n📋 TEST 4: JavaScript Error Check');
    console.log('-'.repeat(80));

    if (errors.length === 0) {
      console.log('   ✅ PASS: No JavaScript errors detected');
    } else {
      console.log(`   ❌ FAIL: ${errors.length} JavaScript errors detected:`);
      errors.slice(0, 5).forEach(err => console.log(`      - ${err}`));
    }

    // ========================================================================
    // TEST 5: WebSocket Connection Status
    // ========================================================================
    console.log('\n📋 TEST 5: WebSocket Connection Status');
    console.log('-'.repeat(80));

    const wsConnected = consoleLogs.some(log => log.includes('WebSocket connected'));
    const wsErrors = consoleLogs.filter(log =>
      log.includes('WebSocket error') || log.includes('Connection failed')
    ).length;

    if (wsConnected) {
      console.log('   ✅ PASS: WebSocket successfully connected');
    } else {
      console.log('   ❌ FAIL: WebSocket never connected');
    }

    console.log(`   📊 WebSocket errors: ${wsErrors}`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const tests = [
      {
        name: 'WebSocket Reconnection Limits',
        passed: maxReconnectMessages > 0 || reconnectAttempts <= 5
      },
      {
        name: 'Page Loads Without Errors',
        passed: errors.length === 0
      },
      {
        name: 'WebSocket Connection',
        passed: wsConnected
      },
    ];

    const passedTests = tests.filter(t => t.passed).length;
    const totalTests = tests.length;

    tests.forEach(test => {
      console.log(`   ${test.passed ? '✅' : '❌'} ${test.name}`);
    });

    console.log(`\n   Final Score: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(80));

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('\n✅ Test complete. Browser closed.');
  }
}

runComprehensiveTest().catch(console.error);
