#!/usr/bin/env python3
"""
Capture screenshots of live agent monitoring in the web UI
"""
from playwright.sync_api import sync_playwright
import time

def capture_live_monitoring():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("📸 Navigating to web UI...")
        page.goto('http://localhost:3002')
        page.wait_for_load_state('networkidle')

        # Wait a bit for WebSocket connections and initial data
        print("⏳ Waiting for live data to load...")
        time.sleep(3)

        # Screenshot 1: Full homepage with SessionMonitor
        print("📸 Capturing homepage with SessionMonitor...")
        page.screenshot(path='/tmp/live-monitoring-01-homepage.png', full_page=True)

        # Try to find and screenshot the activity feed
        print("🔍 Looking for activity feed...")
        feed_selectors = [
            '[data-testid="activity-feed"]',
            '[data-testid="event-list"]',
            'text=Active Sessions',
            'text=Session Monitor'
        ]

        for selector in feed_selectors:
            try:
                element = page.locator(selector).first
                if element.is_visible(timeout=2000):
                    print(f"✅ Found element with selector: {selector}")
                    break
            except:
                continue

        # Screenshot 2: After waiting for more activity
        print("⏳ Waiting for more agent activity...")
        time.sleep(2)
        page.screenshot(path='/tmp/live-monitoring-02-activity.png', full_page=True)

        # Check for agent events
        print("🔍 Checking for agent spawn events...")
        try:
            events = page.locator('text=/spawn|started|initialized|codex|claude/i').all()
            print(f"✅ Found {len(events)} agent-related events")
        except:
            print("⚠️ No agent events found yet")

        # Screenshot 3: Scroll to see more activity
        print("📸 Capturing full page with all activity...")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        page.screenshot(path='/tmp/live-monitoring-03-scrolled.png', full_page=True)

        # Get page content to inspect structure
        print("📄 Analyzing page structure...")
        content = page.content()

        # Look for SessionMonitor or monitoring components
        if 'SessionMonitor' in content or 'Active Sessions' in content:
            print("✅ SessionMonitor component found on page!")
        else:
            print("⚠️ SessionMonitor component not visible")

        if 'codex' in content.lower() or 'claude' in content.lower():
            print("✅ Agent activity visible in page content!")
        else:
            print("⚠️ No agent activity visible yet")

        # Screenshot 4: Final state
        page.screenshot(path='/tmp/live-monitoring-04-final.png', full_page=True)

        browser.close()

        print("\n" + "="*70)
        print("✅ SCREENSHOTS CAPTURED")
        print("="*70)
        print("📁 /tmp/live-monitoring-01-homepage.png")
        print("📁 /tmp/live-monitoring-02-activity.png")
        print("📁 /tmp/live-monitoring-03-scrolled.png")
        print("📁 /tmp/live-monitoring-04-final.png")
        print("="*70)

if __name__ == "__main__":
    capture_live_monitoring()
