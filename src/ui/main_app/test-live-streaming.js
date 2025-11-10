const { chromium } = require('playwright');

/**
 * Live Streaming Integration Test
 *
 * This test:
 * 1. Submits a real task that triggers Codex + Claude agents
 * 2. Opens the monitor page
 * 3. Watches for streaming events in real-time
 * 4. Verifies both Codex and Claude thinking is visible
 * 5. Takes screenshots of the action
 */

async function testLiveStreaming() {
  console.log('\n🧪 LIVE STREAMING INTEGRATION TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Track WebSocket messages
  const wsMessages = [];
  page.on('websocket', ws => {
    console.log('🔌 WebSocket connection detected:', ws.url());

    ws.on('framereceived', event => {
      try {
        const message = JSON.parse(event.payload);
        wsMessages.push(message);

        if (message.type === 'event') {
          const eventType = message.data?.hook_event_type;
          const content = message.data?.payload?.content || '';

          if (eventType && (eventType.includes('thinking') || eventType.includes('started'))) {
            console.log(`📡 WS Event: [${eventType}] ${content.substring(0, 80)}...`);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
  });

  try {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Submit a Task
    // ═══════════════════════════════════════════════════════════════
    console.log('STEP 1: Submitting Task');
    console.log('───────────────────────────────────────────────────────────────\n');

    await page.goto('http://localhost:3002/tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const testTask = {
      title: 'Create Simple Calculator Function',
      description: `Create a Python calculator function with these features:

REQUIREMENTS:
- Function named 'calculate' that takes two numbers and an operation
- Support operations: add, subtract, multiply, divide
- Handle division by zero gracefully
- Include clear docstring
- Write comprehensive unit tests
- Use type hints

DELIVERABLES:
- calculator.py with the function
- test_calculator.py with tests
- Both files should be well-commented`,
      priority: 'high'
    };

    console.log(`📋 Task: "${testTask.title}"`);
    console.log(`📋 Priority: ${testTask.priority}\n`);

    // Fill the form
    await page.fill('input[type="text"]', testTask.title);
    await page.fill('textarea', testTask.description);
    await page.selectOption('select', testTask.priority);

    console.log('✓ Form filled');
    await page.screenshot({ path: 'test-screenshots/live-01-task-form.png' });

    // Submit
    console.log('🚀 Submitting task...\n');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Get task ID
    let taskId = null;
    const successText = await page.textContent('body');
    const taskIdMatch = successText.match(/Task ID:\s*([a-zA-Z0-9-]+)/);
    if (taskIdMatch) {
      taskId = taskIdMatch[1];
      console.log(`✅ Task submitted: ${taskId}\n`);
    } else {
      console.log('⚠️  Could not extract task ID, but continuing...\n');
    }

    await page.screenshot({ path: 'test-screenshots/live-02-task-submitted.png' });

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Open Monitor Page
    // ═══════════════════════════════════════════════════════════════
    console.log('\nSTEP 2: Opening Live Monitor');
    console.log('───────────────────────────────────────────────────────────────\n');

    await page.goto('http://localhost:3002/monitor', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('✓ Monitor page loaded');
    console.log('✓ WebSocket should be connecting...\n');

    await page.screenshot({ path: 'test-screenshots/live-03-monitor-initial.png', fullPage: true });

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Watch for Agent Activity
    // ═══════════════════════════════════════════════════════════════
    console.log('STEP 3: Monitoring Agent Activity');
    console.log('───────────────────────────────────────────────────────────────\n');

    console.log('⏳ Waiting for agent events (30 seconds)...');
    console.log('   Watch the browser window for real-time updates!\n');

    // Check for connection status
    const connectionStatus = await page.locator('text=/CONNECTED|connected/i').count();
    console.log(`🔌 Connection status indicators: ${connectionStatus}\n`);

    // Monitor for events over 30 seconds
    const startTime = Date.now();
    const monitorDuration = 30000; // 30 seconds
    let lastEventCount = 0;
    let claudeEvents = 0;
    let codexEvents = 0;

    while (Date.now() - startTime < monitorDuration) {
      await page.waitForTimeout(2000);

      // Count events in the feed
      const eventElements = await page.locator('[class*="hover:bg-gray"]').count();

      if (eventElements > lastEventCount) {
        console.log(`📊 Events detected: ${eventElements} (${eventElements - lastEventCount} new)`);
        lastEventCount = eventElements;

        // Take screenshot of current state
        await page.screenshot({
          path: `test-screenshots/live-04-monitoring-${Date.now()}.png`,
          fullPage: true
        });
      }

      // Check for specific event types
      const claudeThinking = await page.locator('text=/claude_thinking/i').count();
      const codexThinking = await page.locator('text=/codex_thinking/i').count();

      if (claudeThinking > claudeEvents) {
        console.log(`🔵 Claude thinking events: ${claudeThinking}`);
        claudeEvents = claudeThinking;
      }

      if (codexThinking > codexEvents) {
        console.log(`🟢 Codex thinking events: ${codexThinking}`);
        codexEvents = codexThinking;
      }

      // Check terminal output
      const terminalLines = await page.locator('.font-mono .text-green-400, .font-mono .text-cyan-400').count();
      if (terminalLines > 0) {
        console.log(`📺 Terminal lines visible: ${terminalLines}`);
      }
    }

    console.log('\n');
    await page.screenshot({ path: 'test-screenshots/live-05-monitoring-final.png', fullPage: true });

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Verify Streaming Events
    // ═══════════════════════════════════════════════════════════════
    console.log('\nSTEP 4: Verifying Streaming Events');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Check WebSocket messages received
    console.log(`📡 Total WebSocket messages: ${wsMessages.length}`);

    const eventsByType = {};
    wsMessages.forEach(msg => {
      if (msg.type === 'event') {
        const eventType = msg.data?.hook_event_type || 'unknown';
        eventsByType[eventType] = (eventsByType[eventType] || 0) + 1;
      }
    });

    console.log('\n📊 Event Types Received:');
    Object.entries(eventsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Verify both agent types
    const hasClaudeEvents = Object.keys(eventsByType).some(t => t.includes('claude'));
    const hasCodexEvents = Object.keys(eventsByType).some(t => t.includes('codex'));

    console.log('\n✅ Verification Results:');
    console.log(`   Claude events: ${hasClaudeEvents ? '✓ YES' : '✗ NO'}`);
    console.log(`   Codex events: ${hasCodexEvents ? '✓ YES' : '✗ NO'}`);
    console.log(`   Total events: ${lastEventCount}`);

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Check Feed and Terminal Content
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\nSTEP 5: Checking UI Components');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Switch to feed-only view
    await page.click('text=/Feed Only/i');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/live-06-feed-only.png', fullPage: true });

    const feedEvents = await page.locator('[class*="text-gray-300"]').count();
    console.log(`📋 Feed view events: ${feedEvents}`);

    // Switch to terminal-only view
    await page.click('text=/Terminal Only/i');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/live-07-terminal-only.png', fullPage: true });

    const terminalContent = await page.locator('.font-mono').count();
    console.log(`📺 Terminal view content blocks: ${terminalContent}`);

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Test Filtering
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\nSTEP 6: Testing Session Filtering');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Switch back to split view
    await page.click('text=/Split View/i');
    await page.waitForTimeout(1000);

    // Try filtering by task ID if we have it
    if (taskId) {
      await page.fill('input[placeholder*="session"]', taskId.substring(0, 8));
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-screenshots/live-08-filtered.png', fullPage: true });
      console.log(`🔍 Filtered by task ID: ${taskId.substring(0, 8)}`);
    }

    // Reset filter
    await page.click('text=/Show All/i');
    await page.waitForTimeout(1000);
    console.log('✓ Filter reset');

    // ═══════════════════════════════════════════════════════════════
    // STEP 7: Final Verification
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\nSTEP 7: Final Verification');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Check if we received streaming data
    const streamingWorking = lastEventCount > 0 || wsMessages.length > 0;

    console.log('📊 Final Results:');
    console.log(`   Events in UI: ${lastEventCount}`);
    console.log(`   WebSocket messages: ${wsMessages.length}`);
    console.log(`   Claude events detected: ${hasClaudeEvents}`);
    console.log(`   Codex events detected: ${hasCodexEvents}`);
    console.log(`   Streaming working: ${streamingWorking ? '✅ YES' : '❌ NO'}`);

    await page.screenshot({ path: 'test-screenshots/live-09-final.png', fullPage: true });

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📸 Screenshots saved:');
    console.log('   live-01-task-form.png');
    console.log('   live-02-task-submitted.png');
    console.log('   live-03-monitor-initial.png');
    console.log('   live-04-monitoring-*.png');
    console.log('   live-05-monitoring-final.png');
    console.log('   live-06-feed-only.png');
    console.log('   live-07-terminal-only.png');
    console.log('   live-08-filtered.png');
    console.log('   live-09-final.png');

    if (streamingWorking) {
      console.log('\n🎉 SUCCESS! Agent streaming is working!');
    } else {
      console.log('\n⚠️  WARNING: Limited or no streaming detected.');
      console.log('   This could mean:');
      console.log('   - Task hasn\'t started processing yet');
      console.log('   - Orchestrator not running');
      console.log('   - WebSocket connection issue');
    }

    console.log('\n💡 Recommendations:');
    if (!hasCodexEvents) {
      console.log('   • Check that Codex MCP agent has proper event publishing');
      console.log('   • Verify codex_mcp_agent.py publish_event() calls');
    }
    if (!hasClaudeEvents) {
      console.log('   • Check that Claude Code agent streaming is working');
      console.log('   • Verify claude_code_agent.py async streaming loop');
    }
    if (wsMessages.length === 0) {
      console.log('   • Check WebSocket server is running on port 4000');
      console.log('   • Verify publish_event() is sending to correct URL');
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: 'test-screenshots/live-error.png', fullPage: true });
  } finally {
    console.log('\n⏳ Keeping browser open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    await browser.close();
    console.log('✅ Browser closed\n');
  }
}

// Run the test
console.log('\n🎬 Starting Live Streaming Test...\n');
testLiveStreaming().catch(console.error);
