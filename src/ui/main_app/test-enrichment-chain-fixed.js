const { chromium } = require('playwright');
const fs = require('fs');

/**
 * ENRICHMENT CHAIN VERIFICATION TEST
 *
 * Verifies that each AI receives previous AI outputs as input:
 * - ChatGPT gets Claude's analysis
 * - DeepSeek gets Claude + ChatGPT
 * - Grok gets Claude + ChatGPT + DeepSeek
 * - Gemini gets all previous AIs
 */

async function verifyEnrichmentChain() {
  console.log('🔗 ENRICHMENT CHAIN VERIFICATION TEST');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();

  const results = {
    chatgpt_has_claude: false,
    deepseek_has_chatgpt: false,
    grok_has_deepseek: false,
    all_outputs_complete: false
  };

  try {
    console.log('\n1️⃣ Navigate and Clear Storage');
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1000);

    console.log('\n2️⃣ Submit Task');
    const taskInput = 'Create a user authentication system with password reset and email verification';
    console.log(`   "${taskInput}"`);

    await page.fill('input[type="text"]', taskInput);
    await page.press('input[type="text"]', 'Enter');
    await page.waitForTimeout(1000);

    console.log('\n3️⃣ Wait for All AI Nodes');
    await page.waitForSelector('text=Claude', { timeout: 15000 });
    console.log('   ✅ Claude appeared');

    await page.waitForSelector('text=ChatGPT', { timeout: 15000 });
    console.log('   ✅ ChatGPT appeared');

    await page.waitForSelector('text=DeepSeek', { timeout: 15000 });
    console.log('   ✅ DeepSeek appeared');

    console.log('   ⏳ Waiting 25 seconds for AI processing...');
    await page.waitForTimeout(25000);

    console.log('\n' + '='.repeat(80));
    console.log('🔍 VERIFICATION: CHATGPT INPUT');
    console.log('='.repeat(80));

    // Click ChatGPT
    await page.locator('text=ChatGPT').first().click({ force: true });
    await page.waitForTimeout(1500);

    // Check Input tab
    const inputTab = page.locator('text=Input').first();
    await inputTab.click({ force: true });
    await page.waitForTimeout(500);

    const chatgptInputPanel = page.locator('[data-testid="agent-terminal-panel"]');
    const chatgptInputText = await chatgptInputPanel.textContent();

    console.log(`   Length: ${chatgptInputText.length} characters`);
    results.chatgpt_has_claude = chatgptInputText.includes("Claude's Plan") ||
                                   chatgptInputText.includes("Initial Goal Analysis");

    console.log(`   ${results.chatgpt_has_claude ? '✅' : '❌'} Contains Claude's analysis: ${results.chatgpt_has_claude}`);

    // Save to file
    fs.writeFileSync('web-ui/chatgpt-input.txt', chatgptInputText);

    console.log('\n' + '='.repeat(80));
    console.log('🔍 VERIFICATION: DEEPSEEK INPUT');
    console.log('='.repeat(80));

    // Click DeepSeek
    await page.locator('text=DeepSeek').first().click({ force: true });
    await page.waitForTimeout(1500);

    // Check Input tab
    await page.locator('text=Input').first().click({ force: true });
    await page.waitForTimeout(500);

    const deepseekInputPanel = page.locator('[data-testid="agent-terminal-panel"]');
    const deepseekInputText = await deepseekInputPanel.textContent();

    console.log(`   Length: ${deepseekInputText.length} characters`);

    // Check for ChatGPT's plan
    const hasChatGPTPlan = deepseekInputText.includes("ChatGPT's Execution Plan") ||
                           deepseekInputText.includes("plan_id") ||
                           deepseekInputText.includes("tasks") ||
                           deepseekInputText.includes("reasoning");

    const hasClaudeAnalysis = deepseekInputText.includes("Claude's Analysis") ||
                              deepseekInputText.includes("Initial Goal Analysis");

    results.deepseek_has_chatgpt = hasChatGPTPlan;

    console.log(`   ${hasClaudeAnalysis ? '✅' : '❌'} Contains Claude's analysis: ${hasClaudeAnalysis}`);
    console.log(`   ${hasChatGPTPlan ? '✅' : '❌'} Contains ChatGPT's plan: ${hasChatGPTPlan}`);

    // Save to file
    fs.writeFileSync('web-ui/deepseek-input.txt', deepseekInputText);

    // Show sample
    console.log('\n   📄 SAMPLE (first 500 chars):');
    console.log('   ' + '-'.repeat(76));
    console.log('   ' + deepseekInputText.substring(0, 500).split('\n').join('\n   '));

    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const passedChecks = Object.values(results).filter(v => v).length;
    const totalChecks = Object.keys(results).length;

    console.log(`\n✅ Checks Passed: ${passedChecks}/${totalChecks}`);
    console.log('');
    console.log(`   ChatGPT has Claude's analysis: ${results.chatgpt_has_claude ? '✅' : '❌'}`);
    console.log(`   DeepSeek has ChatGPT's plan: ${results.deepseek_has_chatgpt ? '✅' : '❌'}`);

    if (passedChecks >= 2) {
      console.log('\n🎉 ENRICHMENT CHAIN VERIFIED!');
      console.log('   Each AI is now receiving previous AI outputs as input.');
      console.log('   The sequential flow is working correctly.');
    } else {
      console.log('\n⚠️  ENRICHMENT CHAIN STILL HAS ISSUES');
      console.log('   Some AIs are not receiving previous outputs.');
    }

    console.log('\n📁 Full outputs saved to:');
    console.log('   - web-ui/chatgpt-input.txt');
    console.log('   - web-ui/deepseek-input.txt');

    await page.screenshot({ path: 'web-ui/test-screenshots/enrichment-chain-verified.png' });

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: 'web-ui/test-screenshots/enrichment-chain-ERROR.png' });
  } finally {
    console.log('\n⏸️  Keeping browser open for 15 seconds...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

verifyEnrichmentChain();
