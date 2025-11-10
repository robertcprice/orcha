const { chromium } = require('playwright');

(async () => {
  console.log('\n🧪 COMPREHENSIVE AGENT LOGS DISPLAY TEST\n');
  console.log('='.repeat(80));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const page = await browser.newPage();

  try {
    // Navigate to app
    console.log('\n📋 STEP 1: Navigate to app');
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);
    console.log('   ✅ App loaded');

    // Submit a task
    console.log('\n📋 STEP 2: Submit task');
    const input = page.locator('input[type="text"]').first();
    await input.fill('Create a Python function that adds two numbers');
    await input.press('Enter');
    console.log('   ✅ Task submitted');

    // Wait for agents to spawn (ChatGPT planner + Claude executor)
    console.log('\n📋 STEP 3: Wait for agents to spawn (45 seconds)');
    await page.waitForTimeout(45000);

    // Find agent nodes
    const agentNodes = await page.locator('[class*="cursor-pointer"][class*="group"]').all();
    console.log(`\n   📊 Found ${agentNodes.length} agent nodes`);

    if (agentNodes.length < 2) {
      throw new Error('❌ Not enough agent nodes spawned');
    }

    // Click on second node (usually CHATGPT or CLAUDE)
    // Use force:true because nodes have pulse animation
    console.log('\n📋 STEP 4: Click agent node to open terminal');
    await agentNodes[1].click({ force: true });
    await page.waitForTimeout(2000);
    console.log('   ✅ Agent node clicked');

    // Check if terminal appeared
    const terminalHeader = await page.locator('text=/Agent:/i').count();
    console.log(`\n   📊 Terminal header visible: ${terminalHeader > 0 ? 'YES' : 'NO'}`);

    if (terminalHeader === 0) {
      throw new Error('❌ Terminal did not appear');
    }

    // Wait for logs to load
    console.log('\n📋 STEP 5: Wait for logs to load (5 seconds)');
    await page.waitForTimeout(5000);

    // Check terminal content
    const terminalText = await page.locator('div').filter({ hasText: /Waiting for agent output|📝|output|thinking|message/i }).count();
    console.log(`   📊 Terminal content elements: ${terminalText}`);

    // Get actual terminal text content
    const allText = await page.evaluate(() => {
      const terminal = document.querySelector('[class*="overflow-y-auto"]');
      return terminal ? terminal.innerText : '';
    });

    console.log(`\n   📊 Terminal text length: ${allText.length} characters`);

    // Check if we have actual logs or just "Waiting..."
    const hasWaitingMessage = allText.includes('Waiting for agent output');
    const hasActualLogs = allText.length > 100 && (
      allText.includes('📝') ||
      allText.includes('output') ||
      allText.includes('thinking') ||
      allText.includes('message')
    );

    console.log(`\n   📊 Shows "Waiting..." only: ${hasWaitingMessage && !hasActualLogs}`);
    console.log(`   📊 Shows actual AI logs: ${hasActualLogs}`);

    // Take screenshot
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/agent-logs-verification.png',
      fullPage: true
    });
    console.log('\n   📸 Screenshot saved: agent-logs-verification.png');

    // Print first 500 chars of terminal content
    console.log(`\n   📝 Terminal content preview:\n${allText.substring(0, 500)}`);

    // Final results
    console.log('\n' + '='.repeat(80));
    console.log('🎉 TEST RESULTS:');
    console.log('='.repeat(80));
    console.log(`   ${agentNodes.length >= 2 ? '✅' : '❌'} Agent nodes spawned: ${agentNodes.length}`);
    console.log(`   ${terminalHeader > 0 ? '✅' : '❌'} Terminal appeared`);
    console.log(`   ${hasActualLogs ? '✅' : '❌'} Actual AI logs displayed`);
    console.log(`   ${!hasWaitingMessage || hasActualLogs ? '✅' : '❌'} Not stuck on "Waiting..."`);
    console.log('='.repeat(80));

    if (hasActualLogs) {
      console.log('\n✅ SUCCESS: Agent logs are displaying correctly!\n');
    } else {
      console.log('\n⚠️  WARNING: Terminal shows "Waiting..." - logs may not be loading\n');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/agent-logs-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('\n✅ Test complete\n');
  }
})();
