import { test, expect } from '@playwright/test';

/**
 * Quick Log Verification Test
 *
 * Fast test to verify AI planner logs are appearing in UI after the session filtering fix
 */

test.describe('Quick Log Verification - Post Session Filter Fix', () => {
  test('should verify planning nodes display logs', async ({ page }) => {
    // Navigate to home
    console.log('\n🏠 Navigating to home page...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Submit task
    console.log('\n📝 Submitting task...');
    const taskInput = page.locator('textarea[placeholder*="task" i], textarea[placeholder*="goal" i], input[placeholder*="task" i]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });

    const testTask = 'Write a Python script that prints hello world';
    await taskInput.fill(testTask);
    await page.keyboard.press('Enter');

    console.log('\n⏳ Waiting 25 seconds for AI planning to complete...');
    await page.waitForTimeout(25000);

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/quick-log-check.png', fullPage: true });

    // Find all planning nodes
    const planningNodes = await page.locator('[data-node-id^="planning-"]').all();
    console.log(`\n📊 Found ${planningNodes.length} planning nodes`);

    const results: Record<string, { visible: boolean, hasContent: boolean, contentPreview?: string }> = {};

    // Check each planning node
    for (const node of planningNodes) {
      const nodeId = await node.getAttribute('data-node-id');
      if (!nodeId) continue;

      console.log(`\n🔍 Checking node: ${nodeId}`);

      const isVisible = await node.isVisible();

      // Check if node has visible text content
      const textContent = await node.textContent() || '';
      const hasContent = textContent.trim().length > 50 &&
                        !textContent.includes('No logs received') &&
                        !textContent.includes('Waiting for agent output');

      results[nodeId] = {
        visible: isVisible,
        hasContent: hasContent,
        contentPreview: hasContent ? textContent.substring(0, 100) + '...' : undefined
      };

      const status = hasContent ? '✅ HAS LOGS' : '⚠️ NO LOGS';
      console.log(`${status} - ${nodeId}`);
      if (hasContent) {
        console.log(`   Preview: ${textContent.substring(0, 80)}...`);
      }
    }

    // Summary
    console.log('\n\n========================================');
    console.log('LOG VERIFICATION SUMMARY');
    console.log('========================================\n');

    const nodesWithLogs = Object.values(results).filter(r => r.hasContent).length;
    const totalNodes = Object.keys(results).length;

    console.log(`Nodes with logs: ${nodesWithLogs}/${totalNodes}`);
    console.log('\nDetailed Results:');
    Object.entries(results).forEach(([nodeId, result]) => {
      const status = result.hasContent ? '✅' : '❌';
      console.log(`${status} ${nodeId}: ${result.hasContent ? 'LOGS PRESENT' : 'NO LOGS'}`);
    });

    console.log('\n========================================\n');

    // Pass test if at least 2 nodes have logs (indicating the fix is working)
    expect(nodesWithLogs).toBeGreaterThanOrEqual(2);
  });
});
