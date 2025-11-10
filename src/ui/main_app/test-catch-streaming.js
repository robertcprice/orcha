const { chromium } = require('playwright');

(async () => {
  console.log('\n⚡ CATCH STREAMING IN ACTION: Click Early to See Live Updates\n');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);
    console.log('✅ App loaded');

    // Submit a longer task that will take time
    console.log('\n📋 STEP 1: Submit complex task (will take longer)');
    const input = page.locator('input[type="text"]').first();
    await input.fill('Create a complete REST API with authentication, database models, and comprehensive tests');
    await input.press('Enter');
    console.log('   ✅ Task submitted\n');

    // Wait only 15 seconds for nodes to start appearing
    console.log('📋 STEP 2: Wait 15 seconds for agents to start spawning');
    await page.waitForTimeout(15000);

    const nodes = await page.locator('[class*="cursor-pointer"][class*="group"]').all();
    console.log(`   📊 Found ${nodes.length} agent nodes\n`);

    if (nodes.length >= 2) {
      // Click early - agents should still be working
      console.log('📋 STEP 3: Click worker agent node EARLY (while AI is still working)');

      // Try to find a worker agent (skip orchestrator nodes)
      const nodeIndex = Math.min(3, nodes.length - 1);
      console.log(`   → Clicking node at index ${nodeIndex}`);

      await nodes[nodeIndex].click({ force: true });
      await page.waitForTimeout(2000);
      console.log('   ✅ Terminal opened\n');

      // Monitor logs updating every 3 seconds for 30 seconds
      console.log('📋 STEP 4: Monitor logs streaming (every 3 seconds for 30 seconds)');
      console.log('   🔴 This should show logs increasing as AI continues working\n');

      const logSnapshots = [];

      for (let i = 0; i < 10; i++) {
        const terminalContent = await page.evaluate(() => {
          const terminal = document.querySelector('[class*="overflow-y-auto"]');
          return terminal ? terminal.innerText : '';
        });

        const logCount = terminalContent.split('\n').filter(line => line.trim().length > 0).length;
        const timestamp = new Date().toLocaleTimeString();

        logSnapshots.push({
          time: timestamp,
          lineCount: logCount,
          preview: terminalContent.split('\n').slice(-2).join(' | ')
        });

        const growth = i > 0 ? logCount - logSnapshots[i-1].lineCount : 0;
        const growthIndicator = growth > 0 ? '📈 +' + growth : '  ';

        console.log(`   [${timestamp}] ${growthIndicator.padEnd(8)} Lines: ${String(logCount).padEnd(3)} | ${logSnapshots[i].preview.substring(0, 80)}`);

        if (i < 9) {
          await page.waitForTimeout(3000); // Check every 3 seconds
        }
      }

      // Analysis
      console.log('\n' + '='.repeat(80));
      console.log('⚡ STREAMING ANALYSIS:');
      console.log('='.repeat(80));

      const initialCount = logSnapshots[0].lineCount;
      const finalCount = logSnapshots[logSnapshots.length - 1].lineCount;
      const totalGrowth = finalCount - initialCount;
      const maxGrowth = Math.max(...logSnapshots.map((s, i) =>
        i > 0 ? s.lineCount - logSnapshots[i-1].lineCount : 0
      ));
      const isStreaming = totalGrowth > 0 || maxGrowth > 0;

      console.log(`   Initial log lines: ${initialCount}`);
      console.log(`   Final log lines: ${finalCount}`);
      console.log(`   Total growth: +${totalGrowth} lines`);
      console.log(`   Max single growth: +${maxGrowth} lines`);

      console.log(`\n   ${isStreaming ? '✅' : '⚠️ '} Logs streaming live: ${isStreaming ? 'YES' : 'MAYBE COMPLETED'}`);

      if (isStreaming) {
        console.log('   🎊 Confirmed: Logs are updating in real-time as AI works!');
      } else if (initialCount > 5) {
        console.log('   ✅ Logs present but not growing (agent may have completed quickly)');
      } else {
        console.log('   ⚠️  Few/no logs - agent may not have started yet');
      }

      // Take final screenshot
      await page.screenshot({
        path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/streaming-caught.png',
        fullPage: true
      });

      console.log('\n📸 Screenshot saved: streaming-caught.png');
      console.log('='.repeat(80));
      console.log('\n✅ Test complete\n');

    } else {
      console.log('❌ Not enough agent nodes spawned yet');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
