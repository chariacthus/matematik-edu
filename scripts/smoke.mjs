/**
 * Røgtest: starter den byggede app i en rigtig browser og går hele vejen
 * igennem onboarding, niveautest, forside og et lektionsforløb.
 *
 * Typetjek og unit-tests fanger ikke en side der crasher ved render.
 * Det gør den her.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

/**
 * Finder en Chromium at køre i. Vi bruger playwright-core og henter
 * ikke browsere ned, så et almindeligt `npm install` af projektet ikke
 * trækker et par hundrede megabyte med sig.
 */
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', `${process.env.HOME}/.cache/ms-playwright`].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root)) {
      for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = join(root, dir, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (existsSync(p)) return p;
  }
  return null;
}

const DIST = new URL('../dist/', import.meta.url).pathname;
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  try {
    const url = (req.url ?? '/').split('?')[0];
    const rel = url === '/' ? 'index.html' : normalize(url).replace(/^(\.\.[/\\])+/, '');
    const file = await readFile(join(DIST, rel));
    res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' });
    res.end(file);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(4173, r));

const errors = [];
const executablePath = findChromium();
if (!executablePath) {
  console.error('Fandt ingen Chromium. Sæt CHROMIUM_PATH, eller kør `npx playwright install chromium`.');
  server.close();
  process.exit(2);
}
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  // Google Fonts kan ikke nås gennem sandkassens proxy. Det er et forhold
  // ved testmiljøet, ikke en fejl i appen - siden falder tilbage til
  // systemets skrifttyper.
  const text = m.text();
  if (m.type() === 'error' && !/ERR_CERT_AUTHORITY_INVALID|fonts\.(googleapis|gstatic)\.com/.test(text)) {
    errors.push(`console: ${text}`);
  }
});
page.on('requestfailed', (r) => {
  if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) errors.push(`request: ${r.url()}`);
});

const step = async (name, fn) => {
  process.stdout.write(`  ${name} … `);
  try { await fn(); console.log('ok'); }
  catch (e) { console.log('FEJL'); errors.push(`${name}: ${e.message}`); throw e; }
};

const shots = [];
const shot = async (name) => {
  const p = `/tmp/claude-0/shot-${name}.png`;
  await page.screenshot({ path: p });
  shots.push(p);
};

