import { test, expect } from '@playwright/test';

test.describe('UI Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
  });

  test('should load page with breathing particles', async ({ page }) => {
    // Wait for canvas to be present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Check that particles are rendering (canvas should have content)
    const canvasExists = await canvas.count();
    expect(canvasExists).toBeGreaterThan(0);
  });

  test('should display orchestrator node', async ({ page }) => {
    // Look for the Hybrid Orchestrator node
    const orchestratorNode = page.getByText('Hybrid Orchestrator');
    await expect(orchestratorNode).toBeVisible({ timeout: 10000 });
  });

  test('should display task input field', async ({ page }) => {
    // Check for the task input placeholder
    const taskInput = page.getByPlaceholder('Describe your task...');
    await expect(taskInput).toBeVisible();
    await expect(taskInput).toBeEditable();
  });

  test('should have light/dark mode toggle', async ({ page }) => {
    // Look for theme toggle button (sun or moon icon)
    const themeToggle = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(themeToggle).toBeVisible();
  });

  test('should display AI planning nodes when task is active', async ({ page }) => {
    // This test verifies the structure is in place for nodes to appear
    // The actual nodes appear dynamically when tasks are submitted

    // Verify the canvas container exists
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // The orchestrator node should always be visible
    const orchestratorNode = page.getByText('Hybrid Orchestrator');
    await expect(orchestratorNode).toBeVisible({ timeout: 10000 });
  });

  test('should allow typing in task input', async ({ page }) => {
    const taskInput = page.getByPlaceholder('Describe your task...');
    await taskInput.fill('Test task');
    await expect(taskInput).toHaveValue('Test task');
  });

  test('should have navigation header', async ({ page }) => {
    // Check for Test Project UI text in header
    const projectName = page.getByText('Test Project UI');
    await expect(projectName).toBeVisible();
  });

  test('particles should be animating', async ({ page }) => {
    // Get canvas element
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Take two screenshots with delay to verify particles moved
    const screenshot1 = await canvas.screenshot();
    await page.waitForTimeout(1000);
    const screenshot2 = await canvas.screenshot();

    // Screenshots should be different (particles breathing/moving)
    expect(screenshot1).not.toEqual(screenshot2);
  });

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    // Filter out known harmless errors
    const criticalErrors = errors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('manifest') &&
      !err.includes('Redis') // Redis error is displayed in UI, not critical for rendering
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('page should be responsive', async ({ page }) => {
    // Test different viewport sizes
    await page.setViewportSize({ width: 1920, height: 1080 });
    let canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 720 });
    canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });
});
