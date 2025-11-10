const { chromium } = require('playwright');
const fs = require('fs');

async function dumpChatGPTOutput() {
  console.log('🔍 DUMP CHATGPT OUTPUT TEST');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();

  try {
    console.log('\n1️⃣ Navigate to http://localhost:3002');
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);

    // Clear storage
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

    // Wait for nodes
    console.log('\n3️⃣ Wait for Claude, ChatGPT, DeepSeek...');
    await page.waitForSelector('text=Claude', { timeout: 15000 });
    console.log('   ✅ Claude appeared');

    await page.waitForSelector('text=ChatGPT', { timeout: 15000 });
    console.log('   ✅ ChatGPT appeared');

    await page.waitForSelector('text=DeepSeek', { timeout: 15000 });
    console.log('   ✅ DeepSeek appeared');

    // Wait for processing
    console.log('\n⏳ Waiting 20 seconds for AI processing...');
    await page.waitForTimeout(20000);

    // Click ChatGPT node
    console.log('\n4️⃣ Click ChatGPT Node and Extract Full Text');
    const chatgptNode = page.locator('text=ChatGPT').first();
    await chatgptNode.click({ force: true });
    await page.waitForTimeout(1500);

    const terminalPanel = page.locator('[data-testid="agent-terminal-panel"]');
    const panelVisible = await terminalPanel.isVisible();

    if (!panelVisible) {
      console.log('   ❌ Terminal panel not visible');
      return;
    }

    console.log('   ✅ Terminal panel opened');

    // Get FULL panel text
    const panelText = await terminalPanel.textContent();

    console.log(`\n5️⃣ Saving to file (${panelText.length} characters)...`);

    // Save to file
    const outputPath = 'web-ui/chatgpt-output-full.txt';
    fs.writeFileSync(outputPath, panelText);

    console.log(`   ✅ Saved to ${outputPath}`);

    // Also print first 2000 chars
    console.log('\n' + '='.repeat(80));
    console.log('📄 FIRST 2000 CHARACTERS:');
    console.log('='.repeat(80));
    console.log(panelText.substring(0, 2000));

    // Check for subtasks
    const hasSubtasks = panelText.includes('subtasks') || panelText.includes('subtask');
    console.log('\n' + '='.repeat(80));
    console.log('🔍 QUICK CHECK:');
    console.log('='.repeat(80));
    console.log(`   Has word "subtasks": ${hasSubtasks}`);
    console.log(`   Total length: ${panelText.length} chars`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  } finally {
    console.log('\n⏸️  Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

dumpChatGPTOutput();
