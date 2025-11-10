import { test, expect } from '@playwright/test';

test('Submit fresh task to see AI agent nodes', async ({ page }) => {
  console.log('\n🎯 TESTING AI AGENT NODE VISUALIZATION\n');

  await page.goto('http://localhost:3002');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Start fresh
  const startFreshButton = page.locator('button:has-text("Start Fresh")');
  const hasResumeBanner = await startFreshButton.isVisible().catch(() => false);
  if (hasResumeBanner) {
    console.log('🔄 Starting fresh...');
    await startFreshButton.click();
    await page.waitForTimeout(1000);
  }

  // Submit a unique task
  console.log('📤 Submitting task: "Build a todo list app"...');
  const taskInput = page.locator('input[placeholder*="Describe"]').first();
  await taskInput.fill('Build a todo list app');
  await page.keyboard.press('Enter');

  // Wait for agents to spawn
  console.log('⏳ Waiting for AI agent nodes to appear (15 seconds)...');
  await page.waitForTimeout(15000);

  // Check for all node types
  const allSelectors = [
    'circle',
    '[data-node-id]',
    'g[id*="node"]',
    'text:has-text("Claude")',
    'text:has-text("ChatGPT")',
    'text:has-text("DeepSeek")',
    'text:has-text("Grok")',
    'text:has-text("Gemini")',
    'text:has-text("Orchestrator")'
  ];

  console.log('\n📊 Node Detection Results:');
  let totalNodes = 0;
  for (const selector of allSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`  ✅ ${selector}: ${count} found`);
      totalNodes += count;
    }
  }

  console.log(`\n📈 Total visual elements found: ${totalNodes}`);

  // Take screenshot
  await page.screenshot({
    path: 'test-screenshots/ai-agent-nodes.png',
    fullPage: true
  });

  console.log('\n✅ Screenshot saved: test-screenshots/ai-agent-nodes.png\n');
});
