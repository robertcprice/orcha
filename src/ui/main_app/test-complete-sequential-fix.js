const { chromium } = require('playwright');

async function testSequentialPlanningAndScrolling() {
  console.log('🧪 Testing Sequential Planning & Scrolling Fix');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the app
    console.log('📍 Navigating to http://localhost:3002');
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);

    // Clear any old tasks
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(1000);

    // Take initial screenshot
    await page.screenshot({ path: 'web-ui/test-screenshots/sequential-01-initial.png' });
    console.log('📸 Captured initial state');

    // Submit a task
    const taskInput = 'Create a simple REST API with authentication';
    console.log(`📝 Submitting task: "${taskInput}"`);

    const inputSelector = 'input[type="text"]';
    await page.fill(inputSelector, taskInput);
    await page.press(inputSelector, 'Enter');
    await page.waitForTimeout(1000);

    console.log('⏳ Waiting for planning nodes to appear...');

    // Test 1: Check immediately - Claude should appear alone
    console.log('\n🔍 TEST 1: Checking immediately after task submission');
    await page.waitForTimeout(500); // Small delay for WebSocket

    let claudeNode = await page.locator('text=Claude').count();
    let chatgptNode = await page.locator('text=ChatGPT').count();

    console.log(`   0.5s - Claude: ${claudeNode}, ChatGPT: ${chatgptNode}`);
    await page.screenshot({ path: 'web-ui/test-screenshots/sequential-02-immediate-check.png' });

    // Test 2: Check at 2 seconds - Claude should exist, ChatGPT might not yet
    console.log('\n🔍 TEST 2: Checking at 2 seconds');
    await page.waitForTimeout(1500);

    claudeNode = await page.locator('text=Claude').count();
    chatgptNode = await page.locator('text=ChatGPT').count();

    console.log(`   2.0s - Claude: ${claudeNode}, ChatGPT: ${chatgptNode}`);
    await page.screenshot({ path: 'web-ui/test-screenshots/sequential-03-2s-check.png' });

    if (claudeNode === 0) {
      console.error('❌ FAIL: Claude never appeared!');
    } else {
      console.log('✅ PASS: Claude appeared');
    }

    // Test 3: Check at 5 seconds - ChatGPT should now exist
    console.log('\n🔍 TEST 3: Checking at 5 seconds for ChatGPT');
    await page.waitForTimeout(3000);

    chatgptNode = await page.locator('text=ChatGPT').count();
    console.log(`   5.0s - ChatGPT: ${chatgptNode}`);
    await page.screenshot({ path: 'web-ui/test-screenshots/sequential-04-5s-check.png' });

    if (chatgptNode === 0) {
      console.error('❌ FAIL: ChatGPT never appeared!');
    } else {
      console.log('✅ PASS: ChatGPT appeared');
    }

    // Test 4: Wait for all AIs to complete
    console.log('\n🔍 TEST 4: Waiting for all planning nodes to complete...');
    await page.waitForTimeout(15000); // Wait for all AIs to finish
    await page.screenshot({ path: 'web-ui/test-screenshots/sequential-05-all-complete.png' });

    // Test 5: Click each planning node and test scrolling
    const aiNodes = ['Claude', 'ChatGPT', 'DeepSeek', 'Grok', 'Gemini'];

    for (const aiName of aiNodes) {
      console.log(`\n🔍 TEST 5.${aiNodes.indexOf(aiName) + 1}: Testing ${aiName} node`);

      // Find and click the node
      const nodeLocator = page.locator(`text=${aiName}`).first();
      const nodeCount = await nodeLocator.count();

      if (nodeCount === 0) {
        console.warn(`⚠️ SKIP: ${aiName} node not found`);
        continue;
      }

      console.log(`   Clicking ${aiName} node...`);
      // Use force click to bypass animations
      await nodeLocator.click({ force: true, timeout: 5000 }).catch(async (e) => {
        console.warn(`   ⚠️ Click failed, trying alternative selector...`);
        // Try clicking the parent SVG circle
        await page.locator(`[data-agent-id="planning-${aiName.toLowerCase()}"]`).click({ force: true }).catch(() => {
          console.error(`   ❌ Could not click ${aiName} node`);
        });
      });
      await page.waitForTimeout(1000);

      // Verify terminal panel opened
      const terminalPanel = page.locator('[data-testid="agent-terminal-panel"]');
      const panelVisible = await terminalPanel.isVisible();

      if (!panelVisible) {
        console.error(`❌ FAIL: Terminal panel didn't open for ${aiName}`);
        await page.screenshot({ path: `web-ui/test-screenshots/sequential-FAIL-${aiName.toLowerCase()}-no-panel.png` });
        continue;
      }

      console.log(`   ✅ Terminal panel opened for ${aiName}`);

      // Verify close button exists and is visible
      const closeButton = page.locator('[data-testid="terminal-close-button"]');
      const closeVisible = await closeButton.isVisible();

      if (!closeVisible) {
        console.error(`❌ FAIL: Close button not visible for ${aiName}`);
      } else {
        console.log(`   ✅ Close button is visible`);
      }

      // Test scrolling in Logs tab
      console.log(`   Testing scrolling in Logs tab...`);
      const logsTab = page.locator('[data-testid="terminal-tab-logs"]');
      await logsTab.click();
      await page.waitForTimeout(500);

      // Get the scrollable content area
      const contentArea = terminalPanel.locator('.overflow-y-auto').first();
      const contentExists = await contentArea.count() > 0;

      if (!contentExists) {
        console.error(`❌ FAIL: No scrollable content area found for ${aiName}`);
        await page.screenshot({ path: `web-ui/test-screenshots/sequential-FAIL-${aiName.toLowerCase()}-no-scroll.png` });
      } else {
        // Try to scroll
        const scrollBefore = await contentArea.evaluate(el => el.scrollTop);
        await contentArea.evaluate(el => el.scrollTop = 100);
        await page.waitForTimeout(300);
        const scrollAfter = await contentArea.evaluate(el => el.scrollTop);

        if (scrollAfter !== scrollBefore) {
          console.log(`   ✅ Scrolling works (${scrollBefore} → ${scrollAfter})`);
        } else {
          console.error(`❌ FAIL: Scrolling not working for ${aiName} (stuck at ${scrollBefore})`);
        }
      }

      // Take screenshot of this AI's panel
      await page.screenshot({ path: `web-ui/test-screenshots/sequential-06-${aiName.toLowerCase()}-panel.png` });

      // Close the panel using close button
      console.log(`   Closing ${aiName} panel...`);
      await closeButton.click();
      await page.waitForTimeout(500);

      const panelStillVisible = await terminalPanel.isVisible();
      if (panelStillVisible) {
        console.error(`❌ FAIL: Panel didn't close for ${aiName}`);
      } else {
        console.log(`   ✅ Panel closed successfully`);
      }
    }

    // Test 6: Verify orchestrator-root node
    console.log('\n🔍 TEST 6: Testing orchestrator-root node');
    const orchestratorNode = page.locator('text=Hybrid Orchestrator').first();
    const orchCount = await orchestratorNode.count();

    if (orchCount > 0) {
      await orchestratorNode.click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'web-ui/test-screenshots/sequential-07-orchestrator-panel.png' });

      const closeButton = page.locator('[data-testid="terminal-close-button"]');
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    // Final screenshot
    await page.screenshot({ path: 'web-ui/test-screenshots/sequential-08-final.png' });

    console.log('\n✅ All tests completed!');
    console.log('📸 Screenshots saved to web-ui/test-screenshots/');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    await page.screenshot({ path: 'web-ui/test-screenshots/sequential-ERROR.png' });
  } finally {
    console.log('\n⏸️  Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testSequentialPlanningAndScrolling();
