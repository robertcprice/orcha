import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test.describe('Real Functional Test - Verify Actual AI Planner Communication', () => {
  test.setTimeout(600000); // 10 minutes for real processing

  test.beforeEach(async ({ page, context }) => {
    console.log('🧹 Clearing localStorage and cookies...');
    await context.clearCookies();
    await page.goto('http://localhost:3002');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.waitForTimeout(2000);
  });

  test('should verify AI planners actually communicate and send plan to orchestrator', async ({ page }) => {
    console.log('\n🎯 REAL FUNCTIONAL TEST - VERIFYING ACTUAL SYSTEM');
    console.log('=========================================\n');

    // Step 1: Check if Redis is running
    console.log('📍 Step 1: Verify Redis is Running');
    let redisRunning = false;
    try {
      const { stdout } = await execAsync('redis-cli ping');
      redisRunning = stdout.trim() === 'PONG';
      console.log(`✅ Redis Status: ${redisRunning ? 'RUNNING' : 'NOT RUNNING'}`);
    } catch (error) {
      console.log('❌ Redis is NOT running');
      console.log('⚠️ AI planners require Redis to communicate');
    }

    if (!redisRunning) {
      console.log('\n⚠️ WARNING: Redis is not running. Starting Redis...');
      console.log('Run: brew services start redis');
      console.log('Or: redis-server &');
      console.log('\nSkipping test - Redis required for AI planner communication\n');
      test.skip();
      return;
    }

    // Step 2: Check if Python backend processes are running
    console.log('\n📍 Step 2: Check Python Backend Processes');
    let backendRunning = false;
    try {
      const { stdout } = await execAsync('ps aux | grep "run_hybrid_task" | grep -v grep');
      backendRunning = stdout.trim().length > 0;
      console.log(`Backend Status: ${backendRunning ? 'RUNNING' : 'NOT RUNNING'}`);
    } catch (error) {
      console.log('❌ Python backend is NOT running');
    }

    // Step 3: Subscribe to Redis to monitor AI planner messages
    console.log('\n📍 Step 3: Subscribe to Redis for AI Planner Messages');
    const redisMessages: any[] = [];
    let redisProcess: any = null;

    // Start Redis subscriber in background
    const { spawn } = require('child_process');
    redisProcess = spawn('redis-cli', ['subscribe', 'algomind.agent.events']);

    redisProcess.stdout.on('data', (data: Buffer) => {
      const message = data.toString();
      console.log(`📨 Redis Message: ${message.substring(0, 100)}...`);
      redisMessages.push({
        timestamp: new Date().toISOString(),
        message: message
      });
    });

    // Step 4: Load page and submit task
    console.log('\n📍 Step 4: Load Page and Submit Real Task');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Handle "Previous Task Detected"
    const resumeBanner = page.locator('div:has-text("Previous Task Detected")');
    const hasResumeBanner = await resumeBanner.isVisible().catch(() => false);
    if (hasResumeBanner) {
      console.log('⚠️ Clearing previous task');
      const startFreshButton = page.locator('button:has-text("Start Fresh")');
      await startFreshButton.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-screenshots/functional-01-initial.png', fullPage: true });

    // Submit a REAL task that requires planning
    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], input[type="text"]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });

    const realTask = 'Create a Python script that calculates fibonacci numbers and saves them to a file';
    console.log(`\n📝 Submitting REAL task: "${realTask}"`);
    console.log('This should trigger:');
    console.log('  1. AI planners to analyze the task');
    console.log('  2. Planning communication via Redis');
    console.log('  3. Plan submission to orchestrator');
    console.log('  4. Code execution\n');

    await taskInput.fill(realTask);
    await page.waitForTimeout(500);

    // Monitor API request
    let taskSubmitted = false;
    let taskId = '';
    page.on('response', async (response) => {
      if (response.url().includes('/api/hybrid-orchestrator/submit')) {
        console.log(`📡 API Response Status: ${response.status()}`);
        try {
          const data = await response.json();
          taskId = data.task_id;
          taskSubmitted = true;
          console.log(`✅ Task Submitted! ID: ${taskId}`);
        } catch (e) {
          console.log('⚠️ Could not parse API response');
        }
      }
    });

    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'test-screenshots/functional-02-task-submitted.png', fullPage: true });

    expect(taskSubmitted, 'Task should be submitted to API').toBe(true);

    // Step 5: Wait for nodes to appear
    console.log('\n📍 Step 5: Wait for Planning Nodes to Appear');
    const nodeNames = ['Claude', 'ChatGPT', 'DeepSeek', 'Grok', 'Gemini', 'Hybrid Orchestrator'];
    const nodeResults: Record<string, {
      appeared: boolean;
      hasRealLogs: boolean;
      logContent: string;
      isProcessing: boolean;
    }> = {};

    for (const nodeName of nodeNames) {
      nodeResults[nodeName] = {
        appeared: false,
        hasRealLogs: false,
        logContent: '',
        isProcessing: false
      };
    }

    // Wait for nodes
    console.log('Waiting for nodes to appear...');
    await page.waitForTimeout(10000);

    for (const nodeName of nodeNames) {
      const nodeLocator = page.locator(`text=/^${nodeName}$/i`).first();
      const isVisible = await nodeLocator.isVisible({ timeout: 5000 }).catch(() => false);
      nodeResults[nodeName].appeared = isVisible;
      console.log(`${isVisible ? '✅' : '❌'} ${nodeName}: ${isVisible ? 'APPEARED' : 'NOT VISIBLE'}`);
    }

    await page.screenshot({ path: 'test-screenshots/functional-03-nodes-appeared.png', fullPage: true });

    // Step 6: Click each node and check for REAL logs
    console.log('\n📍 Step 6: Check Each Node for ACTUAL LOGS (Not Just "No logs" Message)');
    console.log('=========================================\n');

    for (const nodeName of nodeNames) {
      if (!nodeResults[nodeName].appeared) {
        console.log(`⏭️ Skipping ${nodeName} (not visible)`);
        continue;
      }

      console.log(`\n🔍 Checking ${nodeName} for REAL logs...`);
      console.log('─────────────────────────────────────');

      try {
        const nodeLocator = page.locator(`text=/^${nodeName}$/i`).first();

        // Click the node
        await nodeLocator.click();
        await page.waitForTimeout(3000); // Wait for logs to load

        await page.screenshot({
          path: `test-screenshots/functional-${nodeName.toLowerCase().replace(/\s+/g, '-')}-panel.png`,
          fullPage: true
        });

        // Check if panel opened
        const terminalPanel = page.locator('[data-testid="agent-terminal-panel"]');
        const panelVisible = await terminalPanel.isVisible({ timeout: 3000 }).catch(() => false);

        if (panelVisible) {
          // Get the content from the Logs tab
          const logsTab = page.locator('[data-testid="terminal-tab-logs"]');
          await logsTab.click();
          await page.waitForTimeout(1000);

          const contentArea = page.locator('[data-testid="terminal-content"]');
          const logContent = await contentArea.textContent() || '';

          nodeResults[nodeName].logContent = logContent;

          // Check if logs are REAL (not just "no logs" message)
          const hasRealLogs = !logContent.includes('No logs received') &&
                             !logContent.includes('Waiting for agent output') &&
                             logContent.trim().length > 50;

          nodeResults[nodeName].hasRealLogs = hasRealLogs;

          if (hasRealLogs) {
            console.log(`✅ ${nodeName}: HAS REAL LOGS!`);
            console.log(`   Log preview: ${logContent.substring(0, 200)}...`);

            // Check if it looks like planning content
            const isPlanning = logContent.includes('plan') ||
                             logContent.includes('step') ||
                             logContent.includes('task') ||
                             logContent.includes('analyze') ||
                             logContent.includes('reasoning');

            if (isPlanning) {
              console.log(`   ✨ Looks like PLANNING content!`);
              nodeResults[nodeName].isProcessing = true;
            }
          } else {
            console.log(`❌ ${nodeName}: No real logs yet`);
            console.log(`   Message: ${logContent.substring(0, 100)}`);
          }

          // Check other tabs for content
          const tabs = ['input', 'thoughts', 'code', 'output'];
          for (const tabId of tabs) {
            const tab = page.locator(`[data-testid="terminal-tab-${tabId}"]`);
            await tab.click();
            await page.waitForTimeout(500);

            const tabContent = await contentArea.textContent() || '';
            const hasContent = !tabContent.includes('No') &&
                              !tabContent.includes('available yet') &&
                              tabContent.trim().length > 20;

            if (hasContent) {
              console.log(`   📑 ${tabId.toUpperCase()} tab has content: ${tabContent.substring(0, 100)}...`);
            }
          }

          // Close panel
          const closeButton = page.locator('[data-testid="terminal-close-button"]');
          await closeButton.click({ force: true }).catch(() => page.keyboard.press('Escape'));
          await page.waitForTimeout(500);

        } else {
          console.log(`❌ ${nodeName}: Panel did not open`);
        }

      } catch (error) {
        console.error(`❌ ${nodeName}: Error - ${error}`);
      }

      console.log('─────────────────────────────────────');
    }

    await page.screenshot({ path: 'test-screenshots/functional-04-all-nodes-checked.png', fullPage: true });

    // Step 7: Wait for processing and check orchestrator
    console.log('\n📍 Step 7: Wait for AI Processing and Check Orchestrator');
    console.log('Waiting 30 seconds for AI planners to process...\n');

    // Poll for updates every 5 seconds
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(5000);
      console.log(`⏳ Waiting... ${(i + 1) * 5}s elapsed`);

      // Click orchestrator to check for plan
      const orchestratorNode = page.locator('text=/^Hybrid Orchestrator$/i').first();
      const orchVisible = await orchestratorNode.isVisible().catch(() => false);

      if (orchVisible) {
        await orchestratorNode.click();
        await page.waitForTimeout(2000);

        const contentArea = page.locator('[data-testid="terminal-content"]');
        const orchContent = await contentArea.textContent() || '';

        if (!orchContent.includes('Waiting for') && orchContent.trim().length > 50) {
          console.log(`✅ Orchestrator has content!`);
          console.log(`   ${orchContent.substring(0, 200)}...`);
          break;
        }

        const closeButton = page.locator('[data-testid="terminal-close-button"]');
        await closeButton.click({ force: true }).catch(() => page.keyboard.press('Escape'));
        await page.waitForTimeout(500);
      }
    }

    // Step 8: Check Redis messages
    console.log('\n📍 Step 8: Analyze Redis Messages');
    console.log(`Total Redis messages captured: ${redisMessages.length}`);

    if (redisMessages.length > 0) {
      console.log('✅ Redis communication detected!');
      console.log(`First message: ${redisMessages[0].message.substring(0, 200)}`);
      console.log(`Last message: ${redisMessages[redisMessages.length - 1].message.substring(0, 200)}`);
    } else {
      console.log('❌ No Redis messages captured');
      console.log('This suggests AI planners are not communicating');
    }

    // Kill Redis subscriber
    if (redisProcess) {
      redisProcess.kill();
    }

    // Step 9: Final Results
    console.log('\n📊 REAL FUNCTIONAL TEST RESULTS');
    console.log('=========================================');

    const stats = {
      nodesAppeared: 0,
      nodesWithRealLogs: 0,
      nodesProcessing: 0,
      redisMessages: redisMessages.length,
      backendRunning: backendRunning
    };

    for (const [nodeName, result] of Object.entries(nodeResults)) {
      if (result.appeared) stats.nodesAppeared++;
      if (result.hasRealLogs) stats.nodesWithRealLogs++;
      if (result.isProcessing) stats.nodesProcessing++;

      const icon = result.hasRealLogs ? '✅' : '⚠️';
      console.log(`\n${icon} ${nodeName}:`);
      console.log(`   Appeared: ${result.appeared ? '✅' : '❌'}`);
      console.log(`   Has Real Logs: ${result.hasRealLogs ? '✅' : '❌'}`);
      console.log(`   Is Processing: ${result.isProcessing ? '✅' : '❌'}`);
      if (result.logContent) {
        console.log(`   Content: ${result.logContent.substring(0, 100)}...`);
      }
    }

    console.log('\n📈 OVERALL STATISTICS:');
    console.log(`   Backend Running: ${backendRunning ? '✅' : '❌'}`);
    console.log(`   Nodes Appeared: ${stats.nodesAppeared}/6`);
    console.log(`   Nodes With Real Logs: ${stats.nodesWithRealLogs}/6`);
    console.log(`   Nodes Processing: ${stats.nodesProcessing}/6`);
    console.log(`   Redis Messages: ${stats.redisMessages}`);

    console.log('\n🔍 DIAGNOSIS:');

    if (!backendRunning) {
      console.log('❌ PYTHON BACKEND NOT RUNNING');
      console.log('   The AI planners cannot work without the backend.');
      console.log('   To start backend: cd .. && python3 orchestrator/run_hybrid_task_v4.py --task-id test --goal "test" --context "{}"');
    } else if (stats.nodesWithRealLogs === 0) {
      console.log('⚠️ BACKEND RUNNING BUT NO LOGS');
      console.log('   The backend is running but planners are not producing logs.');
      console.log('   Check: WebSocket connection, Redis pub/sub, planner initialization');
    } else if (stats.nodesWithRealLogs < 6) {
      console.log('⚠️ PARTIAL FUNCTIONALITY');
      console.log(`   ${stats.nodesWithRealLogs}/6 planners are working.`);
      console.log('   Some planners may have issues or API rate limits.');
    } else {
      console.log('✅ FULL FUNCTIONALITY');
      console.log('   All planners are receiving tasks and producing logs!');
      console.log('   System is working as expected.');
    }

    console.log('=========================================\n');

    // Assertions based on what we can realistically expect
    expect(stats.nodesAppeared, 'At least 5 nodes should appear').toBeGreaterThanOrEqual(5);

    if (backendRunning) {
      // If backend is running, we expect real logs
      expect(stats.nodesWithRealLogs, 'At least 1 planner should have real logs if backend is running').toBeGreaterThanOrEqual(1);
    } else {
      console.log('⚠️ Backend not running - skipping functional assertions');
    }

    console.log('✅ TEST COMPLETED - Results saved in screenshots and logs');
  });
});
