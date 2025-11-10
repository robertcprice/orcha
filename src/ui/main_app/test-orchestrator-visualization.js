const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * Orchestrator Visualization Comprehensive Test
 *
 * This test validates:
 * 1. OrchestratorCanvas rendering and agent node display
 * 2. Agent spawning and state transitions
 * 3. WebSocket real-time communication
 * 4. HybridOrchestratorPanel task submission and tracking
 * 5. Visual effects (particles, animations, branching)
 * 6. Multi-agent tree visualization
 * 7. Terminal output streaming
 * 8. Error handling and edge cases
 */

async function testOrchestratorVisualization() {
  console.log('\n🎨 ORCHESTRATOR VISUALIZATION COMPREHENSIVE TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
    devtools: true
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: './test-videos/',
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  // Initialize test results
  const testResults = {
    passed: [],
    failed: [],
    warnings: [],
    screenshots: [],
    metrics: {}
  };

  // Track WebSocket events
  const wsEvents = {
    connections: 0,
    messages: [],
    agentSpawns: [],
    stateChanges: []
  };

  // Monitor WebSocket activity
  page.on('websocket', ws => {
    wsEvents.connections++;
    console.log(`🔌 WebSocket #${wsEvents.connections} connected: ${ws.url()}`);

    ws.on('framereceived', event => {
      try {
        const message = JSON.parse(event.payload);
        wsEvents.messages.push(message);

        // Track specific event types
        if (message.type === 'event') {
          const eventData = message.data;
          const eventType = eventData?.hook_event_type;

          if (eventType === 'agent_spawn' || eventType === 'agent_started') {
            wsEvents.agentSpawns.push(eventData);
            console.log(`🤖 Agent Spawn: ${eventData.payload?.agent_type || 'unknown'}`);
          } else if (eventType?.includes('status')) {
            wsEvents.stateChanges.push(eventData);
          }
        }
      } catch (e) {
        // Ignore parse errors for non-JSON frames
      }
    });
  });

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('❌ Console Error:', msg.text());
    }
  });

  // Monitor network failures
  const networkFailures = [];
  page.on('requestfailed', request => {
    networkFailures.push({
      url: request.url(),
      failure: request.failure()
    });
  });

  try {
    // ═══════════════════════════════════════════════════════════════
    // TEST 1: Basic Canvas Rendering
    // ═══════════════════════════════════════════════════════════════
    console.log('TEST 1: Canvas Rendering and Initial State');
    console.log('───────────────────────────────────────────────────────────────\n');

    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for canvas presence
    const canvasExists = await page.locator('div[class*="OrchestratorCanvas"]').count() > 0 ||
                         await page.locator('[data-testid="orchestrator-canvas"]').count() > 0;

    if (canvasExists) {
      testResults.passed.push('Canvas component rendered');
      console.log('✅ Canvas component rendered');
    } else {
      testResults.failed.push('Canvas component not found');
      console.log('❌ Canvas component not found');
    }

    // Check for orchestrator root node
    const orchestratorNode = await page.locator('text="Hybrid Orchestrator"').count() > 0 ||
                            await page.locator('text="orchestrator"').count() > 0;

    if (orchestratorNode) {
      testResults.passed.push('Orchestrator root node present');
      console.log('✅ Orchestrator root node present');
    } else {
      testResults.failed.push('Orchestrator root node missing');
      console.log('❌ Orchestrator root node missing');
    }

    await page.screenshot({
      path: 'test-screenshots/orchestrator-01-initial.png',
      fullPage: true
    });
    testResults.screenshots.push('orchestrator-01-initial.png');

    // ═══════════════════════════════════════════════════════════════
    // TEST 2: Particle Background Effects
    // ═══════════════════════════════════════════════════════════════
    console.log('\nTEST 2: Particle Background and Visual Effects');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Check for particle canvas
    const particleCanvas = await page.locator('canvas').count() > 0;
    if (particleCanvas) {
      testResults.passed.push('Particle canvas detected');
      console.log('✅ Particle canvas detected');

      // Evaluate particle animation
      const particlesAnimating = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return false;

        // Take two snapshots to detect animation
        const ctx = canvas.getContext('2d');
        const snapshot1 = ctx.getImageData(0, 0, 100, 100).data;

        return new Promise(resolve => {
          setTimeout(() => {
            const snapshot2 = ctx.getImageData(0, 0, 100, 100).data;
            let different = false;
            for (let i = 0; i < snapshot1.length; i++) {
              if (snapshot1[i] !== snapshot2[i]) {
                different = true;
                break;
              }
            }
            resolve(different);
          }, 500);
        });
      });

      if (particlesAnimating) {
        testResults.passed.push('Particle animation working');
        console.log('✅ Particle animation working');
      } else {
        testResults.warnings.push('Particle animation may not be working');
        console.log('⚠️ Particle animation may not be working');
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 3: Task Submission via HybridOrchestratorPanel
    // ═══════════════════════════════════════════════════════════════
    console.log('\nTEST 3: Task Submission and Processing');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Find and interact with the orchestrator panel
    const goalTextarea = await page.locator('textarea[placeholder*="accomplish"]').first();

    if (await goalTextarea.count() > 0) {
      testResults.passed.push('HybridOrchestratorPanel found');
      console.log('✅ HybridOrchestratorPanel found');

      // Submit a test task
      const testTask = `Analyze system performance metrics and create a comprehensive report with:
- Current CPU and memory usage patterns
- Network latency measurements
- Database query optimization suggestions
- Automated monitoring setup recommendations`;

      await goalTextarea.fill(testTask);
      console.log('📝 Task description filled');

      // Click submit button
      const submitButton = await page.locator('button:has-text("Start Multi-AI Orchestration")').first();
      await submitButton.click();
      console.log('🚀 Task submitted');

      // Wait for task to start processing
      await page.waitForTimeout(3000);

      // Check for task in queue
      const taskInQueue = await page.locator('text="Task Queue"').count() > 0;
      if (taskInQueue) {
        testResults.passed.push('Task added to queue');
        console.log('✅ Task added to queue');
      }

      // Check for status indicators
      const statusIndicators = await page.locator('[class*="animate-spin"], [class*="animate-pulse"]').count();
      if (statusIndicators > 0) {
        testResults.passed.push('Status indicators animating');
        console.log(`✅ ${statusIndicators} status indicators animating`);
      }

      await page.screenshot({
        path: 'test-screenshots/orchestrator-02-task-submitted.png',
        fullPage: true
      });
      testResults.screenshots.push('orchestrator-02-task-submitted.png');

    } else {
      testResults.failed.push('HybridOrchestratorPanel not found');
      console.log('❌ HybridOrchestratorPanel not found');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 4: Agent Node Spawning and Tree Visualization
    // ═══════════════════════════════════════════════════════════════
    console.log('\nTEST 4: Agent Node Spawning and Tree Structure');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Wait for agent nodes to spawn
    await page.waitForTimeout(5000);

    // Count agent nodes
    const agentNodes = await page.locator('[class*="AgentNode"], [data-testid*="agent-node"]').count();
    console.log(`📊 Agent nodes detected: ${agentNodes}`);

    if (agentNodes > 1) {  // More than just orchestrator
      testResults.passed.push(`${agentNodes} agent nodes spawned`);
      testResults.metrics.agentNodesSpawned = agentNodes;

      // Check for branching connectors
      const svgConnectors = await page.locator('svg line, svg path').count();
      if (svgConnectors > 0) {
        testResults.passed.push(`${svgConnectors} branching connectors rendered`);
        console.log(`✅ ${svgConnectors} branching connectors rendered`);
      }

      // Test node click interaction
      const firstAgentNode = await page.locator('[class*="AgentNode"], [data-testid*="agent-node"]').first();
      if (await firstAgentNode.count() > 0) {
        await firstAgentNode.click();
        console.log('🖱️ Clicked on agent node');
        await page.waitForTimeout(1000);

        // Check if terminal or details opened
        const terminalVisible = await page.locator('[class*="terminal"], [class*="Terminal"]').count() > 0;
        if (terminalVisible) {
          testResults.passed.push('Terminal opened on node click');
          console.log('✅ Terminal opened on node click');
        }
      }

    } else {
      testResults.warnings.push('No additional agent nodes spawned');
      console.log('⚠️ No additional agent nodes spawned (might need active orchestrator)');
    }

    await page.screenshot({
      path: 'test-screenshots/orchestrator-03-agent-tree.png',
      fullPage: true
    });
    testResults.screenshots.push('orchestrator-03-agent-tree.png');

    // ═══════════════════════════════════════════════════════════════
    // TEST 5: WebSocket Real-time Updates
    // ═══════════════════════════════════════════════════════════════
    console.log('\nTEST 5: WebSocket Real-time Communication');
    console.log('───────────────────────────────────────────────────────────────\n');

    console.log(`📡 WebSocket connections: ${wsEvents.connections}`);
    console.log(`📨 Total messages received: ${wsEvents.messages.length}`);
    console.log(`🤖 Agent spawn events: ${wsEvents.agentSpawns.length}`);
    console.log(`🔄 State change events: ${wsEvents.stateChanges.length}`);

    if (wsEvents.connections > 0) {
      testResults.passed.push('WebSocket connected');
      testResults.metrics.wsConnections = wsEvents.connections;
      testResults.metrics.wsMessages = wsEvents.messages.length;
    } else {
      testResults.failed.push('No WebSocket connections established');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 6: Terminal Output and Logging
    // ═══════════════════════════════════════════════════════════════
    console.log('\nTEST 6: Terminal Output and Task Logs');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Check for terminal output
    const terminalOutput = await page.locator('[class*="terminal"], pre, code').first();
    if (await terminalOutput.count() > 0) {
      const terminalText = await terminalOutput.textContent();
      if (terminalText && terminalText.length > 0) {
        testResults.passed.push('Terminal output displayed');
        console.log('✅ Terminal output displayed');
        console.log(`📜 Output sample: ${terminalText.substring(0, 100)}...`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 7: Status Transitions and Animations
    // ═══════════════════════════════════════════════════════════════
    console.log('\nTEST 7: Status Transitions and Visual Feedback');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Check for various status states
    const statusStates = {
      planning: await page.locator('text=/planning|analyzing/i').count(),
      executing: await page.locator('text=/executing|running/i').count(),
      complete: await page.locator('text=/complete|finished/i').count(),
      error: await page.locator('text=/error|failed/i').count()
    };

    console.log('📊 Status states detected:');
    Object.entries(statusStates).forEach(([state, count]) => {
      if (count > 0) {
        console.log(`  ${state}: ${count}`);
        testResults.metrics[`status_${state}`] = count;
      }
    });

    // Check for loading spinners
    const spinners = await page.locator('[class*="animate-spin"]').count();
    if (spinners > 0) {
      testResults.passed.push(`${spinners} loading spinners active`);
      console.log(`✅ ${spinners} loading spinners active`);
    }

    await page.screenshot({
      path: 'test-screenshots/orchestrator-04-status-states.png',
      fullPage: true
    });
    testResults.screenshots.push('orchestrator-04-status-states.png');

    // ═══════════════════════════════════════════════════════════════
    // TEST 8: Responsive Layout and Mobile View
    // ═══════════════════════════════════════════════════════════════
    console.log('\nTEST 8: Responsive Layout Testing');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    const mobileLayoutOk = await page.locator('[class*="OrchestratorCanvas"], [class*="HybridOrchestrator"]').count() > 0;
    if (mobileLayoutOk) {
      testResults.passed.push('Mobile layout renders correctly');
      console.log('✅ Mobile layout renders correctly');
    } else {
      testResults.warnings.push('Mobile layout may have issues');
    }

    await page.screenshot({
      path: 'test-screenshots/orchestrator-05-mobile.png',
      fullPage: true
    });
    testResults.screenshots.push('orchestrator-05-mobile.png');

    // Restore desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // ═══════════════════════════════════════════════════════════════
    // TEST 9: Error Handling and Edge Cases
    // ═══════════════════════════════════════════════════════════════
    console.log('\nTEST 9: Error Handling and Stability');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Submit an empty task to test validation
    const goalTextarea2 = await page.locator('textarea[placeholder*="accomplish"]').first();
    await goalTextarea2.fill('');

    const submitButton2 = await page.locator('button:has-text("Start Multi-AI Orchestration")').first();
    await submitButton2.click();

    await page.waitForTimeout(1000);

    const errorMessage = await page.locator('text=/error|please enter|required/i').count() > 0;
    if (errorMessage) {
      testResults.passed.push('Empty task validation works');
      console.log('✅ Empty task validation works');
    } else {
      testResults.warnings.push('Empty task validation might not be working');
    }

    // Check console errors
    if (consoleErrors.length > 0) {
      testResults.warnings.push(`${consoleErrors.length} console errors detected`);
      console.log(`⚠️ ${consoleErrors.length} console errors detected`);
      consoleErrors.forEach(err => console.log(`  - ${err.substring(0, 100)}`));
    } else {
      testResults.passed.push('No console errors');
      console.log('✅ No console errors');
    }

    // Check network failures
    if (networkFailures.length > 0) {
      testResults.failed.push(`${networkFailures.length} network failures`);
      console.log(`❌ ${networkFailures.length} network failures`);
    } else {
      testResults.passed.push('No network failures');
      console.log('✅ No network failures');
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 10: Performance Metrics
    // ═══════════════════════════════════════════════════════════════
    console.log('\nTEST 10: Performance Metrics');
    console.log('───────────────────────────────────────────────────────────────\n');

    const performanceMetrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        domInteractive: perf.domInteractive - perf.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
      };
    });

    console.log('⚡ Performance Metrics:');
    console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`  Page Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`  DOM Interactive: ${performanceMetrics.domInteractive}ms`);
    console.log(`  First Paint: ${performanceMetrics.firstPaint}ms`);

    testResults.metrics.performance = performanceMetrics;

    if (performanceMetrics.domInteractive < 3000) {
      testResults.passed.push('Good performance (DOM Interactive < 3s)');
    } else {
      testResults.warnings.push('Performance could be improved');
    }

    // Final screenshot
    await page.screenshot({
      path: 'test-screenshots/orchestrator-06-final.png',
      fullPage: true
    });
    testResults.screenshots.push('orchestrator-06-final.png');

  } catch (error) {
    console.error('❌ Test execution error:', error);
    testResults.failed.push(`Test execution error: ${error.message}`);
  } finally {
    // ═══════════════════════════════════════════════════════════════
    // TEST SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('TEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`✅ PASSED: ${testResults.passed.length} tests`);
    testResults.passed.forEach(test => console.log(`  ✓ ${test}`));

    if (testResults.warnings.length > 0) {
      console.log(`\n⚠️ WARNINGS: ${testResults.warnings.length} issues`);
      testResults.warnings.forEach(warning => console.log(`  ⚠ ${warning}`));
    }

    if (testResults.failed.length > 0) {
      console.log(`\n❌ FAILED: ${testResults.failed.length} tests`);
      testResults.failed.forEach(test => console.log(`  ✗ ${test}`));
    }

    console.log('\n📊 METRICS:');
    Object.entries(testResults.metrics).forEach(([key, value]) => {
      if (typeof value === 'object') {
        console.log(`  ${key}:`);
        Object.entries(value).forEach(([subkey, subvalue]) => {
          console.log(`    ${subkey}: ${subvalue}`);
        });
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });

    console.log('\n📸 SCREENSHOTS:');
    testResults.screenshots.forEach(screenshot => {
      console.log(`  - test-screenshots/${screenshot}`);
    });

    // Generate HTML report
    const reportHtml = generateHtmlReport(testResults);
    await fs.writeFile('test-report-orchestrator.html', reportHtml);
    console.log('\n📄 HTML report generated: test-report-orchestrator.html');

    // Generate JSON report
    await fs.writeFile('test-results-orchestrator.json', JSON.stringify(testResults, null, 2));
    console.log('📄 JSON report generated: test-results-orchestrator.json');

    // Determine overall status
    const overallStatus = testResults.failed.length === 0 ? 'PASSED' : 'FAILED';
    const statusEmoji = overallStatus === 'PASSED' ? '✅' : '❌';

    console.log(`\n${statusEmoji} Overall Status: ${overallStatus}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    await context.close();
    await browser.close();

    // Exit with appropriate code
    process.exit(testResults.failed.length > 0 ? 1 : 0);
  }
}

function generateHtmlReport(results) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orchestrator Visualization Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .subtitle { opacity: 0.9; font-size: 1.1rem; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px 40px;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
    .stat {
      text-align: center;
      padding: 20px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      color: #6c757d;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .passed { color: #28a745; }
    .failed { color: #dc3545; }
    .warning { color: #ffc107; }
    .section {
      padding: 40px;
    }
    .section-title {
      font-size: 1.5rem;
      margin-bottom: 20px;
      color: #495057;
      border-bottom: 2px solid #dee2e6;
      padding-bottom: 10px;
    }
    .test-list {
      list-style: none;
    }
    .test-item {
      padding: 15px 20px;
      margin-bottom: 10px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      background: #f8f9fa;
      transition: transform 0.2s;
    }
    .test-item:hover {
      transform: translateX(5px);
    }
    .test-item.pass {
      border-left: 4px solid #28a745;
    }
    .test-item.fail {
      border-left: 4px solid #dc3545;
    }
    .test-item.warn {
      border-left: 4px solid #ffc107;
    }
    .test-icon {
      font-size: 1.5rem;
      margin-right: 15px;
    }
    .screenshots {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .screenshot-card {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .screenshot-title {
      padding: 15px;
      background: #f8f9fa;
      font-weight: 500;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }
    .metric-name {
      color: #6c757d;
      font-size: 0.9rem;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #495057;
    }
    .timestamp {
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Orchestrator Visualization Test Report</h1>
      <p class="subtitle">Comprehensive Testing of Agent Visualization System</p>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value passed">${results.passed.length}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat">
        <div class="stat-value warning">${results.warnings.length}</div>
        <div class="stat-label">Warnings</div>
      </div>
      <div class="stat">
        <div class="stat-value failed">${results.failed.length}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${results.screenshots.length}</div>
        <div class="stat-label">Screenshots</div>
      </div>
    </div>

    ${results.passed.length > 0 ? `
    <div class="section">
      <h2 class="section-title">✅ Passed Tests</h2>
      <ul class="test-list">
        ${results.passed.map(test => `
        <li class="test-item pass">
          <span class="test-icon">✓</span>
          <span>${test}</span>
        </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${results.warnings.length > 0 ? `
    <div class="section">
      <h2 class="section-title">⚠️ Warnings</h2>
      <ul class="test-list">
        ${results.warnings.map(warning => `
        <li class="test-item warn">
          <span class="test-icon">⚠</span>
          <span>${warning}</span>
        </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${results.failed.length > 0 ? `
    <div class="section">
      <h2 class="section-title">❌ Failed Tests</h2>
      <ul class="test-list">
        ${results.failed.map(test => `
        <li class="test-item fail">
          <span class="test-icon">✗</span>
          <span>${test}</span>
        </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">📊 Performance Metrics</h2>
      <div class="metrics-grid">
        ${Object.entries(results.metrics).map(([key, value]) => {
          if (typeof value === 'object') {
            return Object.entries(value).map(([subkey, subvalue]) => `
            <div class="metric-card">
              <div class="metric-name">${key} - ${subkey}</div>
              <div class="metric-value">${typeof subvalue === 'number' ? subvalue.toFixed(2) : subvalue}</div>
            </div>
            `).join('');
          }
          return `
          <div class="metric-card">
            <div class="metric-name">${key}</div>
            <div class="metric-value">${value}</div>
          </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">📸 Screenshots</h2>
      <div class="screenshots">
        ${results.screenshots.map(screenshot => `
        <div class="screenshot-card">
          <div class="screenshot-title">${screenshot}</div>
        </div>
        `).join('')}
      </div>
    </div>

    <div class="timestamp">
      Generated on ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`;
}

// Run the test
testOrchestratorVisualization().catch(console.error);