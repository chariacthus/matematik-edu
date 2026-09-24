/**
 * Tegner appens ikoner: en halv på ternet papir. Kør den igen hvis
 * ikonet skal ændres; resultatet ligger i public/ og er checket ind.
 */
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const font = join(root, 'node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2');

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const base of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', `${process.env.HOME}/.cache/ms-playwright`]) {
    if (!base || !existsSync(base)) continue;
    for (const dir of readdirSync(base)) {
      const p = join(base, dir, 'chrome-linux/chrome');
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

// full: fylder hele fladen (maskable og Apple). Ellers afrundede hjørner.
const ICONS = [
  { file: 'icon-192.png', size: 192, full: false, scale: 1 },
  { file: 'icon-512.png', size: 512, full: false, scale: 1 },
  { file: 'icon-maskable-512.png', size: 512, full: true, scale: 0.78 },
  { file: 'apple-touch-icon.png', size: 180, full: true, scale: 0.9 },
  { file: 'favicon-32.png', size: 32, full: false, scale: 1.1 },
];

const html = ({ size, full, scale }) => `<!doctype html><html><head><style>
@font-face { font-family: Geist; src: url('file://${font}') format('woff2'); font-weight: 100 900; }
html, body { margin: 0; background: transparent; }
.tile {
  width: ${size}px; height: ${size}px; box-sizing: border-box;
  border-radius: ${full ? 0 : Math.round(size * 0.22)}px;
  background-color: #16181d;
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px);
  background-size: ${size / 8}px ${size / 8}px;
  background-position: ${size / 16}px ${size / 16}px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: Geist; font-weight: 600; color: #fff; line-height: 1;
  font-size: ${size * 0.3 * scale}px;
}
.bar { width: ${size * 0.34 * scale}px; height: ${Math.max(2, size * 0.04 * scale)}px; background: #4479ec; border-radius: 99px; margin: ${size * 0.035 * scale}px 0; }
</style></head><body><div class="tile"><span>1</span><span class="bar"></span><span>2</span></div></body></html>`;

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage();
for (const icon of ICONS) {
  const tmp = join('/tmp', `icon-${icon.size}-${icon.full}.html`);
  await writeFile(tmp, html(icon));
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.goto(`file://${tmp}`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.tile').screenshot({ path: join(root, 'public', icon.file), omitBackground: true });
  console.log('tegnet', icon.file);
}
await browser.close();
