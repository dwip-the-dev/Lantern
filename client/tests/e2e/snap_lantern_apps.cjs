const { chromium } = require('playwright');
const path = require('path');
const ARTIFACTS_DIR = '/home/dwip/.gemini/antigravity-ide/brain/09111447-dbb2-48a7-a470-c81066653fb3';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(() => {
    localStorage.setItem('lantern_token', 'RT8RmSy25g8Mtcz9zPjSRNnI7yQhb6YTDK9zZ-EMHB0');
    localStorage.setItem('lantern_portal_mode', 'user');
    localStorage.setItem('lantern_theme', 'dark');
  });

  const page = await context.newPage();
  await page.goto('http://localhost:8080', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(1500);

  const appsBtn = await page.$('button:has-text("Apps"), [data-tab="apps"]');
  if (appsBtn) {
    await appsBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'screen_lantern_music_and_video.png'),
    animations: 'disabled'
  });
  console.log('✓ Successfully saved screen_lantern_music_and_video.png');
  await browser.close();
})();
