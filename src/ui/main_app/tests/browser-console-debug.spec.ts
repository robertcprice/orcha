import { test, expect } from '@playwright/test';

/**
 * Browser Console Debug Test
 *
 * Purpose: Capture browser console logs to see what events frontend receives
 * and how it processes ai_enrichment_response events.
 */

test.describe('Browser Console Debug - Frontend Event Processing', () => {
  test('should show frontend event processing in browser console', async ({ page }) => {
    // Capture all console messages
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);

      // Log important messages immediately
      if (text.includes('ENRICHMENT RESPONSE') ||
          text.includes('EXTRACTED VALUES') ||
          text.includes('Emitting log event') ||
          text.includes('ai_enrichment_response')) {
        console.log(`\n🎯 IMPORTANT: ${text}\n`);
      }
    });

    // Navigate to home page
    console.log('\n📱 Navigating to home page...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Submit a simple task
    console.log('\n📝 Submitting task...');
    const taskInput = page.locator('textarea[placeholder*="task" i], textarea[placeholder*="goal" i], input[placeholder*="task" i]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });

    const testTask = 'Create a simple Python hello world script';
    await taskInput.fill(testTask);
    await page.keyboard.press('Enter');

    console.log('\n⏳ Waiting 30 seconds to capture event flow...');
    await page.waitForTimeout(30000);

    // Analyze console logs
    console.log('\n\n========================================');
    console.log('BROWSER CONSOLE LOG ANALYSIS');
    console.log('========================================\n');

    // Check for enrichment response events
    const enrichmentResponseLogs = consoleLogs.filter(log =>
      log.includes('ENRICHMENT RESPONSE') || log.includes('ai_enrichment_response')
    );

    console.log(`\n📊 Found ${enrichmentResponseLogs.length} enrichment response logs:`);
    enrichmentResponseLogs.forEach((log, i) => {
      console.log(`\n[${i + 1}] ${log}`);
    });

    // Check for extracted values
    const extractedValuesLogs = consoleLogs.filter(log =>
      log.includes('EXTRACTED VALUES')
    );

    console.log(`\n\n📊 Found ${extractedValuesLogs.length} extracted values logs:`);
    extractedValuesLogs.forEach((log, i) => {
      console.log(`\n[${i + 1}] ${log}`);
    });

    // Check for log emission attempts
    const logEmissionLogs = consoleLogs.filter(log =>
      log.includes('Emitting log event') || log.includes('Cannot emit log')
    );

    console.log(`\n\n📊 Found ${logEmissionLogs.length} log emission logs:`);
    logEmissionLogs.forEach((log, i) => {
      console.log(`\n[${i + 1}] ${log}`);
    });

    // Check for WebSocket events received
    const websocketLogs = consoleLogs.filter(log =>
      log.includes('WebSocket event received')
    );

    console.log(`\n\n📊 Found ${websocketLogs.length} WebSocket event logs:`);
    if (websocketLogs.length > 0) {
      console.log('\nFirst 10 WebSocket events:');
      websocketLogs.slice(0, 10).forEach((log, i) => {
        console.log(`\n[${i + 1}] ${log}`);
      });
    }

    // Save all logs to file
    const fs = require('fs');
    const logPath = '/tmp/browser-console-debug.log';
    fs.writeFileSync(logPath, consoleLogs.join('\n'));
    console.log(`\n\n💾 Full console log saved to: ${logPath}`);
    console.log(`Total console messages: ${consoleLogs.length}`);

    // Verify we captured meaningful data
    expect(consoleLogs.length).toBeGreaterThan(0);

    console.log('\n========================================');
    console.log('END OF BROWSER CONSOLE LOG ANALYSIS');
    console.log('========================================\n');
  });
});
