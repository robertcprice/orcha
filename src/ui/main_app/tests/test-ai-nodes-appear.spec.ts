import { test, expect } from '@playwright/test';

test('AI agent nodes appear and are clickable', async ({ page }) => {
  console.log('\n🎯 TESTING AI AGENT NODES VISUALIZATION\n');

  // Navigate to the app
  await page.goto('http://localhost:3002');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Start fresh if needed
  const startFreshButton = page.locator('button:has-text("Start Fresh")');
  const hasResumeBanner = await startFreshButton.isVisible().catch(() => false);
  if (hasResumeBanner) {
    console.log('🔄 Starting fresh...');
    await startFreshButton.click();
    await page.waitForTimeout(1000);
  }

  // Submit a task
  console.log('📤 Submitting task: "Build a todo list app"...');
  const taskInput = page.locator('input[placeholder*="Describe"]').first();
  await taskInput.fill('Build a todo list app');
  await page.keyboard.press('Enter');

  // Wait for orchestrator to initialize and spawn AI agents
  console.log('⏳ Waiting for AI agent nodes to spawn (20 seconds)...');
  await page.waitForTimeout(20000);

  // Take initial screenshot
  await page.screenshot({
    path: 'test-screenshots/ai-nodes-initial.png',
    fullPage: true
  });
  console.log('📸 Screenshot saved: ai-nodes-initial.png');

  // Check for specific AI agent nodes
  const expectedAgents = ['Claude', 'ChatGPT', 'DeepSeek', 'Grok', 'Gemini'];
  console.log('\n🔍 Checking for AI agent nodes...\n');

  let foundNodes = 0;
  for (const agentName of expectedAgents) {
    const nodeCount = await page.locator(`text:has-text("${agentName}")`).count();
    if (nodeCount > 0) {
      console.log(`  ✅ ${agentName}: Found ${nodeCount} node(s)`);
      foundNodes++;
    } else {
      console.log(`  ❌ ${agentName}: NOT found`);
    }
  }

  console.log(`\n📊 Total AI nodes found: ${foundNodes}/${expectedAgents.length}`);

  // Check for any SVG nodes (canvas visualization)
  const svgNodes = await page.locator('svg circle, svg g[id*="node"]').count();
  console.log(`📊 Total SVG node elements: ${svgNodes}`);

  // Try to click on nodes if they exist
  if (foundNodes > 0) {
    console.log('\n🖱️  Testing node interactivity...');

    // Try clicking the first AI agent node we can find
    for (const agentName of expectedAgents) {
      const nodeLocator = page.locator(`text:has-text("${agentName}")`).first();
      const isVisible = await nodeLocator.isVisible().catch(() => false);

      if (isVisible) {
        console.log(`\n  Clicking on ${agentName} node...`);
        await nodeLocator.click();
        await page.waitForTimeout(2000);

        // Check if a detail panel or thought view appears
        const detailPanel = page.locator('[data-testid="node-detail"], .detail-panel, .node-details');
        const hasDetails = await detailPanel.count();

        if (hasDetails > 0) {
          console.log(`  ✅ Detail panel appeared after clicking ${agentName}`);
        } else {
          console.log(`  ⚠️  No detail panel found after clicking ${agentName}`);
        }

        // Take screenshot after clicking
        await page.screenshot({
          path: `test-screenshots/ai-node-clicked-${agentName.toLowerCase()}.png`,
          fullPage: true
        });
        console.log(`  📸 Screenshot saved: ai-node-clicked-${agentName.toLowerCase()}.png`);

        break; // Only test the first clickable node
      }
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`AI Nodes Found: ${foundNodes}/${expectedAgents.length}`);
  console.log(`SVG Elements: ${svgNodes}`);
  console.log('='.repeat(80) + '\n');

  // Assert that at least some AI nodes appeared
  expect(foundNodes).toBeGreaterThan(0);
});
