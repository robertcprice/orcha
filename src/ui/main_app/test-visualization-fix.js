const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('=== TESTING VISUALIZATION FIX ===\n');

  // Capture console logs to see WebSocket events
  const events = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('WebSocket event received')) {
      events.push(text);
      console.log('✅', text);
    }
  });

  await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
  console.log('Page loaded, waiting 2 seconds...\n');
  await page.waitForTimeout(2000);

  // Check initial state
  const initialNodes = await page.evaluate(() => {
    const nodes = document.querySelectorAll('div[style*="left:"][style*="top:"]');
    return Array.from(nodes).map(node => ({
      left: node.style.left,
      top: node.style.top,
      className: node.className
    }));
  });
  console.log('📍 Initial nodes:', initialNodes.length);
  console.log('   ', JSON.stringify(initialNodes, null, 2));

  // Submit a task
  console.log('\n🚀 Submitting task...');
  await page.fill('input[type="text"]', 'Create a simple hello world script');
  await page.press('input[type="text"]', 'Enter');

  // Wait for events to arrive
  console.log('\n⏳ Waiting 10 seconds for WebSocket events and node spawning...\n');
  await page.waitForTimeout(10000);

  // Check nodes after task submission
  const nodesAfter = await page.evaluate(() => {
    const nodes = document.querySelectorAll('div[style*="left:"][style*="top:"]');
    return Array.from(nodes).map(node => ({
      left: node.style.left,
      top: node.style.top,
      className: node.className,
      text: node.textContent?.substring(0, 30)
    }));
  });

  console.log('\n📍 Nodes after task submission:', nodesAfter.length);
  console.log('   ', JSON.stringify(nodesAfter, null, 2));

  // Check if we received WebSocket events
  console.log('\n📨 Total WebSocket events received:', events.length);
  if (events.length > 0) {
    console.log('   First few events:');
    events.slice(0, 5).forEach(e => console.log('   -', e));
  } else {
    console.log('   ❌ NO EVENTS RECEIVED - WebSocket might not be working');
  }

  // Final results
  console.log('\n=== RESULTS ===');
  console.log('Initial nodes:', initialNodes.length);
  console.log('Nodes after submission:', nodesAfter.length);
  console.log('New nodes created:', Math.max(0, nodesAfter.length - initialNodes.length));
  console.log('WebSocket events received:', events.length);

  const success = nodesAfter.length > initialNodes.length && events.length > 0;
  console.log('\nOverall Status:', success ? '✅ VISUALIZATION WORKING' : '❌ STILL BROKEN');

  await page.waitForTimeout(2000);
  await browser.close();
})();
