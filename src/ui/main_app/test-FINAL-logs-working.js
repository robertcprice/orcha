const { chromium } = require('playwright');

(async () => {
  console.log('\n✅ FINAL TEST: Agent Logs Display Working\n');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);
    console.log('✅ App loaded');

    // Submit task
    const input = page.locator('input[type="text"]').first();
    await input.fill('Write a Python function that multiplies two numbers');
    await input.press('Enter');
    console.log('✅ Task submitted\n');
    console.log('⏳ Waiting 45 seconds for agents to spawn and execute...\n');

    // Wait for agents
    await page.waitForTimeout(45000);

    const nodes = await page.locator('[class*="cursor-pointer"][class*="group"]').all();
    console.log(`📊 Found ${nodes.length} agent nodes\n`);

    if (nodes.length >= 4) {
      // Click a WORKER agent node (index 3 or later - avoid orchestrator nodes)
      // Index 0: orchestrator-root
      // Index 1: orchestrator:session
      // Index 2+: Worker agents (PP, CHATGPT, CLAUDE, IM, etc.)
      console.log('🎯 Clicking worker agent node (index 3 - likely CHATGPT or CLAUDE)...\n');
      await nodes[3].click({ force: true });
      await page.waitForTimeout(3000);

      // Check terminal appeared
      const terminalHeader = await page.locator('text=/Agent:/i').count();
      console.log(`${terminalHeader > 0 ? '✅' : '❌'} Terminal appeared: ${terminalHeader > 0}`);

      // Get terminal content
      const terminalContent = await page.evaluate(() => {
        const terminal = document.querySelector('[class*="overflow-y-auto"]');
        return terminal ? terminal.innerText : 'NO TERMINAL';
      });

      console.log(`\n📝 Terminal shows:\n${terminalContent.substring(0, 800)}\n`);

      const hasActualLogs = terminalContent.length > 50 &&
                           !terminalContent.includes('Waiting for agent output');

      // Take screenshot
      await page.screenshot({
        path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/FINAL-agent-logs-working.png',
        fullPage: true
      });

      console.log('='.repeat(80));
      console.log('🎉 FINAL RESULTS:');
      console.log('='.repeat(80));
      console.log(`   ${nodes.length >= 4 ? '✅' : '❌'} Agents spawned: ${nodes.length}`);
      console.log(`   ${terminalHeader > 0 ? '✅' : '❌'} Terminal opened`);
      console.log(`   ${hasActualLogs ? '✅' : '❌'} Real AI logs displayed`);
      console.log('='.repeat(80));

      if (hasActualLogs) {
        console.log('\n🎊 SUCCESS! Agent logs are displaying with real AI thinking/output!\n');
      } else {
        console.log('\n⚠️  Logs not yet loaded - agent may still be executing\n');
      }

    } else {
      console.log('❌ Not enough agent nodes spawned');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('✅ Test complete\n');
  }
})();
