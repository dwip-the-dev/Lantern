const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/home/dwip/.gemini/antigravity-ide/brain/09111447-dbb2-48a7-a470-c81066653fb3';

(async () => {
  console.log('🚀 Running automated visual capture on CachyOS...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  await context.addInitScript(() => {
    localStorage.setItem('lantern_token', 'lantern-session-dwip-admin');
    localStorage.setItem('lantern_portal_mode', 'user');
    localStorage.setItem('lantern_theme', 'dark');
    localStorage.setItem('lantern_ui_audio_enabled', 'true');
  });

  const page = await context.newPage();

  async function snap(name) {
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, name) });
    console.log(`  ✓ Captured ${name}`);
  }

  // 1. Home
  console.log('1. Capturing Home screen...');
  await page.goto('http://localhost:8080', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await snap('screen_01_home.png');

  // 2. Spotlight
  console.log('2. Capturing Spotlight...');
  await page.keyboard.press('ControlOrMeta+k');
  await page.waitForTimeout(400);
  await snap('screen_02_spotlight.png');

  // 3. Spotlight Search
  console.log('3. Capturing Spotlight Search...');
  await page.keyboard.type('bunny');
  await page.waitForTimeout(300);
  await snap('screen_03_spotlight_search.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 4. Details Modal (with 100% REAL hardware probed specs!)
  console.log('4. Capturing Showcase Details Modal with real hardware data...');
  const detailsBtn = await page.$('button:has-text("Details")');
  if (detailsBtn) {
    await detailsBtn.click();
    await page.waitForTimeout(600);
    await snap('screen_04_details_modal.png');
    // Click close button on modal
    const closeBtn = await page.$('.fixed.inset-0.z-50 button:has(svg)');
    if (closeBtn) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
  }

  // 5. Cinema
  console.log('5. Capturing Cinema view...');
  const cinemaBtn = await page.$('aside button:has-text("Cinema")');
  if (cinemaBtn) {
    await cinemaBtn.click();
    await page.waitForTimeout(800);
    await snap('screen_05_cinema.png');
  }

  // 6. Apps
  console.log('6. Capturing Apps Launchpad...');
  const appsBtn = await page.$('aside button:has-text("Apps")');
  if (appsBtn) {
    await appsBtn.click();
    await page.waitForTimeout(800);
    await snap('screen_06_apps.png');
  }

  // 7. Files
  console.log('7. Capturing Family Cloud Files...');
  const filesBtn = await page.$('aside button:has-text("Files")');
  if (filesBtn) {
    await filesBtn.click();
    await page.waitForTimeout(800);
    await snap('screen_07_files.png');
  }

  // 8. Mobile Home
  console.log('8. Capturing Mobile Home (iPhone 14)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const forYouMobile = await page.$('nav.lg\\:hidden button:has-text("For You")');
  if (forYouMobile) await forYouMobile.click();
  await page.waitForTimeout(600);
  await snap('screen_08_mobile_home.png');

  // 9. Mobile Apps
  console.log('9. Capturing Mobile Apps...');
  const appsMobile = await page.$('nav.lg\\:hidden button:has-text("Apps")');
  if (appsMobile) await appsMobile.click();
  await page.waitForTimeout(600);
  await snap('screen_09_mobile_apps.png');

  // 10. Admin Dashboard
  console.log('10. Capturing Admin Dashboard...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080');
  await page.waitForTimeout(600);
  const consoleBtn = await page.$('aside button:has-text("Console")');
  if (consoleBtn) {
    await consoleBtn.click();
    await page.waitForTimeout(1000);
    await snap('screen_10_admin_dashboard.png');
  }

  await browser.close();
  console.log('🎉 ALL SCREENSHOTS SUCCESSFULLY CAPTURED!');
})().catch(err => {
  console.error('❌ Capture failed:', err);
  process.exit(1);
});