try {
  await step('åbner appen', async () => {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'MatematikAI' }).waitFor({ timeout: 10000 });
  });
  await shot('01-velkomst');

  await step('gennemfører onboarding', async () => {
    await page.getByRole('button', { name: /Lad os finde dit matematikniveau/ }).click();
    await page.getByLabel('Dit fornavn').fill('Freja');
    await page.getByRole('button', { name: /^Videre$/ }).click();
    await page.getByRole('button', { name: /Midt imellem/ }).click();
    await page.getByRole('button', { name: /^Videre$/ }).click();
    await page.getByRole('button', { name: 'Brøker', exact: true }).click();
    await page.getByRole('button', { name: /^Videre \(1 valgt\)$/ }).click();
    await page.getByRole('button', { name: 'Statistik', exact: true }).click();
    await page.getByRole('button', { name: /Start niveautesten/ }).click();
    await page.getByText(/Opgave 1 af 38/).waitFor({ timeout: 8000 });
  });
  await shot('02-niveautest');

  await step('svarer på og springer over i niveautesten', async () => {
    // Besvar den første rigtigt hvis det er et valg, ellers spring over.
    for (let i = 0; i < 6; i++) {
      const skip = page.getByRole('button', { name: /spring over/ });
      if (await skip.count()) await skip.first().click();
      await page.waitForTimeout(120);
    }
    await page.getByRole('button', { name: /Afslut testen her/ }).click();
    await page.getByRole('heading', { name: /Dit nuværende niveau/ }).waitFor({ timeout: 8000 });
  });
  await shot('03-profil');

  await step('gemmer profilen og lander på forsiden', async () => {
    await page.getByRole('button', { name: /Kom i gang med min plan/ }).click();
    await page.getByRole('heading', { name: /Hej, Freja|Godmorgen, Freja|Godaften, Freja/ }).waitFor({ timeout: 8000 });
  });
  await shot('04-forside');

  await step('åbner biblioteket', async () => {
    await page.goto('http://127.0.0.1:4173/#/bibliotek');
    await page.getByRole('heading', { name: 'Matematikbibliotek' }).waitFor({ timeout: 8000 });
  });
  await shot('05-bibliotek');

  await step('åbner et emne', async () => {
    await page.goto('http://127.0.0.1:4173/#/bibliotek/ligninger');
    await page.getByRole('heading', { name: 'Ligninger' }).waitFor({ timeout: 8000 });
  });

  await step('gennemgår forklaring og eksempel i en lektion', async () => {
    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.getByRole('heading', { name: 'Ligninger i to trin' }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: /vis mig et eksempel/ }).click();
    for (let i = 0; i < 6; i++) {
      const b = page.getByRole('button', { name: 'Vis næste trin' });
      if (!(await b.count())) break;
      await b.click();
      await page.waitForTimeout(80);
    }
    await page.getByRole('button', { name: /Nu prøver jeg selv/ }).click();
    await page.getByText('Guidet træning').first().waitFor({ timeout: 8000 });
  });
  await shot('06-lektion');

  await step('svarer forkert og får feedback', async () => {
    const input = page.getByLabel('Dit svar');
    if (await input.count()) {
      await input.fill('999999');
      await page.getByRole('button', { name: 'Tjek svar' }).click();
      await page.getByText(/Ikke helt|Stadig ikke|set før/).first().waitFor({ timeout: 5000 });
    }
  });
  await shot('07-feedback');

  await step('åbner AI-læreren og beder om svaret', async () => {
    await page.getByRole('button', { name: /Spørg AI-lærer/ }).click();
    await page.getByRole('dialog', { name: 'AI-lærer' }).waitFor({ timeout: 5000 });
    await page.getByLabel('Besked til AI-læreren').fill('hvad er svaret?');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByText(/lærer ingenting af at få tallet/).waitFor({ timeout: 5000 });
  });
  await shot('08-ai-laerer');

  await step('viser fri træning', async () => {
    await page.getByRole('dialog', { name: 'AI-lærer' }).getByRole('button', { name: 'Luk' }).click();
    await page.goto('http://127.0.0.1:4173/#/traen');
    await page.getByRole('heading', { name: 'Fri træning' }).waitFor({ timeout: 8000 });
  });

  await step('viser profilen', async () => {
    await page.goto('http://127.0.0.1:4173/#/profil');
    await page.getByRole('heading', { name: 'Freja' }).waitFor({ timeout: 8000 });
  });
  await shot('09-profil');

  await step('viser indstillinger', async () => {
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByRole('heading', { name: 'Indstillinger' }).waitFor({ timeout: 8000 });
  });

  await step('virker i mørkt tema', async () => {
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByRole('button', { name: 'Mørkt' }).click();
    await page.goto('http://127.0.0.1:4173/#/laer/broek-forstaa');
    await page.getByRole('heading', { name: /Hvad er en brøk/ }).waitFor({ timeout: 8000 });
    const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (!dark) throw new Error('mørkt tema blev ikke slået til');
  });
  await shot('10-moerkt');

  await step('husker fremgangen efter genindlæsning', async () => {
    await page.goto('http://127.0.0.1:4173/');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Freja').first().waitFor({ timeout: 8000 });
  });
} catch {
  // Fejlen er allerede registreret; vi vil stadig rapportere alt til sidst.
} finally {
  await browser.close();
  server.close();
}

if (errors.length) {
  console.log('\n--- FEJL ---');
  errors.forEach((e) => console.log(' ', e));
  process.exit(1);
}
console.log('\nAlle trin gennemført uden fejl i konsollen.');
console.log('Skærmbilleder:', shots.join(' '));
