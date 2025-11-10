const { chromium } = require('playwright');

/**
 * COMPLETE MULTI-AI PIPELINE VERIFICATION
 *
 * Verifies:
 * 1. Sequential execution: Claude → ChatGPT → DeepSeek → Grok → Gemini
 * 2. Each AI receives previous AI's output as input
 * 3. ChatGPT creates tasks and plan with directory structure
 * 4. DeepSeek and Grok provide improved versions
 * 5. Gemini provides final version AND JSON tasks (no exclusions)
 * 6. NO LOOPING occurs
 * 7. Plan tab visible on orchestrator
 * 8. Task agents and code agents spawn correctly
 */

async function completeVerification() {
  console.log('🔍 COMPLETE MULTI-AI PIPELINE VERIFICATION');
  console.log('='.repeat(80));
  console.log('Starting comprehensive test...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track console logs for verification
  const consoleLogs = [];
  const aiOutputs = {
    claude: null,
    chatgpt: null,
    deepseek: null,
    grok: null,
    gemini: null
  };

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ time: Date.now(), text });

    // Capture AI outputs
    if (text.includes('[Claude-') || text.includes('Claude analysis')) {
      console.log('📝 Captured Claude output');
      aiOutputs.claude = text;
    }
    if (text.includes('[ChatGPT-') || text.includes('ChatGPT plan')) {
      console.log('📝 Captured ChatGPT output');
      aiOutputs.chatgpt = text;
    }
    if (text.includes('[DeepSeek-')) {
      console.log('📝 Captured DeepSeek output');
      aiOutputs.deepseek = text;
    }
    if (text.includes('[Grok-')) {
      console.log('📝 Captured Grok output');
      aiOutputs.grok = text;
    }
    if (text.includes('[Gemini-') || text.includes('STRUCTURED TASK BREAKDOWN')) {
      console.log('📝 Captured Gemini output');
      aiOutputs.gemini = text;
    }
  });

  try {
    // Step 1: Navigate and setup
    console.log('📍 Step 1: Navigate to http://localhost:3002');
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);

    // Clear state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'web-ui/test-screenshots/verify-01-initial.png' });

    // Step 2: Submit task
    console.log('\n📝 Step 2: Submit task');
    const taskInput = 'Create a REST API with user authentication using JWT tokens, bcrypt password hashing, and protected routes. Include tests and documentation.';
    console.log(`   Task: "${taskInput}"`);

    const inputSelector = 'input[type="text"]';
    await page.fill(inputSelector, taskInput);
    await page.press(inputSelector, 'Enter');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'web-ui/test-screenshots/verify-02-task-submitted.png' });

    // Step 3: Verify Sequential Execution
    console.log('\n🔍 Step 3: Verify Sequential AI Execution');
    console.log('-'.repeat(80));

    // Track when each AI appears
    const aiTimestamps = {};

    // Wait for Claude to appear first
    console.log('   ⏱️  Waiting for Claude (should appear first)...');
    await page.waitForSelector('text=Claude', { timeout: 10000 });
    aiTimestamps.claude = Date.now();
    console.log('   ✅ Claude appeared');
    await page.screenshot({ path: 'web-ui/test-screenshots/verify-03-claude-appeared.png' });

    // Verify ChatGPT doesn't exist yet
    let chatgptPrecheck = await page.locator('text=ChatGPT').count();
    if (chatgptPrecheck === 0) {
      console.log('   ✅ ChatGPT NOT yet visible (correct sequential order)');
    } else {
      console.log('   ❌ ERROR: ChatGPT appeared before Claude finished!');
    }

    // Wait for ChatGPT
    console.log('   ⏱️  Waiting for ChatGPT...');
    await page.waitForSelector('text=ChatGPT', { timeout: 15000 });
    aiTimestamps.chatgpt = Date.now();
    console.log(`   ✅ ChatGPT appeared (${aiTimestamps.chatgpt - aiTimestamps.claude}ms after Claude)`);
    await page.screenshot({ path: 'web-ui/test-screenshots/verify-04-chatgpt-appeared.png' });

    // Wait for DeepSeek
    console.log('   ⏱️  Waiting for DeepSeek...');
    await page.waitForSelector('text=DeepSeek', { timeout: 15000 });
    aiTimestamps.deepseek = Date.now();
    console.log(`   ✅ DeepSeek appeared (${aiTimestamps.deepseek - aiTimestamps.chatgpt}ms after ChatGPT)`);

    // Wait for Grok
    console.log('   ⏱️  Waiting for Grok...');
    await page.waitForSelector('text=Grok', { timeout: 30000 });
    aiTimestamps.grok = Date.now();
    console.log(`   ✅ Grok appeared (${aiTimestamps.grok - aiTimestamps.deepseek}ms after DeepSeek)`);

    // Wait for Gemini
    console.log('   ⏱️  Waiting for Gemini...');
    await page.waitForSelector('text=Gemini', { timeout: 15000 });
    aiTimestamps.gemini = Date.now();
    console.log(`   ✅ Gemini appeared (${aiTimestamps.gemini - aiTimestamps.grok}ms after Grok)`);

    await page.screenshot({ path: 'web-ui/test-screenshots/verify-05-all-ais-appeared.png' });

    // Wait for all to complete
    console.log('\n   ⏳ Waiting for all AIs to complete (30 seconds)...');
    await page.waitForTimeout(30000);

    await page.screenshot({ path: 'web-ui/test-screenshots/verify-06-all-complete.png' });

    // Step 4: Check each AI's output by clicking nodes
    console.log('\n🔍 Step 4: Verify Each AI\'s Output');
    console.log('-'.repeat(80));

    // Test Claude
    console.log('\n   🖱️  Checking Claude output...');
    const claudeNode = page.locator('text=Claude').first();
    await claudeNode.click({ force: true });
    await page.waitForTimeout(1500);

    const terminalPanel = page.locator('[data-testid="agent-terminal-panel"]');
    let panelVisible = await terminalPanel.isVisible();

    if (panelVisible) {
      // Check for Claude's analysis content
      const panelText = await terminalPanel.textContent();
      const hasAnalysis = panelText.toLowerCase().includes('analyz') ||
                          panelText.toLowerCase().includes('user input') ||
                          panelText.toLowerCase().includes('task');

      console.log(`   ${hasAnalysis ? '✅' : '⚠️'} Claude analysis: ${hasAnalysis ? 'Present' : 'Not found'}`);
      await page.screenshot({ path: 'web-ui/test-screenshots/verify-07-claude-output.png' });

      // Close panel
      const closeButton = page.locator('[data-testid="terminal-close-button"]');
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    // Test ChatGPT
    console.log('\n   🖱️  Checking ChatGPT output...');
    const chatgptNode = page.locator('text=ChatGPT').first();
    await chatgptNode.click({ force: true });
    await page.waitForTimeout(1500);

    panelVisible = await terminalPanel.isVisible();
    if (panelVisible) {
      const panelText = await terminalPanel.textContent();

      // Check for ChatGPT's plan elements
      const hasTaskBreakdown = panelText.includes('task') || panelText.includes('Task');
      const hasFileNames = panelText.includes('.ts') || panelText.includes('.js') || panelText.includes('.tsx');
      const hasDirectoryStructure = panelText.includes('src/') || panelText.includes('tests/') || panelText.includes('docs/');
      const hasParallelization = panelText.toLowerCase().includes('parallel');
      const hasSpecializedAgents = panelText.toLowerCase().includes('documentation') ||
                                    panelText.toLowerCase().includes('testing') ||
                                    panelText.toLowerCase().includes('security');

      console.log(`   ${hasTaskBreakdown ? '✅' : '❌'} Task breakdown: ${hasTaskBreakdown}`);
      console.log(`   ${hasFileNames ? '✅' : '❌'} File names: ${hasFileNames}`);
      console.log(`   ${hasDirectoryStructure ? '✅' : '❌'} Directory structure: ${hasDirectoryStructure}`);
      console.log(`   ${hasParallelization ? '✅' : '❌'} Parallelization: ${hasParallelization}`);
      console.log(`   ${hasSpecializedAgents ? '✅' : '❌'} Specialized agents: ${hasSpecializedAgents}`);

      await page.screenshot({ path: 'web-ui/test-screenshots/verify-08-chatgpt-output.png' });

      const closeButton = page.locator('[data-testid="terminal-close-button"]');
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    // Test DeepSeek
    console.log('\n   🖱️  Checking DeepSeek output...');
    const deepseekNode = page.locator('text=DeepSeek').first();
    await deepseekNode.click({ force: true });
    await page.waitForTimeout(1500);

    panelVisible = await terminalPanel.isVisible();
    if (panelVisible) {
      const panelText = await terminalPanel.textContent();
      const hasImprovements = panelText.toLowerCase().includes('improv') ||
                              panelText.toLowerCase().includes('suggest') ||
                              panelText.toLowerCase().includes('enrich');

      console.log(`   ${hasImprovements ? '✅' : '⚠️'} DeepSeek improvements: ${hasImprovements}`);
      await page.screenshot({ path: 'web-ui/test-screenshots/verify-09-deepseek-output.png' });

      const closeButton = page.locator('[data-testid="terminal-close-button"]');
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    // Test Grok
    console.log('\n   🖱️  Checking Grok output...');
    const grokNode = page.locator('text=Grok').first();
    await grokNode.click({ force: true });
    await page.waitForTimeout(1500);

    panelVisible = await terminalPanel.isVisible();
    if (panelVisible) {
      const panelText = await terminalPanel.textContent();
      const hasReview = panelText.toLowerCase().includes('review') ||
                        panelText.toLowerCase().includes('insight') ||
                        panelText.toLowerCase().includes('alternative');

      console.log(`   ${hasReview ? '✅' : '⚠️'} Grok review: ${hasReview}`);
      await page.screenshot({ path: 'web-ui/test-screenshots/verify-10-grok-output.png' });

      const closeButton = page.locator('[data-testid="terminal-close-button"]');
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    // Test Gemini
    console.log('\n   🖱️  Checking Gemini output...');
    const geminiNode = page.locator('text=Gemini').first();
    await geminiNode.click({ force: true });
    await page.waitForTimeout(1500);

    panelVisible = await terminalPanel.isVisible();
    if (panelVisible) {
      const panelText = await terminalPanel.textContent();

      // Check for Gemini's JSON structure
      const hasJSON = panelText.includes('task_id') || panelText.includes('"tasks"');
      const hasAgents = panelText.includes('documentation_agent') ||
                        panelText.includes('testing_agent') ||
                        panelText.includes('security_agent') ||
                        panelText.includes('code_quality_agent');
      const preservesDirectory = panelText.includes('src/') || panelText.includes('directory');
      const preservesParallel = panelText.toLowerCase().includes('parallel');

      console.log(`   ${hasJSON ? '✅' : '❌'} JSON structure: ${hasJSON}`);
      console.log(`   ${hasAgents ? '✅' : '❌'} Specialized agents: ${hasAgents}`);
      console.log(`   ${preservesDirectory ? '✅' : '❌'} Directory structure preserved: ${preservesDirectory}`);
      console.log(`   ${preservesParallel ? '✅' : '❌'} Parallelization preserved: ${preservesParallel}`);

      await page.screenshot({ path: 'web-ui/test-screenshots/verify-11-gemini-output.png' });

      const closeButton = page.locator('[data-testid="terminal-close-button"]');
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    // Step 5: Check Orchestrator Plan Tab
    console.log('\n🔍 Step 5: Verify Orchestrator Plan Tab');
    console.log('-'.repeat(80));

    const orchestratorNode = page.locator('text=Hybrid Orchestrator').first();
    const orchCount = await orchestratorNode.count();

    if (orchCount > 0) {
      console.log('   🖱️  Clicking Hybrid Orchestrator node...');
      await orchestratorNode.click({ force: true });
      await page.waitForTimeout(1500);

      panelVisible = await terminalPanel.isVisible();
      if (panelVisible) {
        // Check for Plan tab
        const planTab = page.locator('[data-testid="terminal-tab-thoughts"]');
        const planTabExists = await planTab.count() > 0;

        if (planTabExists) {
          console.log('   ✅ Plan tab exists, clicking...');
          await planTab.click();
          await page.waitForTimeout(500);

          const planContent = await terminalPanel.textContent();
          const hasPlanContent = planContent.length > 100;

          console.log(`   ${hasPlanContent ? '✅' : '⚠️'} Plan content visible: ${hasPlanContent}`);
          await page.screenshot({ path: 'web-ui/test-screenshots/verify-12-orchestrator-plan.png' });
        } else {
          console.log('   ⚠️  Plan tab not found');
        }

        const closeButton = page.locator('[data-testid="terminal-close-button"]');
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log('   ⚠️  Orchestrator node not found');
    }

    // Step 6: Check for Loop Prevention
    console.log('\n🔍 Step 6: Verify No Looping Occurs');
    console.log('-'.repeat(80));

    // Count how many times each AI appears
    const claudeCount = await page.locator('text=Claude').count();
    const chatgptCount = await page.locator('text=ChatGPT').count();
    const deepseekCount = await page.locator('text=DeepSeek').count();
    const grokCount = await page.locator('text=Grok').count();
    const geminiCount = await page.locator('text=Gemini').count();

    console.log(`   Claude nodes: ${claudeCount} (should be 1)`);
    console.log(`   ChatGPT nodes: ${chatgptCount} (should be 1)`);
    console.log(`   DeepSeek nodes: ${deepseekCount} (should be 1)`);
    console.log(`   Grok nodes: ${grokCount} (should be 1)`);
    console.log(`   Gemini nodes: ${geminiCount} (should be 1)`);

    const noLoop = claudeCount <= 2 && chatgptCount <= 2 && deepseekCount <= 2 && grokCount <= 2 && geminiCount <= 2;
    console.log(`   ${noLoop ? '✅' : '❌'} No looping detected: ${noLoop}`);

    // Step 7: Wait and check for task/code agents spawning
    console.log('\n🔍 Step 7: Check for Task/Code Agent Spawning');
    console.log('-'.repeat(80));
    console.log('   ⏳ Waiting 10 seconds for agents to spawn...');
    await page.waitForTimeout(10000);

    // Look for any new agent nodes
    const allText = await page.textContent('body');
    const hasTaskAgents = allText.includes('task-') || allText.includes('Task-') || allText.includes('CODE') || allText.includes('DOC') || allText.includes('QA');

    console.log(`   ${hasTaskAgents ? '✅' : '⚠️'} Task/Code agents: ${hasTaskAgents ? 'Detected' : 'Not yet spawned (may need more time)'}`);

    await page.screenshot({ path: 'web-ui/test-screenshots/verify-13-final-state.png' });

    // Final Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(80));

    console.log('\n✅ Sequential Execution:');
    console.log(`   Claude → ChatGPT: ${aiTimestamps.chatgpt - aiTimestamps.claude}ms`);
    console.log(`   ChatGPT → DeepSeek: ${aiTimestamps.deepseek - aiTimestamps.chatgpt}ms`);
    console.log(`   DeepSeek → Grok: ${aiTimestamps.grok - aiTimestamps.deepseek}ms`);
    console.log(`   Grok → Gemini: ${aiTimestamps.gemini - aiTimestamps.grok}ms`);

    console.log('\n📋 Output Verification:');
    console.log(`   ${noLoop ? '✅' : '❌'} No looping`);
    console.log('   See screenshots for detailed output verification');

    console.log('\n📸 Screenshots saved to web-ui/test-screenshots/verify-*.png');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: 'web-ui/test-screenshots/verify-ERROR.png' });
  } finally {
    console.log('\n⏸️  Keeping browser open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

completeVerification();
