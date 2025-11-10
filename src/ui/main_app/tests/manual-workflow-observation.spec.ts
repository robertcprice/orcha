import { test } from '@playwright/test';

/**
 * Manual Workflow Observation Test
 *
 * This test opens the browser and waits for you to manually interact.
 * Use this to observe:
 * 1. Task submission
 * 2. Nodes populating (orchestrator, planning, agents)
 * 3. Code panel on the left showing files being created
 * 4. Clicking nodes to see their thinking/output
 * 5. Agent logs appearing
 */

test.describe('Manual Workflow Observation', () => {
  test.setTimeout(600000); // 10 minutes for manual observation

  test('observe full workflow manually', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('MANUAL WORKFLOW OBSERVATION TEST');
    console.log('='.repeat(80));
    console.log('\nThis test will:');
    console.log('1. Open the browser');
    console.log('2. Navigate to http://localhost:3002');
    console.log('3. Wait for you to manually submit a task');
    console.log('4. Keep the browser open for 10 minutes');
    console.log('\nWhat to verify:');
    console.log('✓ Task submission works');
    console.log('✓ Nodes appear (orchestrator → planning → agents)');
    console.log('✓ Code panel on LEFT shows files being created');
    console.log('✓ Clicking nodes shows their thinking/output');
    console.log('✓ Agent nodes have logs when clicked');
    console.log('='.repeat(80) + '\n');

    // Navigate to homepage
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    await page.screenshot({ path: 'test-screenshots/manual-01-initial.png' });
    console.log('📸 Initial screenshot saved');

    // Close any modals
    const closeButton = page.locator('button:has-text("✕"), button:has-text("Clear & Start New")').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      console.log('✅ Closed completion modal');
    }

    console.log('\n👉 READY FOR MANUAL INTERACTION');
    console.log('👉 Please submit a task now...\n');

    // Wait for task input to be filled (indicates user action)
    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"]').first();

    // Take screenshots every 10 seconds
    let screenshotCount = 1;
    const screenshotInterval = setInterval(async () => {
      try {
        await page.screenshot({
          path: `test-screenshots/manual-${String(screenshotCount).padStart(2, '0')}-observation.png`,
          fullPage: true
        });
        console.log(`📸 Screenshot ${screenshotCount} saved`);
        screenshotCount++;
      } catch (error) {
        // Ignore screenshot errors
      }
    }, 10000);

    // Monitor for various UI elements appearing
    const monitors = [
      { selector: '[data-node-type], [data-node-id]', name: 'Nodes' },
      { selector: '[class*="code"], [class*="CodePanel"]', name: 'Code Panel' },
      { selector: '[class*="terminal"], [class*="Terminal"]', name: 'Terminal' },
      { selector: '[class*="log"]', name: 'Logs' },
    ];

    const detected = new Set<string>();

    // Check for elements every 2 seconds
    const checkInterval = setInterval(async () => {
      for (const monitor of monitors) {
        if (!detected.has(monitor.name)) {
          const element = page.locator(monitor.selector).first();
          if (await element.isVisible().catch(() => false)) {
            console.log(`✅ ${monitor.name} DETECTED!`);
            detected.add(monitor.name);
            await page.screenshot({
              path: `test-screenshots/manual-detected-${monitor.name.toLowerCase().replace(' ', '-')}.png`
            });
          }
        }
      }
    }, 2000);

    // Wait for 10 minutes or until user closes browser
    await page.waitForTimeout(600000);

    // Cleanup
    clearInterval(screenshotInterval);
    clearInterval(checkInterval);

    console.log('\n' + '='.repeat(80));
    console.log('OBSERVATION COMPLETE');
    console.log('='.repeat(80));
    console.log('\nDetected Elements:');
    detected.forEach(item => console.log(`✅ ${item}`));
    console.log('\nScreenshots saved to test-screenshots/manual-*.png');
    console.log('='.repeat(80) + '\n');
  });
});
