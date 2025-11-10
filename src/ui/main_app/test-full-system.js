const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

// Helper function to wait for condition with timeout
async function waitForCondition(checkFn, timeout = 30000, interval = 500) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await checkFn()) return true;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
}

// Helper to start Python orchestrator with verbose mode
function startOrchestrator(taskId, goal) {
  console.log(`📝 Starting orchestrator for task ${taskId}...`);
  const orchestratorPath = path.join(__dirname, '..', 'orchestrator', 'run_hybrid_task_v4.py');

  const proc = spawn('python3', [
    orchestratorPath,
    '--task-id', taskId,
    '--goal', goal,
    '--context', '{}',
    '--verbose'  // Enable verbose mode
  ], {
    env: { ...process.env, VERBOSE_MODE: 'true' },
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Log orchestrator output
  proc.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('ChatGPT') || output.includes('Claude') || output.includes('thinking')) {
      console.log('🤖 Orchestrator:', output.trim());
    }
  });

  proc.stderr.on('data', (data) => {
    console.error('❌ Orchestrator error:', data.toString());
  });

  return proc;
}

(async () => {
  console.log('🚀 FULL SYSTEM TEST - AGENT VISUALIZATION & THINKING');
  console.log('=' .repeat(50));

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Capture all console messages
  const consoleMessages = [];
  const websocketEvents = [];
  const agentEvents = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text, time: new Date().toISOString() });

    // Track WebSocket events
    if (text.includes('WebSocket event received')) {
      websocketEvents.push(text);
      console.log('📨', text);
    }

    // Track agent events
    if (text.includes('agent_spawned') || text.includes('agent_output') || text.includes('agent_started')) {
      agentEvents.push(text);
      console.log('🤖 Agent Event:', text);
    }

    // Log errors and warnings
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`${msg.type() === 'error' ? '❌' : '⚠️'} ${msg.type()}:`, text);
    }
  });

  try {
    // 1. Navigate to the app
    console.log('\n1️⃣ Loading application...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 2. Check WebSocket connection
    console.log('\n2️⃣ Checking WebSocket connections...');
    const wsErrors = consoleMessages.filter(m =>
      m.type === 'error' && m.text.includes('WebSocket')
    );

    if (wsErrors.length > 0) {
      console.log('❌ WebSocket errors found:', wsErrors.length);
      wsErrors.forEach(err => console.log('  -', err.text));
    } else {
      console.log('✅ No WebSocket errors');
    }

    // 3. Submit a task through the UI
    console.log('\n3️⃣ Submitting test task...');
    const taskId = `test_${Date.now()}`;
    const taskGoal = 'Create a simple calculator function that adds two numbers';

    // Find and fill the input
    const input = await page.locator('input[placeholder*="Describe"]').first();
    await input.click();
    await input.fill(taskGoal);

    // Take screenshot before submission
    await page.screenshot({
      path: 'test-screenshots/full-test-01-before-submit.png',
      fullPage: true
    });

    // Submit the task
    await input.press('Enter');
    console.log('✅ Task submitted:', taskGoal);

    // 4. Wait for orchestrator to start
    console.log('\n4️⃣ Waiting for orchestrator to start...');
    await page.waitForTimeout(3000);

    // Check for manager_started event
    const managerStarted = await waitForCondition(async () => {
      return websocketEvents.some(e => e.includes('manager_started'));
    }, 10000);

    if (managerStarted) {
      console.log('✅ Orchestrator started (manager_started event received)');
    } else {
      console.log('⚠️ No manager_started event received');
    }

    // 5. Check for agent spawn events
    console.log('\n5️⃣ Checking for agent spawn events...');
    await page.waitForTimeout(5000);

    const chatgptSpawned = agentEvents.some(e => e.includes('CHATGPT') && e.includes('spawn'));
    const claudeSpawned = agentEvents.some(e => e.includes('CLAUDE') && e.includes('spawn'));

    console.log(`  ChatGPT spawned: ${chatgptSpawned ? '✅' : '❌'}`);
    console.log(`  Claude spawned: ${claudeSpawned ? '✅' : '❌'}`);

    // 6. Check for agent thinking output
    console.log('\n6️⃣ Checking for agent thinking output...');
    const chatgptThinking = agentEvents.some(e =>
      e.includes('CHATGPT') && (e.includes('thinking') || e.includes('output'))
    );
    const claudeThinking = agentEvents.some(e =>
      e.includes('CLAUDE') && (e.includes('thinking') || e.includes('output'))
    );

    console.log(`  ChatGPT thinking visible: ${chatgptThinking ? '✅' : '❌'}`);
    console.log(`  Claude thinking visible: ${claudeThinking ? '✅' : '❌'}`);

    // 7. Check agent visualization nodes
    console.log('\n7️⃣ Checking agent visualization nodes...');

    // Look for agent nodes in the DOM
    const agentNodes = await page.evaluate(() => {
      // Check for data-agent-id attributes
      const nodesWithId = document.querySelectorAll('[data-agent-id]');
      const ids = Array.from(nodesWithId).map(n => n.getAttribute('data-agent-id'));

      // Also check for positioned divs (alternative rendering)
      const positionedDivs = document.querySelectorAll('div[style*="position"][style*="left"][style*="top"]');

      return {
        agentIds: ids,
        nodeCount: nodesWithId.length,
        positionedCount: positionedDivs.length
      };
    });

    console.log(`  Agent nodes found: ${agentNodes.nodeCount}`);
    console.log(`  Agent IDs: ${agentNodes.agentIds.join(', ') || 'none'}`);
    console.log(`  Positioned elements: ${agentNodes.positionedCount}`);

    // Take screenshot of current state
    await page.screenshot({
      path: 'test-screenshots/full-test-02-agents-active.png',
      fullPage: true
    });

    // 8. Navigate to monitor page
    console.log('\n8️⃣ Checking monitor page...');
    await page.goto('http://localhost:3002/monitor');
    await page.waitForTimeout(2000);

    // Check for activity feed entries
    const feedEntries = await page.locator('.activity-feed-entry').count();
    console.log(`  Activity feed entries: ${feedEntries}`);

    // Check for terminal output
    const terminalHasContent = await page.evaluate(() => {
      const terminal = document.querySelector('.terminal-content');
      return terminal && terminal.textContent.length > 0;
    });
    console.log(`  Terminal has content: ${terminalHasContent ? '✅' : '❌'}`);

    // Take screenshot of monitor page
    await page.screenshot({
      path: 'test-screenshots/full-test-03-monitor-page.png',
      fullPage: true
    });

    // 9. Check agents page
    console.log('\n9️⃣ Checking agents page...');
    await page.goto('http://localhost:3002/agents');
    await page.waitForTimeout(2000);

    // Look for agent cards or activity
    const agentCards = await page.locator('[class*="agent-card"], [class*="agent-status"]').count();
    console.log(`  Agent cards/status elements: ${agentCards}`);

    await page.screenshot({
      path: 'test-screenshots/full-test-04-agents-page.png',
      fullPage: true
    });

    // 10. Final summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(50));

    const hasWebSocketErrors = wsErrors.length > 0;
    const hasManagerStarted = managerStarted;
    const hasAgentSpawns = chatgptSpawned || claudeSpawned;
    const hasAgentThinking = chatgptThinking || claudeThinking;
    const hasAgentNodes = agentNodes.nodeCount > 0 || agentNodes.positionedCount > 1;
    const hasMonitorData = feedEntries > 0 || terminalHasContent;

    console.log(`WebSocket Connection: ${!hasWebSocketErrors ? '✅ No errors' : '❌ Errors found'}`);
    console.log(`Orchestrator Started: ${hasManagerStarted ? '✅ Yes' : '❌ No'}`);
    console.log(`Agent Spawns: ${hasAgentSpawns ? '✅ Detected' : '❌ Not detected'}`);
    console.log(`Agent Thinking: ${hasAgentThinking ? '✅ Visible' : '❌ Not visible'}`);
    console.log(`Agent Nodes: ${hasAgentNodes ? '✅ Present' : '❌ Missing'}`);
    console.log(`Monitor Data: ${hasMonitorData ? '✅ Available' : '❌ Missing'}`);

    // Overall status
    const allChecks = !hasWebSocketErrors && hasManagerStarted && hasAgentSpawns &&
                      hasAgentThinking && hasAgentNodes && hasMonitorData;

    console.log('\n' + '=' .repeat(50));
    if (allChecks) {
      console.log('🎉 ALL TESTS PASSED! System is working correctly.');
    } else {
      console.log('⚠️ SOME TESTS FAILED. Issues detected:');
      if (hasWebSocketErrors) console.log('  - Fix WebSocket connection errors');
      if (!hasManagerStarted) console.log('  - Orchestrator not starting properly');
      if (!hasAgentSpawns) console.log('  - Agent spawn events not being emitted');
      if (!hasAgentThinking) console.log('  - Agent thinking not visible');
      if (!hasAgentNodes) console.log('  - Agent nodes not appearing in visualization');
      if (!hasMonitorData) console.log('  - Monitor page not receiving data');
    }

    // Log all WebSocket events for debugging
    console.log('\n📋 All WebSocket Events Received:');
    websocketEvents.forEach(e => console.log('  -', e));

    // Log all agent events
    console.log('\n🤖 All Agent Events:');
    agentEvents.forEach(e => console.log('  -', e));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    await page.screenshot({
      path: 'test-screenshots/full-test-error.png',
      fullPage: true
    });
  } finally {
    console.log('\n🛑 Test complete. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();