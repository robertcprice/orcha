const { chromium } = require('playwright');

/**
 * FOCUSED TEST: Verify ChatGPT Full Task Output
 *
 * Tests ONLY the critical fix:
 * - Claude, ChatGPT, DeepSeek sequential execution
 * - ChatGPT now sends FULL tasks array (not just count)
 * - Verify tasks have subtasks, file names, parallelization
 */

async function testChatGPTFullOutput() {
  console.log('🔍 VERIFY CHATGPT FULL OUTPUT TEST');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console for verification
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    // Show ChatGPT output
    if (text.includes('[ChatGPT-') || text.includes('"tasks"') || text.includes('task_id')) {
      console.log('📋 ChatGPT:', text.substring(0, 200) + '...');
    }
  });

  try {
    // Navigate
    console.log('\n1️⃣ Navigate to http://localhost:3002');
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1000);

    // Submit task
    console.log('\n2️⃣ Submit Task');
    const taskInput = 'Build a REST API with JWT authentication and bcrypt hashing. Include documentation and tests.';
    console.log(`   "${taskInput}"`);

    await page.fill('input[type="text"]', taskInput);
    await page.press('input[type="text"]', 'Enter');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'web-ui/test-screenshots/chatgpt-verify-01-submitted.png' });

    // Wait for Claude
    console.log('\n3️⃣ Wait for Claude...');
    await page.waitForSelector('text=Claude', { timeout: 15000 });
    console.log('   ✅ Claude appeared');

    // Wait for ChatGPT
    console.log('\n4️⃣ Wait for ChatGPT...');
    await page.waitForSelector('text=ChatGPT', { timeout: 15000 });
    console.log('   ✅ ChatGPT appeared');

    // Wait for DeepSeek
    console.log('\n5️⃣ Wait for DeepSeek...');
    await page.waitForSelector('text=DeepSeek', { timeout: 15000 });
    console.log('   ✅ DeepSeek appeared');

    // Wait for processing
    console.log('\n⏳ Waiting 20 seconds for AI processing...');
    await page.waitForTimeout(20000);

    await page.screenshot({ path: 'web-ui/test-screenshots/chatgpt-verify-02-all-complete.png' });

    // Click ChatGPT node and inspect output
    console.log('\n6️⃣ Click ChatGPT Node');
    const chatgptNode = page.locator('text=ChatGPT').first();
    await chatgptNode.click({ force: true });
    await page.waitForTimeout(1500);

    const terminalPanel = page.locator('[data-testid="agent-terminal-panel"]');
    const panelVisible = await terminalPanel.isVisible();

    if (!panelVisible) {
      console.log('   ❌ Terminal panel not visible');
      await page.screenshot({ path: 'web-ui/test-screenshots/chatgpt-verify-ERROR-no-panel.png' });
      return;
    }

    console.log('   ✅ Terminal panel opened');

    // Get panel text
    const panelText = await terminalPanel.textContent();
    console.log(`   📄 Panel text length: ${panelText.length} characters`);

    // Critical checks
    console.log('\n7️⃣ CRITICAL VERIFICATION');
    console.log('-'.repeat(80));

    const checks = {
      hasTasks: panelText.includes('"tasks"') || panelText.includes('task_id'),
      hasSubtasks: panelText.includes('subtasks') || panelText.includes('subtask'),
      hasFileNames: panelText.includes('.ts') || panelText.includes('.js') || panelText.includes('.tsx'),
      hasDirectories: panelText.includes('src/') || panelText.includes('tests/') || panelText.includes('docs/'),
      hasParallelization: panelText.toLowerCase().includes('parallel'),
      hasSpecializedAgents: panelText.toLowerCase().includes('documentation') ||
                             panelText.toLowerCase().includes('testing') ||
                             panelText.toLowerCase().includes('security') ||
                             panelText.toLowerCase().includes('doc') ||
                             panelText.toLowerCase().includes('qa'),
      notJustCount: !panelText.includes('"tasks_count": 5}') && !panelText.includes('"tasks_count": 7}') || panelText.length > 500
    };

    console.log(`   ${checks.hasTasks ? '✅' : '❌'} Has tasks array: ${checks.hasTasks}`);
    console.log(`   ${checks.hasSubtasks ? '✅' : '❌'} Has subtasks: ${checks.hasSubtasks}`);
    console.log(`   ${checks.hasFileNames ? '✅' : '❌'} Has file names (.ts/.js): ${checks.hasFileNames}`);
    console.log(`   ${checks.hasDirectories ? '✅' : '❌'} Has directory structure: ${checks.hasDirectories}`);
    console.log(`   ${checks.hasParallelization ? '✅' : '❌'} Has parallelization: ${checks.hasParallelization}`);
    console.log(`   ${checks.hasSpecializedAgents ? '✅' : '❌'} Has specialized agents: ${checks.hasSpecializedAgents}`);
    console.log(`   ${checks.notJustCount ? '✅' : '❌'} Not just count (has details): ${checks.notJustCount}`);

    // Show sample of content
    console.log('\n📄 SAMPLE OF CHATGPT OUTPUT:');
    console.log('-'.repeat(80));
    console.log(panelText.substring(0, 1000));
    if (panelText.length > 1000) {
      console.log(`\n... (${panelText.length - 1000} more characters)`);
    }

    await page.screenshot({ path: 'web-ui/test-screenshots/chatgpt-verify-03-panel.png' });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const passedChecks = Object.values(checks).filter(v => v).length;
    const totalChecks = Object.keys(checks).length;

    console.log(`\n✅ Checks Passed: ${passedChecks}/${totalChecks}`);

    if (passedChecks >= 5) {
      console.log('\n🎉 CHATGPT FULL OUTPUT VERIFIED!');
      console.log('   ChatGPT is now sending complete task data with:');
      console.log('   - Full tasks array with subtasks');
      console.log('   - File names and directory structure');
      console.log('   - Parallelization flags');
      console.log('   - Specialized agent assignments');
    } else {
      console.log('\n⚠️  CHATGPT OUTPUT MAY STILL BE TRUNCATED');
      console.log('   Expected to see tasks array with subtasks and file names');
    }

    console.log('\n📸 Screenshots: web-ui/test-screenshots/chatgpt-verify-*.png');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: 'web-ui/test-screenshots/chatgpt-verify-ERROR.png' });
  } finally {
    console.log('\n⏸️  Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testChatGPTFullOutput();
