const { chromium } = require('playwright');

(async () => {
  console.log('\n🏷️  TREE WITH LABELS TEST: Verify Text Appears\n');
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
    await input.fill('Create a Python function to calculate fibonacci numbers');
    await input.press('Enter');
    console.log('   ✅ Task submitted\n');

    // Wait for agents
    console.log('📋 STEP 2: Wait for agents to spawn (45 seconds)');
    await page.waitForTimeout(45000);

    // Check nodes with text
    console.log('📋 STEP 3: Check for text labels on nodes');
    const nodes = await page.locator('[class*="cursor-pointer"][class*="group"]').all();
    console.log(`   📊 Found ${nodes.length} agent nodes\n`);

    let nodesWithText = 0;
    const nodeLabelsSample = [];

    for (let i = 0; i < Math.min(nodes.length, 6); i++) {
      const nodeText = await nodes[i].textContent();
      const hasText = nodeText && nodeText.trim().length > 0 && !nodeText.includes('Executing') && !nodeText.includes('Planning');

      if (hasText) {
        nodesWithText++;
        nodeLabelsSample.push(nodeText.trim().split('\n')[0]); // Get first line
      }

      console.log(`   Node ${i}: ${hasText ? '✅' : '❌'} "${nodeText?.trim().substring(0, 50) || 'NO TEXT'}"`);
    }

    console.log(`\n   📊 Nodes with text labels: ${nodesWithText}/${nodes.length}`);
    console.log(`   📝 Sample labels: ${nodeLabelsSample.join(', ')}\n`);

    // Check tree structure
    console.log('📋 STEP 4: Check tree structure');
    const svgPaths = await page.locator('svg path').count();
    console.log(`   📊 Connection lines: ${svgPaths}`);

    // Get node positions to verify downward branching
    const nodePositions = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('[class*="cursor-pointer"][class*="group"]'));
      return nodes.map((node, idx) => {
        const box = node.getBoundingBox();
        return {
          index: idx,
          y: box ? Math.round(box.y) : 0
        };
      }).sort((a, b) => a.y - b.y);
    });

    console.log('   Node Y positions (top to bottom):');
    nodePositions.forEach(pos => {
      console.log(`      Node ${pos.index}: y=${pos.y}px`);
    });

    const yPositions = nodePositions.map(p => p.y);
    const hasDifferentYPositions = new Set(yPositions).size > 1;
    const branchesDownward = yPositions[yPositions.length - 1] > yPositions[0];

    console.log(`\n   ${hasDifferentYPositions ? '✅' : '❌'} Multiple Y levels: ${hasDifferentYPositions}`);
    console.log(`   ${branchesDownward ? '✅' : '❌'} Branches downward: ${branchesDownward}\n`);

    // Take screenshot
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/tree-with-labels.png',
      fullPage: true
    });
    console.log('   📸 Screenshot saved: tree-with-labels.png\n');

    // Final results
    console.log('='.repeat(80));
    console.log('🏷️  RESULTS:');
    console.log('='.repeat(80));
    console.log(`   ${nodesWithText > 0 ? '✅' : '❌'} Text labels visible: ${nodesWithText}/${nodes.length}`);
    console.log(`   ${svgPaths > 0 ? '✅' : '❌'} Connection lines: ${svgPaths}`);
    console.log(`   ${hasDifferentYPositions ? '✅' : '❌'} Hierarchical layout`);
    console.log(`   ${branchesDownward ? '✅' : '❌'} Downward branching`);
    console.log('='.repeat(80));

    if (nodesWithText > 0 && hasDifferentYPositions && branchesDownward) {
      console.log('\n🎊 SUCCESS! Tree has labels and branches downward!\n');
    } else {
      console.log('\n⚠️  Some issues detected, check details above\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('✅ Test complete\n');
  }
})();
