const { chromium } = require('playwright');

(async () => {
  console.log('=== COMPREHENSIVE VISUALIZATION TEST ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track console messages and errors
  const consoleMessages = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);

    if (msg.type() === 'error') {
      errors.push(text);
      console.log('❌ Console Error:', text);
    } else if (text.includes('WebSocket')) {
      console.log('🔌 WebSocket:', text);
    } else if (text.includes('Connected')) {
      console.log('✅', text);
    }
  });

  page.on('pageerror', err => {
    errors.push(err.toString());
    console.log('❌ Page Error:', err.toString());
  });

  try {
    // 1. Load the app
    console.log('1️⃣ Loading app at http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: 'test-screenshots/01-initial-load.png', fullPage: true });

    // 2. Check for WebSocket connection
    console.log('\n2️⃣ Checking WebSocket connection...');
    const wsConnected = consoleMessages.some(msg =>
      msg.includes('WebSocket connected') ||
      msg.includes('Connected to event stream')
    );
    console.log('   WebSocket connected:', wsConnected ? '✅' : '❌');

    // 3. Check for initial errors
    console.log('\n3️⃣ Checking for initial errors...');
    const hasLogError = errors.some(err => err.includes('error fetching logs'));
    const hasWSError = errors.some(err => err.includes('WebSocket error'));
    console.log('   "error fetching logs" found:', hasLogError ? '❌ YES' : '✅ NO');
    console.log('   WebSocket errors found:', hasWSError ? '❌ YES' : '✅ NO');

    // 4. Submit a test task
    console.log('\n4️⃣ Submitting test task...');
    const input = await page.locator('input[placeholder*="Describe"]').first();
    await input.click();
    await input.fill('Create a simple hello world function');

    // Take screenshot before submit
    await page.screenshot({ path: 'test-screenshots/02-before-submit.png', fullPage: true });

    await input.press('Enter');
    console.log('   Task submitted ✅');

    // 5. Wait and monitor for changes
    console.log('\n5️⃣ Waiting for orchestrator activation...');
    await page.waitForTimeout(5000);

    // Take screenshot after submit
    await page.screenshot({ path: 'test-screenshots/03-after-submit.png', fullPage: true });

    // Check for orchestrator node activation
    const orchestratorActive = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[class*="pulse"], [class*="animate"]');
      return nodes.length > 0;
    });
    console.log('   Orchestrator node pulsing:', orchestratorActive ? '✅' : '❌');

    // 6. Check for agent nodes spawning
    console.log('\n6️⃣ Checking for agent nodes...');
    await page.waitForTimeout(10000);

    const nodeCount = await page.evaluate(() => {
      const nodes = document.querySelectorAll('div[style*="position"][style*="left"][style*="top"]');
      return nodes.length;
    });
    console.log('   Total nodes visible:', nodeCount);
    console.log('   Agent spawning:', nodeCount > 1 ? '✅' : '❌');

    // Take final screenshot
    await page.screenshot({ path: 'test-screenshots/04-final-state.png', fullPage: true });

    // 7. Check monitor page for logs
    console.log('\n7️⃣ Checking monitor page...');
    await page.goto('http://localhost:3002/monitor', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const monitorText = await page.textContent('body');
    const hasLogs = !monitorText.includes('No logs available') && !monitorText.includes('error fetching logs');
    console.log('   Logs displayed correctly:', hasLogs ? '✅' : '❌');

    await page.screenshot({ path: 'test-screenshots/05-monitor-page.png', fullPage: true });

    // 8. Final error check
    console.log('\n8️⃣ Final error check...');
    const finalErrors = errors.filter(err =>
      !err.includes('ResizeObserver') // Ignore known harmless errors
    );
    console.log('   Total errors encountered:', finalErrors.length);
    if (finalErrors.length > 0) {
      console.log('   Errors:', finalErrors.slice(0, 5));
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log('WebSocket Connection:', wsConnected ? '✅ WORKING' : '❌ FAILED');
    console.log('Log Fetching:', !hasLogError ? '✅ WORKING' : '❌ FAILED');
    console.log('Agent Visualization:', nodeCount > 1 ? '✅ WORKING' : '❌ FAILED');
    console.log('Monitor Page:', hasLogs ? '✅ WORKING' : '❌ FAILED');
    console.log('Overall Errors:', finalErrors.length === 0 ? '✅ NONE' : `❌ ${finalErrors.length} errors`);

    const allPassing = wsConnected && !hasLogError && nodeCount > 1 && hasLogs && finalErrors.length === 0;
    console.log('\n🎯 OVERALL STATUS:', allPassing ? '✅ ALL TESTS PASSING!' : '❌ SOME ISSUES REMAIN');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
})();