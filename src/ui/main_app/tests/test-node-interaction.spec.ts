import { test, expect } from '@playwright/test';

test('Submit task, wait for agents, and click nodes to see thoughts', async ({ page }) => {
  console.log('\n🎯 TESTING NODE INTERACTION AND THOUGHTS\n');

  // Navigate to page
  await page.goto('http://localhost:3002');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Handle previous task banner
  const startFreshButton = page.locator('button:has-text("Start Fresh")');
  const hasResumeBanner = await startFreshButton.isVisible().catch(() => false);
  if (hasResumeBanner) {
    console.log('🔄 Starting fresh task...');
    await startFreshButton.click();
    await page.waitForTimeout(1000);
  }

  // Submit task
  console.log('📤 Submitting task: "Create a simple calculator"...');
  const taskInput = page.locator('input[placeholder*="Describe"]').first();
  await taskInput.fill('Create a simple calculator');
  await page.keyboard.press('Enter');

  // Wait for task to start processing
  console.log('⏳ Waiting for agents to spawn...');
  await page.waitForTimeout(8000);

  // Take screenshot of canvas
  await page.screenshot({
    path: 'test-screenshots/canvas-with-nodes.png',
    fullPage: true
  });

  // Check for nodes on canvas
  const nodeSelectors = [
    '[data-node-id]',
    'g[id*="node"]',
    'circle',
    '.node',
    '[class*="Node"]'
  ];

  let foundNodes = 0;
  let clickableNode = null;

  for (const selector of nodeSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      foundNodes += count;
      console.log(`✅ Found ${count} elements with selector: ${selector}`);

      // Try to get first clickable node
      if (!clickableNode) {
        const firstNode = page.locator(selector).first();
        const isVisible = await firstNode.isVisible().catch(() => false);
        if (isVisible) {
          clickableNode = firstNode;
        }
      }
    }
  }

  console.log(`\n📊 Total nodes found: ${foundNodes}`);

  // Try to click on a node
  if (clickableNode) {
    console.log('🖱️  Attempting to click first node...');
    await clickableNode.click({ timeout: 5000 }).catch(err => {
      console.log('⚠️  Click failed:', err.message);
    });

    await page.waitForTimeout(2000);

    // Look for detail panels/sidebars that might show thoughts
    const detailPanelSelectors = [
      '[data-panel="details"]',
      '[class*="Detail"]',
      '[class*="Sidebar"]',
      '[class*="Panel"]',
      'aside',
      'button:has-text("Thoughts")',
      'button:has-text("Logs")',
      'button:has-text("Code")',
      'button:has-text("Output")'
    ];

    console.log('\n🔍 Looking for detail panels/tabs...');
    for (const selector of detailPanelSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  ✅ Found ${count} elements with selector: ${selector}`);

        // Try to click tab buttons
        if (selector.includes('button')) {
          const button = page.locator(selector).first();
          const isVisible = await button.isVisible().catch(() => false);
          if (isVisible) {
            console.log(`  🖱️  Clicking: ${selector}`);
            await button.click().catch(err => console.log(`    ⚠️  Failed: ${err.message}`));
            await page.waitForTimeout(500);
          }
        }
      }
    }

    // Take screenshot after clicking
    await page.screenshot({
      path: 'test-screenshots/node-clicked-details.png',
      fullPage: true
    });
  } else {
    console.log('⚠️  No clickable nodes found');
  }

  // Check for offline mode error
  const errorBanner = page.locator('div:has-text("offline mode")').first();
  const hasOfflineError = await errorBanner.isVisible().catch(() => false);

  if (hasOfflineError) {
    console.log('\n❌ System is in offline mode - API keys not working');
  } else {
    console.log('\n✅ System is online - agents should be running!');
  }

  console.log('\n✅ Test complete - check screenshots in test-screenshots/');
  console.log('   - canvas-with-nodes.png: Shows initial canvas state');
  console.log('   - node-clicked-details.png: Shows node details after clicking\n');
});
