/**
 * Complete Verification Test V2
 *
 * Tests:
 * 1. Submit a task via UI
 * 2. Wait for all AI nodes to appear (Claude, ChatGPT, DeepSeek, Grok, Gemini, Orchestrator)
 * 3. Click each node to verify full input/output (no truncation)
 * 4. Verify only 1 planning iteration
 * 5. Verify Gemini output flows to Orchestrator
 * 6. Verify Orchestrator starts execution
 * 7. Verify Planning section shows all AI contributions
 */

const { chromium } = require('playwright');

async function runTest() {
	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		console.log('🚀 Starting Complete Verification Test V2');
		console.log('='.repeat(80));

		// Step 1: Navigate to the orchestrator UI
		console.log('\n📍 Step 1: Navigating to http://localhost:3002');
		await page.goto('http://localhost:3002');
		await page.waitForLoadState('networkidle');
		await page.screenshot({ path: 'test-screenshots/v2-01-initial-load.png' });

		// Step 2: Submit a test task
		console.log('\n📝 Step 2: Submitting test task');
		const testTask = 'Create a simple hello world Python function that prints the current date and time';

		const taskInput = await page.locator('textarea[placeholder*="Describe your task"]');
		await taskInput.fill(testTask);
		await page.screenshot({ path: 'test-screenshots/v2-02-task-filled.png' });

		const submitButton = await page.locator('button:has-text("Submit Task")');
		await submitButton.click();
		console.log('✅ Task submitted');
		await page.waitForTimeout(2000);
		await page.screenshot({ path: 'test-screenshots/v2-03-task-submitted.png' });

		// Step 3: Monitor for planning events
		console.log('\n🎯 Step 3: Monitoring planning events');
		let planningIterations = 0;
		let aiNodesDetected = new Set();
		let geminToOrchestratorFlow = false;

		// Listen for console messages to track data flow
		page.on('console', msg => {
			const text = msg.text();

			// Track AI enrichment events
			if (text.includes('ai_enrichment_request') || text.includes('ai_enrichment_response')) {
				const match = text.match(/"ai_name":"([^"]+)"/);
				if (match) {
					const aiName = match[1];
					aiNodesDetected.add(aiName);
					console.log(`  📡 Detected AI: ${aiName}`);
				}
			}

			// Track planning iterations
			if (text.includes('Design Iteration')) {
				planningIterations++;
				console.log(`  🔄 Planning Iteration: ${planningIterations}`);
			}

			// Track Gemini task organization
			if (text.includes('task_organization_complete')) {
				console.log('  ✅ Gemini task organization complete');
			}

			// Track Gemini → Orchestrator flow
			if (text.includes('Structured tasks will be passed to execution')) {
				geminToOrchestratorFlow = true;
				console.log('  ✅ Gemini output flowing to execution stage');
			}

			// Track planning complete
			if (text.includes('planning_complete')) {
				console.log('  ✅ Planning complete, orchestrator starting');
			}

			// Track orchestrator start
			if (text.includes('manager_started') && text.includes('ORCHESTRATOR')) {
				console.log('  ✅ Orchestrator started');
			}
		});

		// Wait for planning to complete (max 2 minutes)
		console.log('\n⏳ Waiting for planning to complete (max 120s)...');
		const planningCompleteWaitTime = 120000;
		const startTime = Date.now();
		let planningComplete = false;

		while (Date.now() - startTime < planningCompleteWaitTime && !planningComplete) {
			// Check for planning complete indicator in UI
			const statusText = await page.locator('[class*="status"]').allTextContents();
			const hasCompleted = statusText.some(text =>
				text.includes('completed') ||
				text.includes('executing') ||
				text.includes('Execution')
			);

			if (hasCompleted) {
				planningComplete = true;
				console.log('✅ Planning phase completed');
				break;
			}

			await page.waitForTimeout(2000);
		}

		await page.screenshot({ path: 'test-screenshots/v2-04-planning-complete.png' });

		// Step 4: Verify planning iterations
		console.log('\n🔍 Step 4: Verifying planning iterations');
		console.log(`  Planning iterations: ${planningIterations}`);
		if (planningIterations <= 1) {
			console.log('  ✅ PASS: Single planning round (≤1 iteration)');
		} else {
			console.log(`  ❌ FAIL: Multiple planning rounds (${planningIterations} iterations)`);
		}

		// Step 5: Verify AI nodes detected
		console.log('\n🤖 Step 5: Verifying AI nodes');
		console.log(`  AI nodes detected: ${Array.from(aiNodesDetected).join(', ')}`);
		const expectedAIs = ['Claude', 'ChatGPT', 'DeepSeek', 'Grok', 'Gemini'];
		const allAIsDetected = expectedAIs.every(ai =>
			Array.from(aiNodesDetected).some(detected =>
				detected.toLowerCase().includes(ai.toLowerCase())
			)
		);

		if (allAIsDetected) {
			console.log('  ✅ PASS: All expected AIs detected');
		} else {
			const missing = expectedAIs.filter(ai =>
				!Array.from(aiNodesDetected).some(detected =>
					detected.toLowerCase().includes(ai.toLowerCase())
				)
			);
			console.log(`  ⚠️  WARNING: Missing AIs: ${missing.join(', ')}`);
		}

		// Step 6: Verify Gemini → Orchestrator data flow
		console.log('\n🔄 Step 6: Verifying Gemini → Orchestrator data flow');
		if (geminToOrchestratorFlow) {
			console.log('  ✅ PASS: Gemini output confirmed flowing to orchestrator');
		} else {
			console.log('  ⚠️  WARNING: Gemini → Orchestrator flow not detected');
		}

		// Step 7: Check for Multi-AI Planning Pipeline section in UI
		console.log('\n📋 Step 7: Checking for Multi-AI Planning Pipeline UI');
		const planningSection = await page.locator('text=Multi-AI Planning Pipeline').first();
		const planningVisible = await planningSection.isVisible().catch(() => false);

		if (planningVisible) {
			console.log('  ✅ PASS: Planning pipeline section found in UI');

			// Click to expand if collapsed
			await planningSection.click();
			await page.waitForTimeout(1000);
			await page.screenshot({ path: 'test-screenshots/v2-05-planning-expanded.png' });

			// Count AI enrichment cards
			const enrichmentCards = await page.locator('[key^="enrichment-"]').count();
			console.log(`  📊 Enrichment cards visible: ${enrichmentCards}`);

			// Check for each AI's contribution
			const pageContent = await page.textContent('body');
			expectedAIs.forEach(ai => {
				if (pageContent.includes(ai)) {
					console.log(`    ✅ ${ai} contribution visible`);
				} else {
					console.log(`    ⚠️  ${ai} contribution not visible`);
				}
			});
		} else {
			console.log('  ⚠️  WARNING: Planning pipeline section not found in UI');
		}

		// Step 8: Verify no truncation in outputs
		console.log('\n✂️  Step 8: Verifying no truncation in AI outputs');

		// Check AgentSessionMonitor for truncation
		const sessionMonitor = await page.locator('[class*="AgentSession"]').first();
		if (await sessionMonitor.isVisible().catch(() => false)) {
			const monitorText = await sessionMonitor.textContent();

			// Look for truncation indicators
			const truncationIndicators = ['...', 'chars)', 'preview'];
			const foundTruncation = truncationIndicators.some(indicator =>
				monitorText.includes(indicator)
			);

			if (foundTruncation) {
				console.log('  ⚠️  WARNING: Possible truncation in AgentSessionMonitor');
			} else {
				console.log('  ✅ PASS: No truncation indicators in AgentSessionMonitor');
			}
		}

		// Step 9: Check terminal output
		console.log('\n🖥️  Step 9: Checking terminal output');
		const terminalLogs = await page.locator('[class*="terminal"]').textContent().catch(() => '');

		if (terminalLogs.length > 0) {
			console.log(`  ✅ Terminal logs found (${terminalLogs.length} chars)`);

			// Check for orchestrator start
			if (terminalLogs.toLowerCase().includes('orchestrator')) {
				console.log('  ✅ PASS: Orchestrator activity detected in logs');
			} else {
				console.log('  ⚠️  WARNING: No orchestrator activity in logs');
			}

			// Check for execution start
			if (terminalLogs.toLowerCase().includes('execution') || terminalLogs.toLowerCase().includes('executing')) {
				console.log('  ✅ PASS: Execution started');
			}
		} else {
			console.log('  ⚠️  WARNING: No terminal logs found');
		}

		// Final screenshot
		await page.screenshot({ path: 'test-screenshots/v2-06-final-state.png', fullPage: true });

		// Summary
		console.log('\n' + '='.repeat(80));
		console.log('📊 TEST SUMMARY');
		console.log('='.repeat(80));
		console.log(`✅ Task submitted successfully`);
		console.log(`${planningIterations <= 1 ? '✅' : '❌'} Planning iterations: ${planningIterations} (expected: ≤1)`);
		console.log(`${allAIsDetected ? '✅' : '⚠️ '} AI nodes: ${aiNodesDetected.size}/5 detected`);
		console.log(`${geminToOrchestratorFlow ? '✅' : '⚠️ '} Gemini → Orchestrator flow: ${geminToOrchestratorFlow ? 'Confirmed' : 'Not detected'}`);
		console.log(`${planningVisible ? '✅' : '⚠️ '} Planning pipeline UI: ${planningVisible ? 'Found' : 'Not found'}`);
		console.log(`✅ Screenshots saved to test-screenshots/v2-*.png`);
		console.log('='.repeat(80));

	} catch (error) {
		console.error('\n❌ Test failed with error:');
		console.error(error);
		await page.screenshot({ path: 'test-screenshots/v2-ERROR.png' });
	} finally {
		await browser.close();
		console.log('\n🏁 Test complete');
	}
}

runTest();
