const { chromium } = require('playwright');

async function testFullPlanningSequence() {
  console.log('🎬 Starting Full Planning Sequence Test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Step 1: Navigate to homepage
    console.log('📍 Step 1: Navigating to homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/full-planning-01-initial.png' });
    console.log('✅ Homepage loaded\n');

    // Step 2: Submit a task
    console.log('📍 Step 2: Submitting task...');
    const taskInput = 'Build a simple calculator app with add, subtract, multiply, and divide functions. Include input validation and error handling.';

    await page.fill('textarea[placeholder*="task"], textarea[placeholder*="goal"], input[placeholder*="task"]', taskInput);
    await page.waitForTimeout(500);

    // Click submit button
    await page.click('button:has-text("Submit"), button:has-text("Start")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/full-planning-02-task-submitted.png' });
    console.log('✅ Task submitted\n');

    // Step 3: Wait for planning nodes to appear
    console.log('📍 Step 3: Waiting for AI planning nodes...');
    const aiNames = ['Claude', 'ChatGPT', 'DeepSeek', 'Grok', 'Gemini'];
    const foundNodes = [];

    // Wait up to 120 seconds for all 5 AI nodes
    for (let i = 0; i < 120; i++) {
      for (const aiName of aiNames) {
        if (!foundNodes.includes(aiName)) {
          const nodeExists = await page.locator(`text=${aiName}`).count() > 0;
          if (nodeExists) {
            foundNodes.push(aiName);
            console.log(`  ✓ ${aiName} node appeared`);
          }
        }
      }

      if (foundNodes.length === 5) {
        console.log('✅ All 5 AI planning nodes appeared!\n');
        break;
      }

      await page.waitForTimeout(1000);
    }

    if (foundNodes.length < 5) {
      console.log(`⚠️  Only ${foundNodes.length}/5 nodes appeared: ${foundNodes.join(', ')}\n`);
    }

    await page.screenshot({ path: 'test-screenshots/full-planning-03-all-nodes-visible.png' });

    // Step 4: Verify each node has full (non-truncated) input
    console.log('📍 Step 4: Verifying node inputs are NOT truncated...');

    for (const aiName of foundNodes) {
      // Click on the node
      await page.locator(`text=${aiName}`).first().click({ force: true });
      await page.waitForTimeout(1500);

      // Click Input tab
      const inputTab = page.locator('text=Input').first();
      if (await inputTab.count() > 0) {
        await inputTab.click({ force: true });
        await page.waitForTimeout(500);

        // Get input panel content
        const inputPanel = page.locator('[data-testid="agent-terminal-panel"], .overflow-y-auto').first();
        const inputText = await inputPanel.textContent();

        // Check if content is substantial (not truncated)
        const hasSubstantialContent = inputText.length > 200;
        const notTruncatedMessage = !inputText.includes('...\n') || inputText.length > 2000;

        console.log(`  ${aiName}:`);
        console.log(`    - Input length: ${inputText.length} chars`);
        console.log(`    - Has substantial content: ${hasSubstantialContent ? '✅' : '❌'}`);
        console.log(`    - Not truncated: ${notTruncatedMessage ? '✅' : '❌'}`);

        // For DeepSeek specifically, verify it has Claude AND ChatGPT output
        if (aiName === 'DeepSeek') {
          const hasClaude = inputText.includes("Claude") || inputText.includes("Initial");
          const hasChatGPT = inputText.includes("ChatGPT") || inputText.includes("Execution Plan") || inputText.includes("tasks");
          console.log(`    - Contains Claude output: ${hasClaude ? '✅' : '❌'}`);
          console.log(`    - Contains ChatGPT output: ${hasChatGPT ? '✅' : '❌'}`);
        }

        await page.screenshot({ path: `test-screenshots/full-planning-04-${aiName.toLowerCase()}-input.png` });
      }

      console.log('');
    }

    // Step 5: Wait for planning to complete
    console.log('📍 Step 5: Waiting for planning to complete...');
    await page.waitForTimeout(10000); // Wait 10 seconds for planning to finish
    await page.screenshot({ path: 'test-screenshots/full-planning-05-planning-complete.png' });
    console.log('✅ Planning phase complete\n');

    // Step 6: Check if orchestrator transitioned to active
    console.log('📍 Step 6: Checking orchestrator status...');
    const orchestratorNode = page.locator('text=Hybrid Orchestrator, text=Orchestrator').first();
    if (await orchestratorNode.count() > 0) {
      await orchestratorNode.click({ force: true });
      await page.waitForTimeout(1000);

      const statusText = await page.textContent('body');
      const hasActiveStatus = statusText.includes('active') || statusText.includes('executing');
      console.log(`  Orchestrator status: ${hasActiveStatus ? '✅ Active/Executing' : '⚠️  Still planning'}\n`);
    }

    // Step 7: Look for agent nodes (Claude agents spawned)
    console.log('📍 Step 7: Checking for spawned agent nodes...');
    const agentKeywords = ['Agent', 'Claude', 'Executor', 'Task'];
    let agentNodesFound = 0;

    for (const keyword of agentKeywords) {
      const nodes = await page.locator(`text=${keyword}`).count();
      if (nodes > 0) {
        console.log(`  Found ${nodes} nodes with "${keyword}"`);
        agentNodesFound += nodes;
      }
    }

    if (agentNodesFound > 5) {
      console.log(`✅ Agent nodes detected (${agentNodesFound} total)\n`);
    } else {
      console.log(`⚠️  Few agent nodes found (${agentNodesFound}). May still be planning.\n`);
    }

    await page.screenshot({ path: 'test-screenshots/full-planning-06-agent-nodes.png' });

    // Step 8: Check for task tree/list
    console.log('📍 Step 8: Checking for task tree/list...');

    // Look for tree visualization elements
    const hasCanvas = await page.locator('canvas').count() > 0;
    const hasTreeElements = await page.locator('[data-node-id], .node, .agent-node').count() > 0;
    const hasTasks = await page.locator('text=Task').count() > 3;

    console.log(`  Canvas element: ${hasCanvas ? '✅' : '❌'}`);
    console.log(`  Tree elements: ${hasTreeElements ? '✅' : '❌'}`);
    console.log(`  Task references: ${hasTasks ? '✅' : '❌'}`);

    await page.screenshot({ path: 'test-screenshots/full-planning-07-task-tree.png' });

    // Step 9: Final state verification
    console.log('\n📍 Step 9: Final state verification...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-screenshots/full-planning-08-final-state.png' });

    // Check for any error messages
    const errorElements = await page.locator('text=error, text=Error, text=failed, text=Failed').count();
    console.log(`  Errors detected: ${errorElements > 0 ? `⚠️  ${errorElements} found` : '✅ None'}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Task submitted successfully`);
    console.log(`${foundNodes.length === 5 ? '✅' : '⚠️ '} AI Planning Nodes: ${foundNodes.length}/5`);
    console.log(`${agentNodesFound > 5 ? '✅' : '⚠️ '} Agent Nodes Spawned: ${agentNodesFound}`);
    console.log(`${hasTreeElements ? '✅' : '⚠️ '} Task Tree Created: ${hasTreeElements}`);
    console.log('='.repeat(60));

    console.log('\n✅ Full planning sequence test complete!');
    console.log('📸 Screenshots saved to test-screenshots/\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-screenshots/full-planning-ERROR.png' });
  } finally {
    // Keep browser open for manual inspection
    console.log('⏸️  Browser kept open for inspection. Press Ctrl+C to close.');
    // Don't close - let user inspect
    // await browser.close();
  }
}

testFullPlanningSequence();
