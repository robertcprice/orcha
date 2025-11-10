const { chromium } = require('playwright');

(async () => {
  console.log('\n🌳 TREE VISUALIZATION TEST: Inspect Current State\n');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);
    console.log('✅ App loaded\n');

    // Submit task
    console.log('📋 STEP 1: Submit task');
    const input = page.locator('input[type="text"]').first();
    await input.fill('Create a Python function that adds two numbers and returns the result');
    await input.press('Enter');
    console.log('   ✅ Task submitted\n');

    // Wait for agents to spawn
    console.log('📋 STEP 2: Wait for agents to spawn (45 seconds)');
    await page.waitForTimeout(45000);

    // Take initial screenshot
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/tree-current-state.png',
      fullPage: true
    });
    console.log('   📸 Screenshot saved: tree-current-state.png\n');

    // Inspect node elements
    console.log('📋 STEP 3: Inspect node rendering');

    const nodes = await page.locator('[class*="cursor-pointer"][class*="group"]').all();
    console.log(`   📊 Found ${nodes.length} agent nodes\n`);

    // Check each node for visible text
    for (let i = 0; i < Math.min(nodes.length, 5); i++) {
      const nodeText = await nodes[i].textContent();
      const boundingBox = await nodes[i].boundingBox();

      console.log(`   Node ${i}:`);
      console.log(`      Text: "${nodeText?.trim() || 'NO TEXT'}"`);
      console.log(`      Position: x=${boundingBox?.x.toFixed(0)}, y=${boundingBox?.y.toFixed(0)}`);
      console.log(`      Size: ${boundingBox?.width.toFixed(0)}x${boundingBox?.height.toFixed(0)}`);
    }

    // Check for SVG connection lines
    console.log('\n📋 STEP 4: Check for connection lines');
    const svgElements = await page.locator('svg').count();
    const pathElements = await page.locator('svg path').count();
    const lineElements = await page.locator('svg line').count();

    console.log(`   📊 SVG elements: ${svgElements}`);
    console.log(`   📊 Path elements (for curves): ${pathElements}`);
    console.log(`   📊 Line elements: ${lineElements}`);

    // Get node HTML structure
    console.log('\n📋 STEP 5: Inspect node HTML structure');
    const firstNodeHTML = await page.evaluate(() => {
      const node = document.querySelector('[class*="cursor-pointer"][class*="group"]');
      return node ? node.outerHTML.substring(0, 500) : 'NO NODE FOUND';
    });
    console.log(`   First node HTML:\n${firstNodeHTML}\n`);

    // Check canvas structure
    console.log('📋 STEP 6: Check canvas structure');
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('[class*="canvas"]');
      const container = document.querySelector('div.relative.w-full.h-full');
      return {
        hasCanvas: !!canvas,
        hasContainer: !!container,
        containerClasses: container?.className || 'NOT FOUND'
      };
    });
    console.log(`   Has canvas element: ${canvasInfo.hasCanvas}`);
    console.log(`   Has container: ${canvasInfo.hasContainer}`);
    console.log(`   Container classes: ${canvasInfo.containerClasses}\n`);

    // Final analysis
    console.log('='.repeat(80));
    console.log('🌳 CURRENT STATE ANALYSIS:');
    console.log('='.repeat(80));
    console.log(`   Nodes rendered: ${nodes.length}`);
    console.log(`   SVG connections: ${pathElements + lineElements}`);
    console.log(`   Nodes have text: ${nodes.length > 0 ? 'CHECKING...' : 'NO NODES'}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete\n');
  }
})();
