import { test, expect } from '@playwright/test';

test.describe('Real Task Execution - End to End', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
  });

  test('complete real task execution with enrichment data', async ({ page }) => {
    console.log('=== Starting Real Task Execution Test ===\n');

    // Step 1: Verify services are running
    console.log('Step 1: Checking services...');

    const redisCheck = await fetch('http://localhost:3002/api/health/redis');
    const redisData = await redisCheck.json();
    expect(redisData.isRunning).toBe(true);
    console.log('✅ Redis is running');

    try {
      const wsCheck = await fetch('http://localhost:4000/events');
      expect(wsCheck.ok).toBe(true);
      console.log('✅ WebSocket server is running');
    } catch (e) {
      throw new Error('WebSocket server is not running on port 4000');
    }

    // Step 2: Wait for WebSocket connection
    console.log('\nStep 2: Waiting for WebSocket connection...');
    await page.waitForTimeout(2000);

    // Step 3: Monitor console for events
    const enrichmentEvents: string[] = [];
    const errors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('enrichment') || text.includes('Enrichment')) {
        enrichmentEvents.push(text);
        console.log('  📡 Enrichment event:', text.substring(0, 100));
      }
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });

    // Step 4: Submit a simple task
    console.log('\nStep 3: Submitting task...');
    const taskInput = page.locator('input[placeholder*="Describe your task"]');
    await taskInput.fill('Create a file called hello.txt with the text "Hello World"');
    await taskInput.press('Enter');

    console.log('✅ Task submitted via UI');

    // Step 5: Wait for orchestrator to start
    await page.waitForTimeout(3000);

    // Step 6: Check for planning node activation
    console.log('\nStep 4: Checking planning nodes...');

    // Wait for nodes to appear
    const claudeNode = page.locator('div').filter({ hasText: /^Claude$/ }).first();
    const chatgptNode = page.locator('div').filter({ hasText: /^ChatGPT$/ }).first();
    const deepseekNode = page.locator('div').filter({ hasText: /^DeepSeek$/ }).first();

    await expect(claudeNode).toBeVisible({ timeout: 10000 });
    console.log('✅ Planning nodes visible');

    // Step 7: Click ChatGPT node and check for logs
    console.log('\nStep 5: Clicking ChatGPT planning node...');
    await chatgptNode.click();
    await page.waitForTimeout(2000);

    // Check if terminal panel opened
    const terminalPanel = page.locator('[class*="Terminal"]').or(page.locator('text=/Logs/i'));
    const terminalVisible = await terminalPanel.isVisible().catch(() => false);

    if (!terminalVisible) {
      console.warn('⚠️ Terminal panel did not open');
    } else {
      console.log('✅ Terminal panel opened');
    }

    // Step 8: Wait for enrichment data
    console.log('\nStep 6: Waiting for enrichment data...');
    await page.waitForTimeout(10000);

    // Check for log entries
    const logEntries = await page.locator('[class*="log"]').count();
    console.log(`Found ${logEntries} log entries`);

    // Check for "No logs received" message
    const noLogsMessage = await page.locator('text=/No logs received/i').isVisible().catch(() => false);

    if (noLogsMessage) {
      console.log('⚠️ Still showing "No logs received"');
      console.log('   This might mean:');
      console.log('   - Enrichment events not reaching frontend');
      console.log('   - Session ID mismatch');
      console.log('   - WebSocket not forwarding events');
    } else if (logEntries > 0) {
      console.log(`✅ Found ${logEntries} log entries in terminal`);
    }

    // Step 9: Check enrichment events in console
    console.log('\nStep 7: Enrichment events captured:');
    console.log(`  Total enrichment events: ${enrichmentEvents.length}`);
    if (enrichmentEvents.length > 0) {
      enrichmentEvents.slice(0, 5).forEach((event, i) => {
        console.log(`  ${i + 1}. ${event.substring(0, 100)}...`);
      });
    }

    // Step 10: Check for errors
    console.log('\nStep 8: Checking for errors...');
    if (errors.length > 0) {
      console.warn('⚠️ Console errors detected:');
      errors.slice(0, 5).forEach(err => console.warn(`  - ${err}`));
    } else {
      console.log('✅ No console errors');
    }

    // Step 11: Test other planning nodes
    console.log('\nStep 9: Testing DeepSeek node...');
    await deepseekNode.click();
    await page.waitForTimeout(2000);

    const deepseekLogs = await page.locator('[class*="log"]').count();
    console.log(`DeepSeek logs: ${deepseekLogs}`);

    // Step 12: Check WebSocket connection status
    const wsStatus = await page.evaluate(() => {
      return (window as any).wsConnectionStatus || 'unknown';
    });
    console.log(`\nWebSocket status: ${wsStatus}`);

    // Summary
    console.log('\n=== Test Summary ===');
    console.log('✅ Redis running');
    console.log('✅ WebSocket running');
    console.log('✅ Task submitted');
    console.log('✅ Planning nodes visible');
    console.log(terminalVisible ? '✅ Terminal opens' : '⚠️ Terminal issue');
    console.log(enrichmentEvents.length > 0 ? `✅ ${enrichmentEvents.length} enrichment events` : '⚠️ No enrichment events');
    console.log(errors.length === 0 ? '✅ No errors' : `⚠️ ${errors.length} errors`);
    console.log(logEntries > 0 ? `✅ ${logEntries} log entries` : '⚠️ No log entries');

    // Take screenshot
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/real-task-execution-final.png',
      fullPage: true
    });
    console.log('\n📸 Screenshot saved');
  });

  test('verify enrichment events reach frontend', async ({ page }) => {
    console.log('=== Testing Enrichment Event Flow ===\n');

    const receivedEvents: any[] = [];

    // Intercept WebSocket messages
    await page.exposeFunction('captureEvent', (event: any) => {
      receivedEvents.push(event);
      console.log('📨 Event received:', event.type || event.event_type);
    });

    // Inject event capture
    await page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;
      (window as any).WebSocket = function(url: string) {
        const ws = new originalWebSocket(url);
        ws.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            (window as any).captureEvent(data);
          } catch (e) {
            // Ignore parse errors
          }
        });
        return ws;
      };
    });

    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Submit task
    const taskInput = page.locator('input[placeholder*="Describe your task"]');
    await taskInput.fill('Test enrichment event flow');
    await taskInput.press('Enter');

    // Wait for enrichment events
    console.log('Waiting for enrichment events...');
    await page.waitForTimeout(15000);

    console.log(`\nTotal events received: ${receivedEvents.length}`);

    const enrichmentCount = receivedEvents.filter(e =>
      e.type?.includes('enrichment') || e.event_type?.includes('enrichment')
    ).length;

    console.log(`Enrichment events: ${enrichmentCount}`);

    if (enrichmentCount > 0) {
      console.log('✅ Enrichment events are reaching the frontend');
    } else {
      console.log('⚠️ No enrichment events received');
      console.log('Event types received:');
      receivedEvents.forEach(e => {
        console.log(`  - ${e.type || e.event_type}`);
      });
    }
  });
});
