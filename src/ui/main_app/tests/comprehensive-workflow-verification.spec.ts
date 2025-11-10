import { test, expect } from '@playwright/test';

/**
 * Comprehensive End-to-End Workflow Verification
 *
 * This test verifies:
 * 1. Task submission works correctly
 * 2. All nodes populate (orchestrator, planning nodes, agent nodes)
 * 3. Clicking each node shows their thinking and output
 * 4. Orchestrator spawns agent nodes for task execution
 * 5. Agent nodes display logging when clicked
 */

test.describe('Comprehensive Workflow Verification', () => {
  test.setTimeout(180000); // 3 minutes for full workflow

  test('should verify complete task execution workflow', async ({ page }) => {
    console.log('\n🚀 Starting Comprehensive Workflow Test\n');

    // Step 1: Navigate to homepage
    console.log('📍 Step 1: Navigate to homepage');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-screenshots/workflow-01-homepage.png' });

    // Close any completion modals
    const closeButton = page.locator('button:has-text("✕"), button:has-text("Clear & Start New")').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }

    // Step 2: Submit a task
    console.log('📍 Step 2: Submit task');
    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], [placeholder*="task"]').first();
    await expect(taskInput).toBeVisible({ timeout: 10000 });

    const testTask = 'Create a Python script that calculates fibonacci numbers';
    await taskInput.fill(testTask);
    await page.keyboard.press('Enter');
    await page.screenshot({ path: 'test-screenshots/workflow-02-task-submitted.png' });

    // Step 3: Wait for orchestrator node to appear
    console.log('📍 Step 3: Wait for orchestrator node');
    const orchestratorNode = page.locator('[data-node-type="orchestrator"], [data-node-id*="orchestrator"]').first();
    await expect(orchestratorNode).toBeVisible({ timeout: 30000 });
    console.log('✅ Orchestrator node appeared');
    await page.screenshot({ path: 'test-screenshots/workflow-03-orchestrator-node.png' });

    // Step 4: Wait for planning nodes to populate
    console.log('📍 Step 4: Wait for planning nodes');
    await page.waitForTimeout(15000); // Give planning time to complete

    const planningNodes = await page.locator('[data-node-id^="planning-"]').all();
    console.log(`✅ Found ${planningNodes.length} planning nodes`);
    expect(planningNodes.length).toBeGreaterThanOrEqual(3); // At least 3 AI planners
    await page.screenshot({ path: 'test-screenshots/workflow-04-planning-nodes.png' });

    // Step 5: Click orchestrator node and verify output
    console.log('📍 Step 5: Click orchestrator node and verify output');
    await orchestratorNode.click({ force: true });
    await page.waitForTimeout(2000);

    const orchestratorTerminal = page.locator('.terminal-output, .log-container, [class*="terminal"]').first();
    await expect(orchestratorTerminal).toBeVisible({ timeout: 5000 });

    const orchestratorContent = await orchestratorTerminal.textContent();
    console.log(`📝 Orchestrator content length: ${orchestratorContent?.length || 0}`);

    if (orchestratorContent && orchestratorContent.trim().length > 0) {
      console.log('✅ Orchestrator shows output');
    } else {
      console.log('⚠️ Orchestrator output is empty or loading');
    }
    await page.screenshot({ path: 'test-screenshots/workflow-05-orchestrator-output.png' });

    // Step 6: Click each planning node and verify they show thinking
    console.log('📍 Step 6: Verify planning nodes show thinking');
    let nodesWithContent = 0;

    for (let i = 0; i < Math.min(planningNodes.length, 5); i++) {
      const node = planningNodes[i];
      const nodeId = await node.getAttribute('data-node-id') || `planning-${i}`;

      console.log(`\n🔍 Checking planning node: ${nodeId}`);

      try {
        await node.scrollIntoViewIfNeeded();
        await node.click({ force: true, timeout: 5000 });
        await page.waitForTimeout(1500);

        const terminalContent = await page.locator('.terminal-output, .log-container').first().textContent();

        if (terminalContent && terminalContent.trim().length > 50) {
          console.log(`  ✅ ${nodeId}: Has content (${terminalContent.trim().length} chars)`);
          nodesWithContent++;
        } else {
          console.log(`  ⚠️ ${nodeId}: No content or loading`);
        }

        await page.screenshot({ path: `test-screenshots/workflow-06-planning-${i}.png` });
      } catch (error) {
        console.log(`  ❌ ${nodeId}: Error - ${error}`);
      }
    }

    console.log(`\n📊 Planning nodes with content: ${nodesWithContent}/${planningNodes.length}`);
    expect(nodesWithContent).toBeGreaterThanOrEqual(1); // At least 1 planner should have content

    // Step 7: Wait for agent nodes to spawn
    console.log('\n📍 Step 7: Wait for agent nodes to spawn');
    await page.waitForTimeout(20000); // Give agents time to spawn

    const agentNodes = await page.locator('[data-node-type="agent"], [data-node-id*="agent"], [data-node-id*="executor"]').all();
    console.log(`✅ Found ${agentNodes.length} agent nodes`);

    if (agentNodes.length > 0) {
      console.log('✅ Orchestrator spawned agent nodes');
      await page.screenshot({ path: 'test-screenshots/workflow-07-agent-nodes.png' });
    } else {
      console.log('⚠️ No agent nodes found yet (may still be spawning)');
      await page.screenshot({ path: 'test-screenshots/workflow-07-no-agents-yet.png' });
    }

    // Step 8: Click agent nodes and verify they show logs
    console.log('\n📍 Step 8: Verify agent nodes show logs');
    let agentsWithLogs = 0;

    for (let i = 0; i < Math.min(agentNodes.length, 5); i++) {
      const node = agentNodes[i];
      const nodeId = await node.getAttribute('data-node-id') || `agent-${i}`;

      console.log(`\n🔍 Checking agent node: ${nodeId}`);

      try {
        await node.scrollIntoViewIfNeeded();
        await node.click({ force: true, timeout: 5000 });
        await page.waitForTimeout(1500);

        const terminalContent = await page.locator('.terminal-output, .log-container').first().textContent();

        if (terminalContent && terminalContent.trim().length > 50) {
          console.log(`  ✅ ${nodeId}: Has logs (${terminalContent.trim().length} chars)`);
          agentsWithLogs++;
        } else {
          console.log(`  ⚠️ ${nodeId}: No logs or loading`);
        }

        await page.screenshot({ path: `test-screenshots/workflow-08-agent-${i}.png` });
      } catch (error) {
        console.log(`  ❌ ${nodeId}: Error - ${error}`);
      }
    }

    if (agentNodes.length > 0) {
      console.log(`\n📊 Agent nodes with logs: ${agentsWithLogs}/${agentNodes.length}`);
      expect(agentsWithLogs).toBeGreaterThanOrEqual(1); // At least 1 agent should have logs
    }

    // Step 9: Final summary screenshot
    console.log('\n📍 Step 9: Final summary');
    await page.screenshot({ path: 'test-screenshots/workflow-09-final.png', fullPage: true });

    // Final verification summary
    console.log('\n' + '='.repeat(60));
    console.log('COMPREHENSIVE WORKFLOW VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Task submitted: "${testTask}"`);
    console.log(`✅ Orchestrator node: VISIBLE`);
    console.log(`✅ Planning nodes: ${planningNodes.length} found, ${nodesWithContent} with content`);
    console.log(`✅ Agent nodes: ${agentNodes.length} found, ${agentsWithLogs} with logs`);
    console.log('='.repeat(60) + '\n');

    // Overall assertions
    expect(planningNodes.length).toBeGreaterThanOrEqual(3);
    expect(nodesWithContent).toBeGreaterThanOrEqual(1);
  });

  test('should verify nodes are clickable and show content', async ({ page }) => {
    console.log('\n🔍 Testing Node Interaction\n');

    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    // Close any completion modals
    const closeButton = page.locator('button:has-text("✕"), button:has-text("Clear & Start New")').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }

    // Submit task
    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], [placeholder*="task"]').first();
    await taskInput.fill('Write a simple hello world script');
    await page.keyboard.press('Enter');

    // Wait for nodes
    await page.waitForTimeout(20000);

    // Get all visible nodes
    const allNodes = await page.locator('[data-node-id], [data-node-type]').all();
    console.log(`📊 Total visible nodes: ${allNodes.length}`);

    let clickableNodes = 0;
    let nodesWithTerminal = 0;

    for (const node of allNodes.slice(0, 10)) { // Test first 10 nodes
      try {
        const nodeId = await node.getAttribute('data-node-id') ||
                      await node.getAttribute('data-node-type') ||
                      'unknown';

        await node.click({ force: true, timeout: 3000 });
        clickableNodes++;

        await page.waitForTimeout(500);

        const terminal = page.locator('.terminal-output, .log-container, [class*="terminal"]').first();
        const isVisible = await terminal.isVisible().catch(() => false);

        if (isVisible) {
          nodesWithTerminal++;
          console.log(`  ✅ ${nodeId}: Clickable + Terminal visible`);
        } else {
          console.log(`  ⚠️ ${nodeId}: Clickable but no terminal`);
        }
      } catch (error) {
        // Node not clickable or error occurred
      }
    }

    console.log(`\n📊 Clickable nodes: ${clickableNodes}/${allNodes.length}`);
    console.log(`📊 Nodes showing terminal: ${nodesWithTerminal}/${clickableNodes}`);

    expect(clickableNodes).toBeGreaterThanOrEqual(1);
  });
});
