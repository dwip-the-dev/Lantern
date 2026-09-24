const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/home/dwip/.gemini/antigravity-ide/brain/09111447-dbb2-48a7-a470-c81066653fb3';

(async () => {
  console.log('🚀 Starting Jellyfin & Lantern Verification Script...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  // Pre-seed auth token for Lantern
  await context.addInitScript(() => {
    localStorage.setItem('lantern_token', 'RT8RmSy25g8Mtcz9zPjSRNnI7yQhb6YTDK9zZ-EMHB0');
    localStorage.setItem('lantern_portal_mode', 'user');
    localStorage.setItem('lantern_theme', 'dark');
    localStorage.setItem('lantern_ui_audio_enabled', 'false');
  });

  const page = await context.newPage();

  async function snap(name) {
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, name),
      animations: 'disabled'
    });
    console.log(`  ✓ Saved ${name}`);
  }

  // 1. Load User Portal
  console.log('1. Loading Lantern User Portal...');
  await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);

  // 2. Click Console button to switch to Admin Console
  console.log('2. Switching to Admin Console...');
  const consoleBtn = await page.$('button:has-text("Console"), div:has-text("Console")');
  if (consoleBtn) {
    await consoleBtn.click();
    await page.waitForTimeout(1500);
  }
  
  // Navigate to Containers tab in Admin Console
  const containersTab = await page.$('button:has-text("Containers"), [data-tab="containers"]');
  if (containersTab) {
    await containersTab.click();
    await page.waitForTimeout(1000);
  }
  await snap('screen_jellyfin_admin.png');

  // 3. Open Jellyfin Web UI directly
  console.log('3. Loading Jellyfin Web UI at http://localhost:8096...');
  await page.goto('http://localhost:8096/web/index.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2500);
  await snap('screen_jellyfin_login.png');

  // 4. Perform Jellyfin login in the browser UI
  console.log('4. Checking Jellyfin login form...');
  const inputs = await page.$$('input');
  console.log(`Found ${inputs.length} inputs on Jellyfin page`);
  
  // In Jellyfin, the username field often has id="txtManualName" or class="emby-input"
  const nameInput = await page.$('input#txtManualName, input[type="text"], input[name="Username"]');
  const pwInput = await page.$('input#txtManualPassword, input[type="password"], input[name="Password"]');
  const loginBtn = await page.$('button[type="submit"], button.raised.button-submit, button:has-text("Sign In")');

  if (nameInput && pwInput) {
    console.log('Filling credentials: Dwip / 1234dwip1234...');
    await nameInput.fill('Dwip');
    await pwInput.fill('1234dwip1234');
    await page.waitForTimeout(400);
    if (loginBtn) {
      await loginBtn.click();
    } else {
      await pwInput.press('Enter');
    }
    console.log('Submitted login, waiting for Jellyfin home dashboard...');
    await page.waitForTimeout(3500);
    await snap('screen_jellyfin_dashboard.png');
  } else {
    // If user card appears (e.g. click user avatar)
    const userCard = await page.$('.card[data-username="Dwip"], .card:has-text("Dwip")');
    if (userCard) {
      console.log('Found user card for Dwip, clicking...');
      await userCard.click();
      await page.waitForTimeout(1500);
      const passOnly = await page.$('input[type="password"]');
      if (passOnly) {
        await passOnly.fill('1234dwip1234');
        await page.waitForTimeout(300);
        await passOnly.press('Enter');
        await page.waitForTimeout(3500);
        await snap('screen_jellyfin_dashboard.png');
      }
    }
  }

  console.log('✅ Finished Jellyfin verification!');
  await browser.close();
})();
