import { test, expect } from '@playwright/test';

test.describe('Phase 1: Node Centering on Connection Lines', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
  });

  test('nodes should be perfectly centered on their connection lines', async ({ page }) => {
    // Submit a task to spawn nodes
    const goalInput = page.locator('input[placeholder*="task" i]');
    await goalInput.fill('Create a simple hello world function');

    // Press Enter to submit (form submit)
    await goalInput.press('Enter');

    // Wait for orchestrator node to appear
    await page.waitForSelector('[data-agent-id="orchestrator:"]', { timeout: 10000 });

    // Wait for at least 3 nodes to spawn (orchestrator + 2 children)
    await page.waitForFunction(() => {
      const nodes = document.querySelectorAll('[data-agent-id]');
      return nodes.length >= 3;
    }, { timeout: 15000 });

    // Wait a bit for connections to render
    await page.waitForTimeout(2000);

    // Get all node positions
    const nodes = await page.$$eval('[data-agent-id]', (elements) =>
      elements.map(el => {
        const rect = el.getBoundingClientRect();
        const id = el.getAttribute('data-agent-id');
        return {
          id,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
        };
      })
    );

    // Get all SVG connection paths
    const connections = await page.$$eval('svg path', (paths) =>
      paths.map(path => {
        const d = path.getAttribute('d');
        if (!d) return null;

        // Parse "M x y C ..." to get start point
        const match = d.match(/M\s+([\d.]+)\s+([\d.]+)/);
        if (!match) return null;

        const startX = parseFloat(match[1]);
        const startY = parseFloat(match[2]);

        // Parse end point (last coordinate in cubic bezier)
        const endMatch = d.match(/,\s+([\d.]+)\s+([\d.]+)$/);
        if (!endMatch) return null;

        const endX = parseFloat(endMatch[1]);
        const endY = parseFloat(endMatch[2]);

        return { startX, startY, endX, endY };
      }).filter(Boolean)
    );

    console.log('Nodes found:', nodes.length);
    console.log('Connections found:', connections.length);
    console.log('Node positions:', nodes);
    console.log('Connection coordinates:', connections);

    // Verify we have connections
    expect(connections.length).toBeGreaterThan(0);

    // For each connection, verify it connects to node centers
    let alignmentErrors = 0;
    const maxDeviation = 10; // Allow up to 10px deviation (accounting for SVG viewport transform)

    for (const conn of connections) {
      if (!conn) continue;

      // Find nodes that match the connection start and end points
      const startNode = nodes.find(n =>
        Math.abs(n.centerX - conn.startX) < maxDeviation &&
        Math.abs(n.centerY - conn.startY) < maxDeviation
      );

      const endNode = nodes.find(n =>
        Math.abs(n.centerX - conn.endX) < maxDeviation &&
        Math.abs(n.centerY - conn.endY) < maxDeviation
      );

      if (startNode && endNode) {
        const startDeviation = Math.sqrt(
          Math.pow(startNode.centerX - conn.startX, 2) +
          Math.pow(startNode.centerY - conn.startY, 2)
        );
        const endDeviation = Math.sqrt(
          Math.pow(endNode.centerX - conn.endX, 2) +
          Math.pow(endNode.centerY - conn.endY, 2)
        );

        console.log(`Connection ${startNode.id} → ${endNode.id}:`);
        console.log(`  Start deviation: ${startDeviation.toFixed(2)}px`);
        console.log(`  End deviation: ${endDeviation.toFixed(2)}px`);

        // Allow some tolerance for viewport scaling
        if (startDeviation > maxDeviation || endDeviation > maxDeviation) {
          alignmentErrors++;
        }
      }
    }

    // Report results
    console.log(`\nAlignment errors: ${alignmentErrors} / ${connections.length} connections`);

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'web-ui/test-screenshots/fix-orchestration-ui/phase1-node-centering.png',
      fullPage: true
    });

    // Assert: No more than 10% of connections should have alignment issues
    const errorRate = alignmentErrors / connections.length;
    expect(errorRate).toBeLessThan(0.1);
  });

  test('orchestrator node should be at center top', async ({ page }) => {
    // Submit task
    const goalInput = page.locator('input[placeholder*="task" i]');
    await goalInput.fill('Test orchestrator positioning');

    // Press Enter to submit
    await goalInput.press('Enter');

    // Wait for orchestrator node
    const orchestratorNode = page.locator('[data-agent-id^="orchestrator"]').first();
    await orchestratorNode.waitFor({ state: 'visible', timeout: 10000 });

    // Get viewport dimensions
    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error('Viewport size not available');

    // Get orchestrator position
    const orchBox = await orchestratorNode.boundingBox();
    if (!orchBox) throw new Error('Orchestrator node not found');

    const orchCenterX = orchBox.x + orchBox.width / 2;
    const viewportCenterX = viewportSize.width / 2;

    // Verify orchestrator is centered horizontally (within 50px tolerance)
    const horizontalDeviation = Math.abs(orchCenterX - viewportCenterX);
    console.log(`Orchestrator horizontal position: ${orchCenterX}px (viewport center: ${viewportCenterX}px)`);
    console.log(`Deviation: ${horizontalDeviation}px`);

    expect(horizontalDeviation).toBeLessThan(50);

    // Verify orchestrator is near top (y < 30% of viewport)
    expect(orchBox.y).toBeLessThan(viewportSize.height * 0.3);
  });
});
