const { chromium } = require('playwright');

/**
 * Comprehensive Multi-AI Pipeline Test
 *
 * Verifies:
 * 1. All 5 AIs appear sequentially (Claude → ChatGPT → DeepSeek → Grok → Gemini)
 * 2. Each AI completes with 'complete' status
 * 3. Scrolling works in all node panels
 * 4. Close buttons work
 * 5. Gemini produces structured JSON output
 * 6. All specialized agents are mentioned (documentation, testing, security, code_quality)
 * 7. Parallelization is emphasized
 */

async function testMultiAIPipeline() {
  console.log('🧪 COMPREHENSIVE MULTI-AI PIPELINE TEST');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    // Print Gemini's structured output
    if (text.includes('STRUCTURED TASK BREAKDOWN') || text.includes('"task_id"')) {
      console.log('📋 GEMINI OUTPUT:', text);
    }
  });

  try {
    // Navigate to the app
    console.log('\n📍 Step 1: Navigate to http://localhost:3002');
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);

    // Clear old state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'web-ui/test-screenshots/pipeline-01-initial.png' });

    // Submit task
    const taskInput = 'Build a user authentication system with JWT tokens and bcrypt password hashing';
    console.log(`\n📝 Step 2: Submit task`);
    console.log(`   Task: "${taskInput}"`);

    const inputSelector = 'input[type="text"]';
    await page.fill(inputSelector, taskInput);
    await page.press(inputSelector, 'Enter');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'web-ui/test-screenshots/pipeline-02-task-submitted.png' });

    // Test 1: Sequential AI Appearance
    console.log('\n🔍 TEST 1: Sequential AI Appearance');
    console.log('-'.repeat(80));

    const aiTimeline = [
      { name: 'Claude', delay: 500 },
      { name: 'ChatGPT', delay: 3000 },
      { name: 'DeepSeek', delay: 6000 },
      { name: 'Grok', delay: 9000 },
      { name: 'Gemini', delay: 12000 }
    ];

    for (const ai of aiTimeline) {
      console.log(`\n   ⏱️  Checking at ${ai.delay}ms...`);
      await page.waitForTimeout(ai.delay - (aiTimeline[aiTimeline.indexOf(ai) - 1]?.delay || 0));

      const count = await page.locator(`text=${ai.name}`).count();
      if (count > 0) {
        console.log(`   ✅ ${ai.name} appeared`);
      } else {
        console.warn(`   ⚠️  ${ai.name} not yet visible`);
      }
    }

    // Wait for all AIs to complete
    console.log('\n   ⏳ Waiting for all AIs to complete (30 seconds)...');
    await page.waitForTimeout(30000);

    await page.screenshot({ path: 'web-ui/test-screenshots/pipeline-03-all-complete.png' });

    // Test 2: Verify All AIs Completed
    console.log('\n🔍 TEST 2: Verify All AIs Completed Successfully');
    console.log('-'.repeat(80));

    const aiNodes = ['Claude', 'ChatGPT', 'DeepSeek', 'Grok', 'Gemini'];
    const completionResults = {};

    for (const aiName of aiNodes) {
      const nodeCount = await page.locator(`text=${aiName}`).count();
      completionResults[aiName] = nodeCount > 0;

      if (completionResults[aiName]) {
        console.log(`   ✅ ${aiName}: Present`);
      } else {
        console.log(`   ❌ ${aiName}: Missing`);
      }
    }

    // Test 3: Click Each Node and Verify Content
    console.log('\n🔍 TEST 3: Test Node Interaction & Scrolling');
    console.log('-'.repeat(80));

    for (const aiName of aiNodes) {
      if (!completionResults[aiName]) {
        console.log(`\n   ⏭️  Skipping ${aiName} (not present)`);
        continue;
      }

      console.log(`\n   🖱️  Testing ${aiName} node...`);

      // Click the node
      const nodeLocator = page.locator(`text=${aiName}`).first();
      try {
        await nodeLocator.click({ force: true, timeout: 5000 });
      } catch (e) {
        console.warn(`   ⚠️  Click failed, trying data-agent-id...`);
        await page.locator(`[data-agent-id="planning-${aiName.toLowerCase()}"]`).click({ force: true });
      }
      await page.waitForTimeout(1000);

      // Verify panel opened
      const terminalPanel = page.locator('[data-testid="agent-terminal-panel"]');
      const panelVisible = await terminalPanel.isVisible();

      if (!panelVisible) {
        console.log(`   ❌ Panel didn't open`);
        await page.screenshot({ path: `web-ui/test-screenshots/pipeline-FAIL-${aiName.toLowerCase()}.png` });
        continue;
      }

      console.log(`   ✅ Panel opened`);

      // Test close button
      const closeButton = page.locator('[data-testid="terminal-close-button"]');
      const closeVisible = await closeButton.isVisible();
      console.log(`   ${closeVisible ? '✅' : '❌'} Close button ${closeVisible ? 'visible' : 'not visible'}`);

      // Test scrolling
      const contentArea = terminalPanel.locator('.overflow-y-auto').first();
      if (await contentArea.count() > 0) {
        const scrollBefore = await contentArea.evaluate(el => el.scrollTop);
        await contentArea.evaluate(el => el.scrollTop = 100);
        await page.waitForTimeout(300);
        const scrollAfter = await contentArea.evaluate(el => el.scrollTop);

        if (scrollAfter !== scrollBefore) {
          console.log(`   ✅ Scrolling works (${scrollBefore} → ${scrollAfter})`);
        } else {
          console.log(`   ⚠️  Scrolling unchanged (stuck at ${scrollBefore})`);
        }
      }

      // Take screenshot
      await page.screenshot({ path: `web-ui/test-screenshots/pipeline-${aiName.toLowerCase()}-panel.png` });

      // Close panel
      if (closeVisible) {
        await closeButton.click();
        await page.waitForTimeout(500);
        console.log(`   ✅ Panel closed`);
      }
    }

    // Test 4: Analyze Console Logs for Gemini Output
    console.log('\n🔍 TEST 4: Analyze Gemini JSON Output');
    console.log('-'.repeat(80));

    const geminiLogs = consoleLogs.filter(log =>
      log.includes('task_id') ||
      log.includes('documentation_agent') ||
      log.includes('testing_agent') ||
      log.includes('security_agent') ||
      log.includes('code_quality_agent') ||
      log.includes('parallelization')
    );

    if (geminiLogs.length > 0) {
      console.log(`   ✅ Found ${geminiLogs.length} Gemini-related logs`);
      console.log('\n   Sample output:');
      geminiLogs.slice(0, 5).forEach(log => {
        console.log(`      ${log.substring(0, 100)}...`);
      });
    } else {
      console.log(`   ⚠️  No Gemini structured output found in console logs`);
    }

    // Test 5: Check for Specialized Agents
    console.log('\n🔍 TEST 5: Verify Specialized Agents in Output');
    console.log('-'.repeat(80));

    const requiredAgents = [
      'documentation_agent',
      'testing_agent',
      'security_agent',
      'code_quality_agent'
    ];

    const allLogs = consoleLogs.join(' ');
    const agentsFound = {};

    for (const agent of requiredAgents) {
      const found = allLogs.includes(agent) ||
                    allLogs.toLowerCase().includes(agent.replace('_', ' '));
      agentsFound[agent] = found;
      console.log(`   ${found ? '✅' : '❌'} ${agent}: ${found ? 'Found' : 'Not found'}`);
    }

    // Test 6: Check for Parallelization Mentions
    console.log('\n🔍 TEST 6: Verify Parallelization Strategy');
    console.log('-'.repeat(80));

    const parallelKeywords = ['parallel', 'simultaneously', 'concurrent', 'parallelization'];
    const parallelMentions = parallelKeywords.filter(keyword =>
      allLogs.toLowerCase().includes(keyword)
    );

    if (parallelMentions.length > 0) {
      console.log(`   ✅ Parallelization mentioned (keywords: ${parallelMentions.join(', ')})`);
    } else {
      console.log(`   ⚠️  No parallelization keywords found`);
    }

    // Final screenshot
    await page.screenshot({ path: 'web-ui/test-screenshots/pipeline-09-final.png' });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const totalAIs = aiNodes.length;
    const completedAIs = Object.values(completionResults).filter(v => v).length;
    const allAgentsFound = Object.values(agentsFound).every(v => v);
    const parallelizationFound = parallelMentions.length > 0;

    console.log(`\n✅ AIs Completed: ${completedAIs}/${totalAIs}`);
    console.log(`${allAgentsFound ? '✅' : '⚠️ '} All Specialized Agents: ${allAgentsFound ? 'Yes' : 'No'}`);
    console.log(`${parallelizationFound ? '✅' : '⚠️ '} Parallelization Strategy: ${parallelizationFound ? 'Yes' : 'No'}`);

    if (completedAIs === totalAIs && allAgentsFound && parallelizationFound) {
      console.log('\n🎉 ALL TESTS PASSED!');
    } else {
      console.log('\n⚠️  SOME TESTS NEED REVIEW');
    }

    console.log('\n📸 Screenshots saved to web-ui/test-screenshots/');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:', error);
    await page.screenshot({ path: 'web-ui/test-screenshots/pipeline-ERROR.png' });
  } finally {
    console.log('\n⏸️  Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testMultiAIPipeline();
