const { chromium } = require('playwright');

(async () => {
  console.log('=== AGENT VISUALIZATION TEST ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track all console messages, especially warnings
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });

    if (msg.type() === 'warn') {
      console.log('⚠️  Warning:', text);
    } else if (text.includes('Parent agent not found')) {
      console.log('❌ CRITICAL:', text);
    } else if (text.includes('WebSocket event received')) {
      console.log('📨', text);
    }
  });

  try {
    // 1. Load the app
    console.log('1️⃣ Loading app at http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Give time for orchestrator-root to initialize

    // 2. Check initial state
    console.log('\n2️⃣ Checking initial agent nodes...');
    const initialNodes = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[data-agent-id]');
      return Array.from(nodes).map(n => n.getAttribute('data-agent-id'));
    });
    console.log('   Initial nodes found:', initialNodes.length > 0 ? initialNodes : 'None visible (checking divs with position)');

    // Also check for divs with position styles (alternative way nodes might be rendered)
    const positionedDivs = await page.evaluate(() => {
      const divs = document.querySelectorAll('div[style*="position"][style*="left"][style*="top"]');
      return divs.length;
    });
    console.log('   Positioned divs found:', positionedDivs);

    // 3. Submit a task
    console.log('\n3️⃣ Submitting test task...');
    const input = await page.locator('input[placeholder*="Describe"]').first();
    await input.click();
    await input.fill('Create a simple test function');
    await input.press('Enter');
    console.log('   Task submitted ✅');

    // 4. Wait for orchestrator activation
    console.log('\n4️⃣ Waiting for orchestrator activation...');
    await page.waitForTimeout(3000);

    // 5. Check for agent_spawned warnings
    const parentNotFoundWarnings = consoleMessages.filter(m =>
      m.text.includes('Parent agent not found')
    );
    if (parentNotFoundWarnings.length > 0) {
      console.log('   ❌ CRITICAL ISSUE: Parent agent not found warnings:', parentNotFoundWarnings.length);
      parentNotFoundWarnings.forEach(w => console.log('      -', w.text));
    } else {
      console.log('   ✅ No parent agent warnings');
    }

    // 6. Check for agent_spawned events
    const agentSpawnedEvents = consoleMessages.filter(m =>
      m.text.includes('agent_spawned')
    );
    console.log('   Agent spawned events received:', agentSpawnedEvents.length);

    // 7. Wait longer and check final state
    console.log('\n5️⃣ Waiting 10 seconds for agents to spawn...');
    await page.waitForTimeout(10000);

    // Check nodes again
    const finalNodes = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[data-agent-id]');
      return Array.from(nodes).map(n => n.getAttribute('data-agent-id'));
    });

    const finalPositionedDivs = await page.evaluate(() => {
      const divs = document.querySelectorAll('div[style*="position"][style*="left"][style*="top"]');
      return divs.length;
    });

    console.log('\n6️⃣ Final check:');
    console.log('   Agent nodes with data-agent-id:', finalNodes.length > 0 ? finalNodes : 'None');
    console.log('   Positioned divs (potential nodes):', finalPositionedDivs);
    console.log('   Agent spawned events:', agentSpawnedEvents.length);
    console.log('   Parent not found warnings:', parentNotFoundWarnings.length);

    // Take a screenshot
    await page.screenshot({ path: 'test-screenshots/agent-visualization-final.png', fullPage: true });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));

    const hasParentWarnings = parentNotFoundWarnings.length > 0;
    const hasAgentEvents = agentSpawnedEvents.length > 0;
    const hasVisibleNodes = finalPositionedDivs > 1; // More than just orchestrator

    console.log('WebSocket Events:', hasAgentEvents ? `✅ ${agentSpawnedEvents.length} events` : '❌ No events');
    console.log('Parent Warnings:', hasParentWarnings ? `❌ ${parentNotFoundWarnings.length} warnings` : '✅ None');
    console.log('Visible Nodes:', hasVisibleNodes ? `✅ ${finalPositionedDivs} nodes` : '❌ No nodes');

    if (hasParentWarnings) {
      console.log('\n🔴 CRITICAL ISSUE DETECTED:');
      console.log('The agent_spawned events are arriving but parent agent (orchestrator-root) is not found.');
      console.log('This is preventing agent nodes from being rendered in the visualization.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
})();