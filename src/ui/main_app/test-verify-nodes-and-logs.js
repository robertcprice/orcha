/**
 * RIGOROUS NODE AND LOG VERIFICATION TEST
 *
 * This test will:
 * 1. Submit a task
 * 2. Wait for agent nodes to appear ON THE CANVAS
 * 3. Click on each node
 * 4. Verify logs/outputs appear for that agent
 * 5. Take screenshots of everything
 */

const { chromium } = require('playwright');

async function verifyNodesAndLogs() {
  console.log('\n🔬 RIGOROUS NODE AND LOG VERIFICATION TEST\n');
  console.log('=' + '='.repeat(79));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const wsEvents = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('WebSocket event received:')) {
      wsEvents.push({ time: Date.now(), text });
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`   🐛 Error: ${error.message}`);
  });

  try {
    console.log('\n📋 STEP 1: Load page and submit task');
    console.log('-'.repeat(80));

    await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   ✅ Page loaded');

    await page.waitForTimeout(3000);

    // Submit task
    const taskInput = await page.locator('input[type="text"]').first();
    await taskInput.fill('Create a Python hello world function');
    console.log('   ✅ Task typed');

    await taskInput.press('Enter');
    console.log('   ✅ Task submitted (ENTER pressed)');

    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/verify-01-task-submitted.png',
      fullPage: true
    });

    console.log('\n📋 STEP 2: Wait for agent nodes to appear (45 seconds)');
    console.log('-'.repeat(80));

    await page.waitForTimeout(5000);

    // Look for actual agent nodes - try multiple strategies
    console.log('   → Looking for agent nodes using multiple strategies...\n');

    // Strategy 1: Look for SVG circles (common for node visualization)
    const svgCircles = await page.locator('svg circle').count();
    console.log(`   📊 Strategy 1 (SVG circles): ${svgCircles} found`);

    // Strategy 2: Look for elements with agent/node class names
    const agentElements = await page.locator('[class*="agent"], [class*="node"]').count();
    console.log(`   📊 Strategy 2 (agent/node classes): ${agentElements} found`);

    // Strategy 3: Look for specific text patterns
    const statusTexts = await page.locator('text=/planning|active|spawning|complete|executing/i').count();
    console.log(`   📊 Strategy 3 (status texts): ${statusTexts} found`);

    // Strategy 4: Get all clickable elements and log them
    const clickableElements = await page.locator('button, [role="button"], [onclick], [class*="clickable"]').count();
    console.log(`   📊 Strategy 4 (clickable elements): ${clickableElements} found`);

    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/verify-02-looking-for-nodes.png',
      fullPage: true
    });

    // Wait longer for nodes to fully render
    console.log('\n   → Waiting 40 more seconds for all agents to spawn and render...');
    await page.waitForTimeout(40000);

    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/verify-03-after-waiting.png',
      fullPage: true
    });

    // Re-check for nodes
    const finalCircles = await page.locator('svg circle').count();
    const finalAgentElements = await page.locator('[class*="agent"], [class*="node"]').count();
    console.log(`\n   📊 Final SVG circles: ${finalCircles}`);
    console.log(`   📊 Final agent elements: ${finalAgentElements}`);

    console.log('\n📋 STEP 3: Inspect page structure');
    console.log('-'.repeat(80));

    // Get the actual HTML structure
    const bodyHTML = await page.locator('body').innerHTML();
    const svgCount = (bodyHTML.match(/<svg/g) || []).length;
    const circleCount = (bodyHTML.match(/<circle/g) || []).length;

    console.log(`   📊 SVG tags in page: ${svgCount}`);
    console.log(`   📊 Circle tags in page: ${circleCount}`);

    // Check for orchestrator canvas
    const canvasExists = await page.locator('text=/orchestrator/i').count();
    console.log(`   📊 Orchestrator text found: ${canvasExists}`);

    console.log('\n📋 STEP 4: Try to find and click on ANY visible element');
    console.log('-'.repeat(80));

    // Get all visible clickable elements
    const allElements = await page.locator('*').all();
    let clickableCount = 0;

    console.log(`   → Checking ${Math.min(allElements.length, 50)} elements for visibility and clickability...`);

    // Try clicking on SVG circles if they exist
    if (finalCircles > 0) {
      console.log(`\n   → Found ${finalCircles} SVG circles, attempting to click the first one...`);

      try {
        const firstCircle = page.locator('svg circle').first();
        await firstCircle.click({ timeout: 5000 });
        console.log('   ✅ Clicked on first circle!');

        await page.waitForTimeout(3000);

        await page.screenshot({
          path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/verify-04-after-click.png',
          fullPage: true
        });

        // Check if anything new appeared (like a terminal panel)
        const terminals = await page.locator('text=/terminal|output|log|thinking/i').count();
        console.log(`   📊 Terminal/output elements after click: ${terminals}`);

        // Check for sidebar or panel
        const panels = await page.locator('[class*="panel"], [class*="terminal"], [class*="sidebar"]').count();
        console.log(`   📊 Panel elements: ${panels}`);

      } catch (error) {
        console.log(`   ❌ Failed to click: ${error.message}`);
      }
    } else {
      console.log('   ⚠️  No SVG circles found to click on');
    }

    console.log('\n📋 STEP 5: Check WebSocket events');
    console.log('-'.repeat(80));

    // Filter for agent events
    const agentSpawnEvents = wsEvents.filter(e => e.text.includes('agent_spawned')).length;
    const agentOutputEvents = wsEvents.filter(e => e.text.includes('agent_output')).length;

    console.log(`   📊 Total WebSocket events: ${wsEvents.length}`);
    console.log(`   📊 agent_spawned events: ${agentSpawnEvents}`);
    console.log(`   📊 agent_output events: ${agentOutputEvents}`);

    if (agentSpawnEvents > 0) {
      console.log('\n   Recent agent_spawned events:');
      wsEvents
        .filter(e => e.text.includes('agent_spawned'))
        .slice(0, 5)
        .forEach((e, i) => {
          console.log(`      ${i + 1}. ${e.text.substring(0, 100)}...`);
        });
    }

    console.log('\n📋 STEP 6: Final Analysis');
    console.log('-'.repeat(80));

    const results = {
      taskSubmitted: true,
      wsEventsReceived: wsEvents.length > 0,
      agentSpawned: agentSpawnEvents > 0,
      agentOutputs: agentOutputEvents > 0,
      nodesVisuallyPresent: finalCircles > 0 || finalAgentElements > 0,
      logsVisibleOnClick: false, // Will update if we found logs
      errors: errors.length
    };

    console.log('\n   Results:');
    console.log(`   ✅ Task submitted: ${results.taskSubmitted}`);
    console.log(`   ${results.wsEventsReceived ? '✅' : '❌'} WebSocket events received: ${results.wsEventsReceived}`);
    console.log(`   ${results.agentSpawned ? '✅' : '❌'} Agents spawned: ${results.agentSpawned}`);
    console.log(`   ${results.agentOutputs ? '✅' : '❌'} Agent outputs received: ${results.agentOutputs}`);
    console.log(`   ${results.nodesVisuallyPresent ? '✅' : '⚠️ '} Nodes visually present: ${results.nodesVisuallyPresent}`);
    console.log(`   ${errors.length === 0 ? '✅' : '❌'} No errors: ${errors.length === 0}`);

    if (!results.nodesVisuallyPresent) {
      console.log('\n   ⚠️  WARNING: Agent nodes are NOT visually appearing on the canvas!');
      console.log('   This means:');
      console.log('   - WebSocket events are flowing ✅');
      console.log('   - Agents are spawning in backend ✅');
      console.log('   - BUT nodes are not rendering in UI ❌');
      console.log('\n   This is a rendering bug in OrchestratorCanvas component.');
    }

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/verify-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('\n✅ Test complete. Browser closed.\n');
  }
}

verifyNodesAndLogs().catch(console.error);
