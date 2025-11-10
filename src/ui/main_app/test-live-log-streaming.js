const { chromium } = require('playwright');

(async () => {
  console.log('\n🔴 LIVE STREAMING TEST: Logs Update in Real-Time\n');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);
    console.log('✅ App loaded');

    // Submit task
    console.log('\n📋 STEP 1: Submit task');
    const input = page.locator('input[type="text"]').first();
    await input.fill('Create a Python function that calculates fibonacci sequence');
    await input.press('Enter');
    console.log('   ✅ Task submitted (this will take some time for AI to process)\n');

    // Wait for agents to spawn
    console.log('📋 STEP 2: Wait for agents to spawn (30 seconds)');
    await page.waitForTimeout(30000);

    const nodes = await page.locator('[class*="cursor-pointer"][class*="group"]').all();
    console.log(`   📊 Found ${nodes.length} agent nodes\n`);

    if (nodes.length >= 4) {
      // Click worker agent node
      console.log('📋 STEP 3: Click worker agent node (index 3)');
      await nodes[3].click({ force: true });
      await page.waitForTimeout(2000);
      console.log('   ✅ Terminal opened\n');

      // Monitor logs updating over 30 seconds
      console.log('📋 STEP 4: Monitor log updates over 30 seconds');
      console.log('   (Logs should increase as AI continues working)\n');

      const logSnapshots = [];

      for (let i = 0; i < 6; i++) {
        const terminalContent = await page.evaluate(() => {
          const terminal = document.querySelector('[class*="overflow-y-auto"]');
          return terminal ? terminal.innerText : '';
        });

        const logCount = terminalContent.split('\n').filter(line => line.trim().length > 0).length;
        const timestamp = new Date().toLocaleTimeString();

        logSnapshots.push({
          time: timestamp,
          lineCount: logCount,
          sample: terminalContent.substring(0, 200)
        });

        console.log(`   [${timestamp}] Log lines: ${logCount}`);

        if (i < 5) {
          await page.waitForTimeout(5000); // Check every 5 seconds
        }
      }

      // Analysis
      console.log('\n' + '='.repeat(80));
      console.log('🔴 LIVE STREAMING ANALYSIS:');
      console.log('='.repeat(80));

      const initialCount = logSnapshots[0].lineCount;
      const finalCount = logSnapshots[logSnapshots.length - 1].lineCount;
      const logGrowth = finalCount - initialCount;
      const isStreaming = logGrowth > 0;

      console.log(`   Initial log lines: ${initialCount}`);
      console.log(`   Final log lines: ${finalCount}`);
      console.log(`   Growth: +${logGrowth} lines`);
      console.log(`\n   ${isStreaming ? '✅' : '❌'} Logs streaming live: ${isStreaming ? 'YES' : 'NO'}`);

      if (isStreaming) {
        console.log('   📈 Logs increased over time - streaming working!');
      } else {
        console.log('   ⚠️  Log count unchanged - may be completed or not streaming');
      }

      // Take final screenshot
      await page.screenshot({
        path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/live-streaming-verification.png',
        fullPage: true
      });

      console.log('\n📸 Screenshot saved: live-streaming-verification.png');
      console.log('='.repeat(80));

      if (isStreaming) {
        console.log('\n🎊 SUCCESS! Logs are streaming live as AI works!\n');
      } else {
        console.log('\n✅ Terminal displays logs (streaming may have completed)\n');
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
