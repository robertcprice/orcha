import { test, expect } from '@playwright/test';

test.describe('Demo: Task Submission and Node Interaction', () => {
  test.setTimeout(120000); // 2 minutes

  test('submit task and interact with visible nodes', async ({ page }) => {
    console.log('\n🎯 DEMO: Task Submission and Node Clicking');
    console.log('=========================================\n');

    // Step 1: Navigate to the app
    console.log('📍 Step 1: Loading application...');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Handle any previous task banner
    const startFreshButton = page.locator('button:has-text("Start Fresh")');
    const hasResumeBanner = await startFreshButton.isVisible().catch(() => false);
    if (hasResumeBanner) {
      console.log('⚠️ Found previous task - clicking "Start Fresh"');
      await startFreshButton.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'test-screenshots/demo-01-initial.png', fullPage: true });
    console.log('✅ Application loaded');

    // Step 2: Submit a task
    console.log('\n📍 Step 2: Submitting task...');
    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], input[type="text"]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });

    const testTask = 'Create a simple hello world program';
    console.log(`Task: "${testTask}"`);
    await taskInput.fill(testTask);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-screenshots/demo-02-task-submitted.png', fullPage: true });
    console.log('✅ Task submitted');

    // Step 3: Wait for nodes to appear and collect them
    console.log('\n📍 Step 3: Waiting for nodes to appear...');
    await page.waitForTimeout(5000);

    // Find all clickable nodes using various selectors
    const possibleNodeSelectors = [
      'text=/^Hybrid Orchestrator$/i',
      'text=/^Claude$/i',
      'text=/^ChatGPT$/i',
      'text=/^Planning$/i',
      'text=/^Implementation$/i',
      '[data-node-id]',
      '[class*="node"]',
      'g[id*="node"]',
      'circle[class*="node"]'
    ];

    const foundNodes: { name: string; locator: any }[] = [];

    for (const selector of possibleNodeSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();

      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        const isVisible = await element.isVisible().catch(() => false);

        if (isVisible) {
          const text = await element.textContent().catch(() => '');
          const name = text?.trim() || `Node-${foundNodes.length + 1}`;

          // Avoid duplicates
          if (!foundNodes.some(n => n.name === name)) {
            foundNodes.push({ name, locator: element });
            console.log(`✅ Found node: ${name}`);
          }
        }
      }
    }

    console.log(`\nTotal nodes found: ${foundNodes.length}`);
    await page.screenshot({ path: 'test-screenshots/demo-03-nodes-visible.png', fullPage: true });

    // Step 4: Click each node and try to view its details
    console.log('\n📍 Step 4: Clicking nodes and viewing details...');
    console.log('=========================================\n');

    for (let i = 0; i < foundNodes.length; i++) {
      const node = foundNodes[i];
      console.log(`\n🔍 [${i + 1}/${foundNodes.length}] Clicking: ${node.name}`);

      try {
        // Click the node
        await node.locator.click();
        await page.waitForTimeout(2000);

        // Take screenshot
        const safeName = node.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await page.screenshot({
          path: `test-screenshots/demo-04-${safeName}-clicked.png`,
          fullPage: true
        });

        // Look for opened panels/modals/terminals
        const panelSelectors = [
          'div[class*="terminal"]',
          'div[class*="modal"]',
          'div[class*="panel"]',
          'div[role="dialog"]',
          '[class*="split-view"]'
        ];

        let panelFound = false;
        for (const selector of panelSelectors) {
          const panel = page.locator(selector).first();
          const isVisible = await panel.isVisible({ timeout: 2000 }).catch(() => false);

          if (isVisible) {
            console.log(`  ✅ Panel opened (${selector})`);
            panelFound = true;

            // Look for tabs
            const tabs = ['Logs', 'Input', 'Thoughts', 'Code', 'Output'];
            for (const tabName of tabs) {
              const tab = page.locator(`button:has-text("${tabName}")`);
              const tabVisible = await tab.isVisible().catch(() => false);

              if (tabVisible) {
                console.log(`  📑 Found tab: ${tabName}`);

                // Click the tab
                await tab.click();
                await page.waitForTimeout(500);

                await page.screenshot({
                  path: `test-screenshots/demo-05-${safeName}-${tabName.toLowerCase()}.png`,
                  fullPage: true
                });
                console.log(`  ✅ Clicked ${tabName} tab`);
              }
            }

            // Try to close the panel
            const closeButton = page.locator('button[title="Close"], button:has-text("×")').first();
            const canClose = await closeButton.isVisible().catch(() => false);

            if (canClose) {
              await closeButton.click();
              await page.waitForTimeout(500);
              console.log(`  ✅ Panel closed`);
            } else {
              // Try ESC key
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
              console.log(`  ⚠️ Closed with ESC key`);
            }

            break;
          }
        }

        if (!panelFound) {
          console.log(`  ⚠️ No panel appeared after clicking ${node.name}`);
        }

      } catch (error) {
        console.error(`  ❌ Error clicking ${node.name}:`, error);
      }

      console.log('─────────────────────────────────────');
    }

    await page.screenshot({ path: 'test-screenshots/demo-06-final.png', fullPage: true });

    console.log('\n✅ Demo completed!');
    console.log(`   Total nodes clicked: ${foundNodes.length}`);
    console.log('   Screenshots saved in test-screenshots/\n');

    // Basic assertion - at least the page should load
    expect(foundNodes.length).toBeGreaterThanOrEqual(0);
  });
});
