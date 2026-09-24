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
  '.png': 'image/png', '.webmanifest': 'application/manifest+json',
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
  // ERR_ABORTED betyder at vi selv navigerede væk mens hentningen kørte.
  // Det sker hver gang testen skifter rute hurtigt, og siger intet om
  // appen. Alt andet er en rigtig netværksfejl.
  const reason = r.failure()?.errorText ?? '';
  if (reason.includes('ERR_ABORTED')) return;
  errors.push(`request: ${r.url()} (${reason})`);
});
// En fil der ikke findes giver ikke requestfailed, men et svar med 404.
// Uden det her ville en manglende skrift eller et manglende asset gå
// stille igennem.
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1:4173/')) {
    errors.push(`http ${r.status()}: ${r.url()}`);
  }
});

// Kontrast efter WCAG AA: 4,5 for almindelig tekst, 3 for stor tekst.
// Baggrunden findes ved at lægge forældrenes farver oven på hinanden.
// Deaktiverede og bevidst dæmpede ting (låste badges) tæller ikke med.
async function lowContrast() {
  return page.evaluate(() => {
    const parse = (str) => {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
    };
    const blend = (fg, bg) => fg.rgb.map((v, i) => v * fg.a + bg[i] * (1 - fg.a));
    const lum = (rgb) => {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (el.closest('[aria-hidden="true"], .katex, svg, [disabled], [aria-disabled="true"]')) continue;
      const chain = [];
      let dimmed = false;
      for (let e = el; e; e = e.parentElement) {
        chain.push(e);
        if (Number(getComputedStyle(e).opacity) < 1) dimmed = true;
      }
      if (dimmed) continue;
      let bg = [255, 255, 255];
      for (const e of chain.reverse()) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0) bg = blend(c, bg);
      }
      const cs = getComputedStyle(el);
      const fgc = parse(cs.color);
      if (!fgc) continue;
      const fg = blend(fgc, bg);
      const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      const ratio = (hi + 0.05) / (lo + 0.05);
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) {
        out.push(`${ratio.toFixed(2)} "${el.textContent.trim().slice(0, 30)}" (${el.className.toString().slice(0, 60)})`);
      }
    }
    return out;
  });
}

const requested = [];
page.on('request', (r) => requested.push(r.url()));

const step = async (name, fn) => {
  process.stdout.write(`  ${name} … `);
  try { await fn(); console.log('ok'); }
  catch (e) { console.log('FEJL'); errors.push(`${name}: ${e.message}`); throw e; }
};

// Teksten skal lyde som en lærer, ikke som en maskine. Tjekkes på alt der
// er synligt, hver gang der tages et billede.
async function assertHumanCopy(where) {
  const text = (await page.evaluate(() => document.body.innerText)).split('Lad os tage første trin sammen').join('');
  const hits = [];
  if (/\bAI\b/.test(text)) hits.push('ordet "AI"');
  if (text.includes('—')) hits.push(`tankestreg i "${text.slice(Math.max(0, text.indexOf('—') - 40), text.indexOf('—') + 30)}"`);
  if (/\blad os\b/i.test(text)) hits.push('"lad os"');
  if (/det er dér|hold fast|godt klaret|det er sådan man|godt spørgsmål/i.test(text)) hits.push('floskel');
  if (hits.length) errors.push(`${where}: ${hits.join(', ')}`);
}

// Kortenes formler: sat op af KaTeX og inden for kortets kant.
async function checkFormulas(where, min = 1) {
  const res = await page.evaluate(() =>
    [...document.querySelectorAll('[data-formula]')].map((el) => ({
      tex: Boolean(el.querySelector('.katex')),
      over: el.scrollWidth - el.clientWidth,
      text: el.textContent.slice(0, 30),
    })),
  );
  if (res.length < min) throw new Error(`${where}: kun ${res.length} formler på siden`);
  const bad = res.filter((r) => !r.tex);
  if (bad.length) throw new Error(`${where}: ${bad.length} formler blev ikke sat op`);
  const over = res.filter((r) => r.over > 1);
  if (over.length) throw new Error(`${where}: formlen "${over[0].text}" går ud over kortet (${over[0].over}px)`);
}

const shots = [];
const shot = async (name) => {
  // Lad indtoninger og forsinkede liste-animationer falde til ro, ellers
  // fanger billedet en halvgennemsigtig side.
  await page.waitForTimeout(700);
  await assertHumanCopy(name);
  const p = `/tmp/claude-0/shot-${name}.png`;
  await page.screenshot({ path: p });
  shots.push(p);
};

/**
 * Går rundvisningen igennem og tjekker hvert trin: en overskrift, et hul
 * der ikke er hele skærmen, og et kort der ikke ligger oven på hullet.
 * Overlap tjekkes i begge retninger - i sidemenuen står kortet ved
 * siden af hullet, og et lodret tjek alene ville kalde det overlap.
 */
async function walkTour() {
  const tour = page.getByRole('dialog', { name: 'Rundvisning' });
  await tour.waitFor({ timeout: 8000 });
  let spotlights = 0;
  for (let i = 0; i < 12; i++) {
    // Kortet er skjult til målet er målt; vent på det frem for at måle
    // mens det stadig leder.
    await tour.locator('.glass-strong').waitFor({ state: 'visible', timeout: 5000 });
    const heading = (await tour.locator('h2').textContent())?.trim() ?? '';
    if (!heading) throw new Error(`trin ${i + 1} i rundvisningen har ingen overskrift`);
    const geo = await page.evaluate(() => {
      const root = document.querySelector('[role="dialog"][aria-label="Rundvisning"]');
      const hole = [...root.children].find((el) => getComputedStyle(el).boxShadow.includes('9999px'));
      const card = root.querySelector('.glass-strong').getBoundingClientRect();
      if (!hole) return { spotlight: false };
      const h = hole.getBoundingClientRect();
      const offscreen = card.left < 0 || card.right > window.innerWidth || card.top < 0 || card.bottom > window.innerHeight;
      return {
        spotlight: true,
        full: h.height >= window.innerHeight,
        overlap: h.left < card.right && card.left < h.right && h.top < card.bottom && card.top < h.bottom,
        offscreen,
      };
    });
    if (geo.spotlight) {
      spotlights++;
      if (geo.full) throw new Error(`trin ${i + 1} ("${heading}") markerer hele skærmen`);
      if (geo.overlap) throw new Error(`trin ${i + 1} ("${heading}") har kortet oven på markeringen`);
      if (geo.offscreen) throw new Error(`trin ${i + 1} ("${heading}") har kortet uden for skærmen`);
    }
    const done = page.getByRole('button', { name: 'Så er jeg klar' });
    if (await done.count()) {
      await done.click();
      break;
    }
    await page.getByRole('button', { name: 'Videre' }).click();
    await page.waitForTimeout(500);
  }
  await tour.waitFor({ state: 'detached', timeout: 5000 });
  if (spotlights < 5) throw new Error(`kun ${spotlights} trin i rundvisningen markerer noget på skærmen`);
}

try {
  await step('åbner appen', async () => {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'MatematikAI' }).waitFor({ timeout: 10000 });
  });
  await shot('01-velkomst');

  await step('gennemfører onboarding', async () => {
    await page.getByRole('button', { name: /Find mit niveau/ }).click();
    await page.getByLabel('Dit fornavn').fill('Freja');
    await page.getByRole('button', { name: /^Videre$/ }).click();
    await page.getByRole('button', { name: /Midt imellem/ }).click();
    await shot('25-selvvurdering');
    await page.getByRole('button', { name: /^Videre$/ }).click();
    await page.getByRole('button', { name: 'Brøker', exact: true }).click();
    await shot('26-emnevalg');
    await page.getByRole('button', { name: /^Videre \(1 valgt\)$/ }).click();
    // Et emne kan ikke både være svært og nemt.
    if (!(await page.getByRole('button', { name: /^Brøker/ }).isDisabled())) {
      throw new Error('Brøker kan vælges som nemt, selvom det allerede er valgt som svært');
    }
    await page.getByRole('button', { name: 'Statistik', exact: true }).click();
    await page.getByRole('button', { name: /Start niveautesten/ }).click();
    await page.getByText(/Opgave 1 af 42/).waitFor({ timeout: 8000 });
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
    await page.getByRole('heading', { name: 'Freja', exact: true }).waitFor({ timeout: 8000 });
    await page.getByText('Dagens Missioner').waitFor({ timeout: 5000 });
  });
  await shot('04-forside');

  await step('rundvisningen kører hele vejen igennem', async () => {
    const tour = page.getByRole('dialog', { name: 'Rundvisning' });
    await tour.waitFor({ timeout: 8000 });
    await shot('23-rundvisning');
    await walkTour();

    // Den må ikke komme igen når man vender tilbage til forsiden.
    await page.goto('http://127.0.0.1:4173/#/bibliotek');
    await page.goto('http://127.0.0.1:4173/');
    await page.getByText('Dagens Missioner').waitFor({ timeout: 8000 });
    if (await page.getByRole('dialog', { name: 'Rundvisning' }).count()) {
      throw new Error('rundvisningen starter forfra efter den er gennemført');
    }
  });

  await step('forsiden viser matematik frem for ikoner', async () => {
    await checkFormulas('forsiden', 5);
  });

  await step('kort har kant og skygge', async () => {
    const card = page.locator('main .card-interactive').first();
    await card.waitFor({ timeout: 5000 });
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
    const read = () =>
      card.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { border: cs.borderTopColor, bg: cs.backgroundColor, shadow: cs.boxShadow };
      });
    const before = await read();
    if (/rgba\(0, 0, 0, 0\)|transparent/.test(before.border)) {
      throw new Error(`kortet har ingen kant (${before.border})`);
    }
    if (before.shadow === 'none') throw new Error('kortet har ingen skygge');
    if (before.shadow.includes('inset')) {
      throw new Error('kortet har en indvendig lysning - den hører kun til de primære knapper');
    }
    await card.hover();
    await page.waitForTimeout(400);
    const after = await read();
    if (after.border === before.border && after.bg === before.bg) {
      throw new Error('kortet reagerer ikke på hover');
    }
  });

  await step('åbner biblioteket', async () => {
    await page.goto('http://127.0.0.1:4173/#/bibliotek');
    await page.getByRole('heading', { name: 'Emner', exact: true }).waitFor({ timeout: 8000 });
    await checkFormulas('emner', 21);
  });
  await shot('05-bibliotek');

  await step('åbner et emne og viser færdighedskortet', async () => {
    await page.goto('http://127.0.0.1:4173/#/bibliotek/ligninger');
    await page.getByRole('heading', { name: 'Ligninger' }).waitFor({ timeout: 8000 });
    await page.getByRole('group', { name: 'Færdighedskort' }).waitFor({ timeout: 5000 });
    // Kortet skal kunne skiftes til liste og tilbage.
    await page.getByRole('tab', { name: 'Liste' }).click();
    await page.getByText('Ligninger i ét trin').first().waitFor({ timeout: 5000 });
    await page.getByRole('tab', { name: 'Kort' }).click();
    await page.getByRole('group', { name: 'Færdighedskort' }).waitFor({ timeout: 5000 });
  });
  await shot('14-kort');

  await step('gennemgår forklaring og eksempel i en lektion', async () => {
    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.getByRole('heading', { name: 'Ligninger i to trin' }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: /Vis mig et eksempel/ }).click();
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

      // Lysningen langs overkanten hører kun til de primære knapper.
      const primary = await page.locator('.btn-primary').first().evaluate((el) => getComputedStyle(el).boxShadow);
      if (!primary.includes('inset')) {
        throw new Error(`den primære knap mangler lysningen langs overkanten (${primary})`);
      }

      // Rystet ved forkert svar, og de to kvitterings-animationer skal
      // faktisk findes i stilarket. Tailwind udelader en klasse der ikke
      // står ordret i kildekoden, og så fejler ingen typetjek - kun
      // fornemmelsen forsvinder.
      const feel = await page.evaluate(() => {
        const card = document.querySelector('article.card.animate-shake');
        const names = new Set();
        for (const sheet of document.styleSheets) {
          let rules;
          try { rules = sheet.cssRules; } catch { continue; }
          for (const rule of rules) {
            if (rule instanceof CSSKeyframesRule) names.add(rule.name);
          }
        }
        return { shaken: Boolean(card), keyframes: [...names] };
      });
      if (!feel.shaken) throw new Error('opgavekortet ryster ikke ved forkert svar');
      for (const name of ['shake', 'pulse-correct']) {
        if (!feel.keyframes.includes(name)) {
          throw new Error(`animationen "${name}" mangler i stilarket`);
        }
      }
    }
  });
  await shot('07-feedback');


  await step('åbner hjælpen som flydende panel og beder om svaret', async () => {
    await page.getByRole('button', { name: 'Få hjælp', exact: true }).click();
    const dock = page.getByRole('dialog', { name: 'Hjælp' });
    await dock.waitFor({ timeout: 5000 });
    // Panelet må ikke dække hele skærmen på desktopbredde, men her er
    // vi på telefon, hvor det er et ark. Vi kontrollerer bare at det
    // ikke er den gamle modal ved at se efter panelets egen overskrift.
    await dock.getByText('Ligninger i to trin').waitFor({ timeout: 5000 });
    await page.getByLabel('Skriv til hjælpen').fill('hvad er svaret?');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByText(/lærer ingenting af at få tallet/).waitFor({ timeout: 5000 });
  });
  await shot('08-hjaelp');

  // Menuerne skal være væk på en telefon mens der svares: ingen fast
  // topbjælke og ingen bundmenu, kun opgavens egen smalle bjælke.
  async function assertFocus(where) {
    const chrome = await page.evaluate(() => ({
      bar: Boolean(document.querySelector('[data-focusbar]')),
      header: [...document.querySelectorAll('header')].some(
        (h) => getComputedStyle(h).position === 'sticky' && h.getBoundingClientRect().height > 0,
      ),
      nav: [...document.querySelectorAll('nav[aria-label="Hovedmenu"]')].some((n) => n.getBoundingClientRect().height > 0),
    }));
    if (!chrome.bar) throw new Error(`${where}: fokusbjælken mangler`);
    if (chrome.header) throw new Error(`${where}: topbjælken står der stadig mens man svarer`);
    if (chrome.nav) throw new Error(`${where}: bundmenuen står der stadig mens man svarer`);
  }

  await step('lektionen er i fokus mens man svarer', async () => {
    await page.getByRole('button', { name: 'Luk hjælpen' }).click();
    await assertFocus('lektionen');
    // Færdighedens navn står i bjælken og ikke en gang til i opgavekortet.
    const inCard = await page.locator('main article.card').first().innerText();
    if (inCard.includes('Ligninger i to trin')) throw new Error('opgavekortet gentager færdighedens navn');
  });

  await step('træning ligger under Emner, og menuen har fire faner', async () => {
    await page.goto('http://127.0.0.1:4173/#/traen');
    await page.getByRole('heading', { name: 'Emner', exact: true }).waitFor({ timeout: 8000 });
    const tabs = await page.evaluate(
      () => [...document.querySelectorAll('nav[aria-label="Hovedmenu"] a')].filter((a) => a.getBoundingClientRect().height > 0).length,
    );
    if (tabs !== 4) throw new Error(`bundmenuen har ${tabs} faner, ikke 4`);

    await page.goto('http://127.0.0.1:4173/#/bibliotek/broeker');
    await page.getByRole('heading', { name: 'Brøker', exact: true }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: /^Lær: / }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Træn 10 opgaver' }).click();
    const pick = page.getByRole('dialog', { name: 'Træn 10 opgaver' });
    await pick.waitFor({ timeout: 5000 });
    await shot('24-traen-valg');
    await pick.getByRole('button', { name: /^Forkorte og udvide/ }).click();
    await page.locator('[data-focusbar]').getByText('0 af 10').waitFor({ timeout: 8000 });
    await assertFocus('træningsrunden');
    await shot('41-runde');

    // Luk uden at have svaret: tilbage til emnet, og menuerne er der igen.
    await page.getByRole('button', { name: 'Stop runden' }).click();
    await page.getByRole('heading', { name: 'Brøker', exact: true }).waitFor({ timeout: 5000 });
    const nav = await page.evaluate(() =>
      [...document.querySelectorAll('nav[aria-label="Hovedmenu"]')].some((n) => n.getBoundingClientRect().height > 0),
    );
    if (!nav) throw new Error('bundmenuen kommer ikke igen efter runden');
  });

  await step('Emner og forsiden løber ikke over, heller ikke med mange emner i gang', async () => {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      localStorage.setItem(
        'matematik-ai:profile',
        JSON.stringify({ name: 'Bo', onboarded: true, diagnosticDone: true, tourDone: true, createdAt: Date.now() }),
      );
      const ids = [
        'tal-regnearter', 'tal-hierarki', 'tal-negative', 'tal-afrunding', 'tal-primtal', 'broek-forstaa', 'broek-forkort',
        'broek-plusminus', 'broek-gange-dividere', 'broek-omregning', 'decimal-pladsvaerdi', 'decimal-regning',
        'procent-af-tal', 'procent-find-procenten', 'procent-aendring', 'forhold-grund', 'potens-grund', 'rod-kvadratrod',
        'algebra-udtryk', 'algebra-reducer', 'ligning-ettrin', 'ligning-totrin', 'geo-vinkler', 'geo-trekanter',
        'geo-pythagoras', 'areal-omkreds', 'stat-deskriptorer', 'sand-grund', 'funk-lineaer', 'prob-flertrin',
      ];
      const skills = {};
      ids.forEach((id, i) => {
        skills[id] = {
          skillId: id, pKnown: 0.4, ability: 2, attempts: 5, correct: 3, streak: 0, bestStreak: 2, phase: 'guided',
          phaseProgress: 1, lastSeen: Date.now() - i * 3600000, masteredAt: null, interval: 0, ease: 2.5, due: null,
          reviews: 0, lapses: 0, avgSeconds: 30, hintsUsed: 0, cleanStreak: 0,
        };
      });
      localStorage.setItem('matematik-ai:skills', JSON.stringify(skills));
      sessionStorage.setItem('seeded', '1');
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`pageerror (mange emner): ${e.message}`));
    try {
      await p.goto('http://127.0.0.1:4173/#/bibliotek', { waitUntil: 'networkidle' });
      await p.getByRole('heading', { name: 'Emner', exact: true }).waitFor({ timeout: 8000 });
      const rows = await p.locator('[data-continue] button').count();
      if (rows !== 3) throw new Error(`Fortsæt viser ${rows} rækker, ikke 3`);
      await p.waitForTimeout(600);
      await p.screenshot({ path: '/tmp/claude-0/shot-37-emner-fortsaet.png' });
      shots.push('/tmp/claude-0/shot-37-emner-fortsaet.png');

      // Lange undertekster må ikke skubbe siden ud til siden på en telefon.
      for (const route of ['#/', '#/bibliotek', '#/bibliotek/broeker', '#/profil']) {
        await p.goto(`http://127.0.0.1:4173/${route}`);
        await p.waitForTimeout(500);
        const wide = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (wide > 0) throw new Error(`${route} er ${wide}px for bred på en telefon`);
      }

      // Forsiden: stime og mål i ét kort, stimen kun én gang, intet ekstra niveaukort.
      await p.goto('http://127.0.0.1:4173/#/');
      await p.getByText('Dagens Missioner').waitFor({ timeout: 8000 });
      const home = await p.evaluate(() => ({
        streaks: [...document.querySelectorAll('[title$="dage i træk"], [title$="dag i træk"]')].filter((el) => el.getBoundingClientRect().height > 0).length,
        tiles: document.querySelectorAll('[data-tour="hud"]').length,
        level: document.querySelectorAll('main [aria-label^="Fremgang mod niveau"]').length,
      }));
      if (home.streaks > 0) throw new Error('stimen står både i topbjælken og på forsiden');
      if (home.tiles !== 1) throw new Error('stime og dagens mål er ikke samlet i ét kort');
      if (home.level) throw new Error('niveauet står på forsiden, selvom det allerede står i topbjælken');

      await p.setViewportSize({ width: 1280, height: 860 });
      await p.goto('http://127.0.0.1:4173/#/bibliotek');
      await p.waitForTimeout(600);
      await p.screenshot({ path: '/tmp/claude-0/shot-38-emner-computer.png' });
      shots.push('/tmp/claude-0/shot-38-emner-computer.png');
    } finally {
      await ctx.close();
    }
  });

  await step('en hjælpetegning kommer først med et hint', async () => {
    for (let round = 0; round < 6; round++) {
      await page.goto('http://127.0.0.1:4173/#/laer/ligning-ettrin');
      await page.reload({ waitUntil: 'networkidle' });
      const intro = page.getByRole('button', { name: /Vis mig et eksempel/ });
      if (await intro.count()) {
        await intro.click();
        for (let i = 0; i < 6; i++) {
          const b = page.getByRole('button', { name: 'Vis næste trin' });
          if (!(await b.count())) break;
          await b.click();
        }
        await page.getByRole('button', { name: /Nu prøver jeg selv/ }).click();
      }
      await page.locator('main article.card').first().waitFor({ timeout: 8000 });
      const before = await page.evaluate(() => ({
        aid: document.querySelectorAll('main [data-aid]').length,
        figures: document.querySelectorAll('main article figure').length,
      }));
      if (before.aid) throw new Error('hjælpetegningen står i opgaven før eleven har bedt om hjælp');
      const hint = page.getByRole('button', { name: /^Hint/ });
      if (!(await hint.count())) continue;
      await hint.click();
      await page.waitForTimeout(300);
      const after = await page.locator('main [data-aid]').count();
      if (after && before.figures) throw new Error('hjælpetegningen stod der allerede før hintet');
      if (after) {
        await shot('39-tegning-efter-hint');
        return;
      }
    }
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

  await step('dialogboksen har flade, kant og plads til sin tekst', async () => {
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByRole('button', { name: 'Nulstil alt', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nulstil alt?' });
    await dialog.waitFor({ timeout: 5000 });
    // Indholdet ruller indeni, så kanten kan blive stående. Går det galt,
    // klapper boksen sammen om overskriften.
    const box = await dialog.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        height: Math.round(el.getBoundingClientRect().height),
        blur: cs.backdropFilter,
        border: cs.borderTopColor,
        shadow: cs.boxShadow,
      };
    });
    if (box.height < 160) throw new Error(`dialogboksen er kun ${box.height}px høj - teksten får ikke plads`);
    if (box.blur === 'none') throw new Error('dialogboksen har ikke glas som resten af appen');
    if (/rgba\(0, 0, 0, 0\)|transparent/.test(box.border)) {
      throw new Error(`dialogboksen mangler sin kant (${box.border})`);
    }

    await page.getByText(/Det sletter din profil/).waitFor({ timeout: 5000 });
    await shot('19-dialog');
    await page.getByRole('button', { name: 'Luk', exact: true }).click();
    await dialog.waitFor({ state: 'detached', timeout: 5000 });
  });

  await step('viser geometrifigurer', async () => {
    await page.goto('http://127.0.0.1:4173/#/laer/geo-vinkler');
    const fig = page.locator('figure svg').first();
    await fig.waitFor({ timeout: 8000 });
    await fig.scrollIntoViewIfNeeded();
    // Lad et eventuelt badge-pop forsvinde, så det ikke dækker figuren.
    await page.waitForTimeout(3400);
  });
  await shot('21-figurer');

  await step('viser FP9-prøvetræning', async () => {
    // Prøven er sin egen bid kode og hentes først når man går derhen.
    if (requested.some((u) => /\/assets\/Exam-/.test(u))) throw new Error('prøvens kode blev hentet før prøven blev åbnet');
    await page.goto('http://127.0.0.1:4173/#/proeve');
    await page.getByRole('heading', { name: 'Prøvetræning' }).waitFor({ timeout: 8000 });
    await page.getByRole('heading', { name: 'Uden hjælpemidler' }).waitFor({ timeout: 5000 });
    if (!requested.some((u) => /\/assets\/Exam-/.test(u))) throw new Error('prøven blev ikke hentet som en separat del');
  });
  await shot('11-proeve');

  await step('kører en prøve uden hjælpemidler', async () => {
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.getByText(/Opgave 1 af 20/).waitFor({ timeout: 8000 });
    const clock = await page.locator('[role="timer"]').innerText();
    if (!/^(60:00|59:5\d)$/.test(clock.trim())) throw new Error(`uret viser ${clock} lige efter start`);
    // Uret skal blive stående øverst når man ruller ned i en opgave. En
    // lav skærm sikrer at der faktisk er noget at rulle - ellers ville
    // tjekket bestå uden at bevise noget.
    await page.setViewportSize({ width: 420, height: 300 });
    await page.mouse.move(200, 200);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    const pos = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      top: Math.round(document.querySelector('[role="timer"]').getBoundingClientRect().top),
    }));
    if (pos.y < 50) throw new Error(`siden rullede ikke (scrollY ${pos.y}) - tjekket beviser intet`);
    if (pos.top < 0 || pos.top > 60) throw new Error(`uret er rullet ud af syne (top ${pos.top}px)`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize({ width: 420, height: 900 });
    // Formelsamlingen hører til prøven MED hjælpemidler. Slipper den ind
    // her, tester prøven ikke længere det den skal.
    if (await page.getByRole('button', { name: 'Formelsamling' }).count()) {
      throw new Error('formelsamlingen er tilgængelig i prøven uden hjælpemidler');
    }
    // Som på et rigtigt opgaveark: ingen hjælpetegninger (vægtskål,
    // procentbjælke) og ingen hints.
    // Den første besvares med et forkert tal, så gennemgangen har et svar at vise.
    const first = page.getByLabel('Dit svar');
    let typed = false;
    if (await first.count()) {
      await first.fill('999');
      await page.getByRole('button', { name: 'Tjek svar' }).click();
      await page.getByText(/Opgave 2 af 20/).waitFor({ timeout: 5000 });
      typed = true;
    }
    for (let i = typed ? 1 : 0; i < 12; i++) {
      const aids = await page.locator('main article svg[aria-label="Vægt der viser en ligning"], main article svg[aria-label="Andel af en helhed"], main [data-aid]').count();
      if (aids) throw new Error(`opgave ${i + 1} i prøven viser en hjælpetegning`);
      if (await page.getByRole('button', { name: /^Hint/ }).count()) throw new Error('prøven tilbyder hints');
      const skip = page.getByRole('button', { name: 'Spring over' });
      await skip.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await skip.click();
      await page.waitForTimeout(120);
    }
    await page.getByRole('button', { name: 'Aflevér prøven' }).click();
    await page.getByRole('heading', { name: /Prøven er afleveret/ }).waitFor({ timeout: 8000 });

    // Kort først: karakter, tre tal og det man skal øve. Resten er foldet sammen.
    const order = await page.evaluate(() => {
      // textContent: overskriften står med versaler på skærmen.
      const text = document.querySelector('main').textContent;
      return { practice: text.indexOf('Øv disse'), details: text.indexOf('Detaljer') };
    });
    if (order.practice < 0) throw new Error('resultatet viser ikke hvad der skal øves');
    if (order.details < order.practice) throw new Error('detaljerne står før det man skal øve');
    const rows = await page.locator('[data-practice-these] button').count();
    if (rows > 3) throw new Error(`"Øv disse" viser ${rows} rækker`);
    if ((await page.getByRole('button', { name: 'Detaljer' }).getAttribute('aria-expanded')) !== 'false') {
      throw new Error('detaljerne er foldet ud fra start');
    }
    await shot('12-proeveresultat');

    await page.getByRole('button', { name: 'Gennemgå opgaverne' }).click();
    await page.getByRole('heading', { name: 'Gennemgang' }).waitFor({ timeout: 5000 });
    const wrong = await page.locator('[data-review-item]').count();
    if (wrong !== 12) throw new Error(`gennemgangen viser ${wrong} forkerte, ikke de 12 besvarede`);
    const review = await page.locator('main').innerText();
    if (!review.includes('Rigtigt svar') || !review.includes('Sprunget over')) {
      throw new Error('gennemgangen viser ikke både elevens svar og det rigtige');
    }
    if (typed && !/Dit svar\s*999/.test(review)) throw new Error('gennemgangen viser ikke det eleven skrev');
    await shot('42-gennemgang');
    await page.getByRole('tab', { name: /Alle/ }).click();
    await page.waitForTimeout(300);
    const all = await page.locator('[data-review-item]').count();
    if (all !== 20) throw new Error(`"Alle" viser ${all} opgaver, ikke 20`);
    if (!(await page.locator('main').innerText()).includes('Ikke nået')) throw new Error('opgaver man ikke nåede, står ikke som ikke nået');
  });

  await step('giver formelsamling i prøven med hjælpemidler', async () => {
    // Prøven står på resultatskærmen. En hash-navigation genindlæser
    // ikke siden, så her skal der en rigtig reload til.
    await page.goto('http://127.0.0.1:4173/#/proeve');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Prøvetræning' }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'Start' }).nth(1).click();
    await page.getByText(/Opgave 1\.1 · 1 af 12/).waitFor({ timeout: 8000 });

    // Som på et rigtigt opgaveark: historie og tabel over delopgaverne.
    const sheet = page.locator('[data-theme-sheet]:visible');
    await sheet.waitFor({ timeout: 5000 });
    if (!(await sheet.locator('table, svg').count())) throw new Error('opgaven med tema har hverken tabel eller figur');
    if (await page.locator('main article').getByText(/Pythagoras|Procent|Statistik|Brøker/).count()) {
      throw new Error('delopgaven viser emnets navn og afslører dermed metoden');
    }
    await shot('34-tema-telefon');
    await page.getByRole('button', { name: 'Spring over' }).click();
    await page.getByText(/Opgave 1\.2 · 2 af 12/).waitFor({ timeout: 5000 });
    const fold = page.getByRole('button', { name: 'Oplysninger til opgave 1' });
    await fold.waitFor({ timeout: 5000 });
    if (await page.locator('[data-theme-sheet]:visible').count()) {
      throw new Error('historien fylder stadig hele toppen på telefonen efter første delopgave');
    }
    await fold.click();
    await page.locator('main table:visible, main figure svg:visible').first().waitFor({ timeout: 5000 });

    await page.setViewportSize({ width: 1280, height: 860 });
    await page.waitForTimeout(300);
    const side = await page.evaluate(() => {
      const sheetEl = [...document.querySelectorAll('[data-theme-sheet]')].find((el) => el.getBoundingClientRect().width > 0);
      const card = document.querySelector('main article.card');
      if (!sheetEl || !card) return null;
      return { sheetRight: sheetEl.getBoundingClientRect().right, cardLeft: card.getBoundingClientRect().left };
    });
    if (!side) throw new Error('fandt ikke både historie og delopgave på computeren');
    if (side.sheetRight > side.cardLeft) throw new Error('historien står ikke ved siden af delopgaven på en computer');
    await shot('35-tema-computer');
    await page.setViewportSize({ width: 420, height: 900 });

    await page.getByRole('button', { name: 'Formelsamling' }).click();
    const panel = page.getByRole('dialog', { name: 'Formelsamling' });
    await panel.waitFor({ timeout: 5000 });
    await page.getByLabel('Søg i formelsamlingen').fill('cirkel');
    await page.waitForTimeout(300);
    const rendered = await panel.evaluate((el) => el.querySelectorAll('.katex').length);
    if (rendered === 0) throw new Error('formlerne bliver ikke sat op');
    await page.getByText('Omkreds').first().waitFor({ timeout: 3000 });
  });
  await shot('22-formelsamling');

  await step('animationerne kører, og kan slås fra', async () => {
    await page.goto('http://127.0.0.1:4173/');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Dagens Missioner').waitFor({ timeout: 8000 });
    const running = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? getComputedStyle(main).animationName : null;
    });
    if (!running || running === 'none') throw new Error('sideskiftet animerer ikke');

    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByText('Mindre bevægelse').waitFor({ timeout: 5000 });
    await page.getByRole('switch', { name: 'Mindre bevægelse' }).click();
    await page.goto('http://127.0.0.1:4173/');
    await page.getByText('Dagens Missioner').waitFor({ timeout: 8000 });
    // Indstillingen lå i typerne og i standardværdierne, men blev aldrig
    // brugt til noget. Her tjekkes at den faktisk stopper bevægelsen.
    const calm = await page.evaluate(() => {
      const main = document.querySelector('main');
      return {
        flag: document.documentElement.classList.contains('calm'),
        dur: main ? getComputedStyle(main).animationDuration : null,
      };
    });
    if (!calm.flag) throw new Error('"Mindre bevægelse" sætter ikke klassen på <html>');
    // Chromium skriver 0,00001s som "1e-05s", så tallet parses frem for
    // at sammenlignes som tekst.
    if (parseFloat(calm.dur ?? '1') > 0.01) throw new Error(`animationen kører stadig (${calm.dur})`);

    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByRole('switch', { name: 'Mindre bevægelse' }).click();
  });

  await step('viser prisen på Claude i indstillinger', async () => {
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByText(/Den indbyggede hjælp er gratis/).waitFor({ timeout: 8000 });
    const toggle = page.getByLabel('Tilkobl Claude i stedet');
    await toggle.click();
    await page.getByText(/pr\. spørgsmål/).first().waitFor({ timeout: 5000 });
    // Kontakten skal faktisk vise sig som slået til, ikke bare afsløre
    // afsnittet nedenunder.
    const on = await toggle.getAttribute('aria-checked');
    if (on !== 'true') throw new Error(`kontakten viser aria-checked=${on}`);
    await page.waitForTimeout(250);
  });
  await shot('13-ai-pris');

  // Mørkt er standard, så lyst tema bliver ellers aldrig vist i testen.
  await step('virker i lyst tema', async () => {
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByRole('tab', { name: 'Lyst' }).click();
    await page.goto('http://127.0.0.1:4173/#/laer/broek-forstaa');
    await page.getByRole('heading', { name: /Hvad er en brøk/ }).waitFor({ timeout: 8000 });
    const light = await page.evaluate(() => {
      if (document.documentElement.classList.contains('dark')) return null;
      const card = document.querySelector('.card');
      return card
        ? { bg: getComputedStyle(card).backgroundColor, text: getComputedStyle(document.body).color }
        : null;
    });
    if (!light) throw new Error('lyst tema blev ikke slået til');
    // En mørk flade her ville betyde at en dark:-klasse er sluppet ud af
    // sin variant og maler kortene mørke i lyst tema.
    const rgb = light.bg.match(/\d+/g)?.map(Number) ?? [];
    if (rgb.length >= 3 && (rgb[0] + rgb[1] + rgb[2]) / 3 < 140) {
      throw new Error(`kortene er mørke i lyst tema (${light.bg})`);
    }
  });
  await shot('20-lyst');

  await step('virker i mørkt tema', async () => {
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByRole('tab', { name: 'Mørkt' }).click();
    await page.goto('http://127.0.0.1:4173/#/laer/broek-forstaa');
    await page.getByRole('heading', { name: /Hvad er en brøk/ }).waitFor({ timeout: 8000 });
    const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (!dark) throw new Error('mørkt tema blev ikke slået til');
  });
  await shot('10-moerkt');

  // Glasstilen er tænkt til mørkt tema, så hovedskærmene fanges der.
  await step('forsiden i mørkt tema', async () => {
    await page.goto('http://127.0.0.1:4173/');
    await page.getByText('Dagens Missioner').waitFor({ timeout: 8000 });
  });
  await shot('15-forside-moerk');

  await step('hjælpepanelet i mørkt tema', async () => {
    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.getByRole('button', { name: 'Få hjælp', exact: true }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'Få hjælp', exact: true }).click();
    await page.getByRole('dialog', { name: 'Hjælp' }).waitFor({ timeout: 5000 });
    await page.getByLabel('Skriv til hjælpen').fill('jeg forstår det ikke');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.waitForTimeout(700);

    // Panelet skal fylde det meste af højden på en telefon, og elevens
    // egen besked skal være synlig. Ellers er samtalen ubrugelig.
    const box = await page.evaluate(() => {
      const el = document.querySelector('[role="dialog"][aria-label="Hjælp"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width), vh: window.innerHeight };
    });
    if (!box) throw new Error('hjælpepanelet blev ikke fundet');
    if (box.height < box.vh * 0.5) {
      throw new Error(`hjælpepanelet er kun ${box.height}px højt af ${box.vh}px - beskeder får ikke plads`);
    }
    await page.getByText('jeg forstår det ikke').waitFor({ timeout: 5000 });
  });
  await shot('16-ai-moerk');

  await step('hjælpepanelet svæver i hjørnet på en stor skærm', async () => {
    // Luk panelet fra forrige trin. En hash-navigation genindlæser ikke
    // siden, så det ville ellers stå og dække knappen.
    await page.getByRole('button', { name: 'Luk hjælpen' }).click();
    await page.getByRole('dialog', { name: 'Hjælp' }).waitFor({ state: 'detached', timeout: 5000 });
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.getByRole('button', { name: 'Få hjælp', exact: true }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'Få hjælp', exact: true }).click();
    await page.getByRole('dialog', { name: 'Hjælp' }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Panelet skal ligge i nederste højre hjørne af vinduet. Ligger det
    // et andet sted, er det blevet fanget inde i opgavekortet igen.
    const box = await page.evaluate(() => {
      const r = document.querySelector('[role="dialog"][aria-label="Hjælp"]').getBoundingClientRect();
      return { right: Math.round(window.innerWidth - r.right), bottom: Math.round(window.innerHeight - r.bottom), height: Math.round(r.height) };
    });
    if (box.right > 40 || box.bottom > 40) {
      throw new Error(`hjælpepanelet sidder ${box.right}px fra højre og ${box.bottom}px fra bunden - det er ikke forankret til vinduet`);
    }
    if (box.height < 500) throw new Error(`hjælpepanelet er kun ${box.height}px højt på en stor skærm`);
    // Opgaven skal stadig kunne læses ved siden af - derfor ingen modal.
    await page.getByText(/Løs ligningen/).first().waitFor({ timeout: 5000 });
    // Og den må ikke ligge under panelet. Indholdet rykker til side
    // mens panelet er åbent; gør det ikke det, forsvinder hintet ind
    // under panelets venstre kant.
    const clear = await page.evaluate(() => {
      // Kortet, ikke <main>: main beholder sin bredde og skubber
      // indholdet ind med padding, så dens egen kasse flytter sig ikke.
      const card = document.querySelector('article.card');
      const panel = document.querySelector('[role="dialog"][aria-label="Hjælp"]');
      if (!card || !panel) return null;
      return Math.round(panel.getBoundingClientRect().left - card.getBoundingClientRect().right);
    });
    if (clear === null) throw new Error('fandt ikke både opgavekort og panel');
    if (clear < 0) throw new Error(`opgavekortet ligger ${-clear}px ind under hjælpepanelet`);
  });
  await shot('18-ai-desktop');
  await page.setViewportSize({ width: 420, height: 900 });

  await step('computerlayout: sidemenu, glidende markør, lys i kanten og rundvisning', async () => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto('http://127.0.0.1:4173/');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Dagens Missioner').waitFor({ timeout: 8000 });

    // Sidemenuen fra 1024px, bundmenuen under.
    const shell = await page.evaluate(() => ({
      side: document.querySelector('aside[aria-label="Sidemenu"]')?.getBoundingClientRect().width ?? 0,
      bottom: [...document.querySelectorAll('nav[aria-label="Hovedmenu"]')].filter((n) => n.closest('aside') === null)
        .map((n) => n.getBoundingClientRect().height)[0] ?? 0,
    }));
    if (shell.side < 200) throw new Error(`sidemenuen vises ikke på en stor skærm (${shell.side}px)`);
    if (shell.bottom > 0) throw new Error('bundmenuen vises stadig på en stor skærm');
    await checkFormulas('forsiden på computer', 5);
    await shot('27-computer-forside');

    // Fanemarkøren glider hen til den fane man trykker på.
    const pill = () =>
      page.evaluate(() => {
        const list = document.querySelector('main [role="tablist"]');
        const p = list?.querySelector('span[aria-hidden]');
        return p ? getComputedStyle(p).transform : null;
      });
    const before = await pill();
    await page.getByRole('tab', { name: /Repetition/ }).click();
    await page.waitForTimeout(450);
    const after = await pill();
    if (!before || before === after) throw new Error(`fanemarkøren flytter sig ikke (${before} -> ${after})`);

    // Lyset i kanten: tændt når musen er over et kort, væk under "Mindre bevægelse".
    const card = page.locator('main .card-interactive').first();
    await card.hover();
    await page.waitForTimeout(350);
    const lit = await card.evaluate((el) => {
      const b = getComputedStyle(el, '::before');
      return { opacity: b.opacity, bg: b.backgroundImage, x: el.style.getPropertyValue('--x') };
    });
    if (Number(lit.opacity) < 0.9 || !lit.bg.includes('radial-gradient')) {
      throw new Error(`lyset i kanten tænder ikke ved hover (${lit.opacity})`);
    }
    if (!lit.x) throw new Error('lyset følger ikke musen (--x er ikke sat)');

    await page.evaluate(() => document.documentElement.classList.add('calm'));
    const calm = await card.evaluate((el) => getComputedStyle(el, '::before').display);
    await page.evaluate(() => document.documentElement.classList.remove('calm'));
    if (calm !== 'none') throw new Error('lyset i kanten er der stadig under "Mindre bevægelse"');

    // Rundvisningen i computerlayoutet: kortet står ved siden af
    // sidemenuens punkter, ikke oven på dem.
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByRole('button', { name: 'Vis den igen' }).click();
    await walkTour();
    await page.getByText('Dagens Missioner').waitFor({ timeout: 8000 });

    // Det ternede papir hører til overskrifter - aldrig inde i en opgave.
    if (!(await page.locator('main .paper-head').count())) throw new Error('det ternede papir mangler bag overskriften');
    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.locator('main article.card').first().waitFor({ timeout: 8000 });
    const inside = await page.evaluate(() => document.querySelectorAll('article .paper-head, figure .paper-head').length);
    if (inside > 0) throw new Error('det ternede papir ligger inde i en opgave');
    // Fokus i en lektion skjuler kun telefonens menuer; sidemenuen bliver.
    const side = await page.evaluate(() => document.querySelector('aside[aria-label="Sidemenu"]')?.getBoundingClientRect().width ?? 0);
    if (side < 200) throw new Error('sidemenuen forsvinder i en lektion på en computer');
    await shot('40-fokus-computer');
    if (await page.getByRole('group', { name: 'Ekstra taster' }).count()) {
      throw new Error('tastrækken vises på en computer med mus');
    }

    await page.setViewportSize({ width: 420, height: 900 });
  });

  await step('prøvetræning i mørkt tema', async () => {
    await page.goto('http://127.0.0.1:4173/#/proeve');
    await page.getByRole('heading', { name: 'Prøvetræning' }).waitFor({ timeout: 8000 });
  });
  await shot('17-proeve-moerk');

  await step('første dag: ingen vægge af nuller', async () => {
    const fresh = await browser.newContext({ viewport: { width: 420, height: 900 } });
    // Profilen skal ligge klar før appen starter, ellers når den at gemme
    // en tom profil oven i den.
    await fresh.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      localStorage.setItem(
        'matematik-ai:profile',
        JSON.stringify({ name: 'Ny', onboarded: true, diagnosticDone: true, tourDone: true, createdAt: Date.now() }),
      );
      sessionStorage.setItem('seeded', '1');
    });
    const p = await fresh.newPage();
    p.on('pageerror', (e) => errors.push(`pageerror (første dag): ${e.message}`));
    try {
      for (const [w, h] of [[420, 900], [1280, 860]]) {
        await p.setViewportSize({ width: w, height: h });
        await p.goto('http://127.0.0.1:4173/#/profil');
        await p.reload({ waitUntil: 'networkidle' });
        await p.getByText('Din profil fyldes ud når du går i gang').waitFor({ timeout: 8000 });
        const profile = await p.evaluate(() => document.querySelector('main').innerText);
        if (/\b0 %/.test(profile)) throw new Error(`profilen viser 0 % ved ${w}px`);
        await p.getByRole('button', { name: /Start dagens mission/ }).waitFor({ timeout: 3000 });
        await p.waitForTimeout(600);
        await p.screenshot({ path: `/tmp/claude-0/shot-29-foerste-dag-profil-${w}.png` });
        shots.push(`/tmp/claude-0/shot-29-foerste-dag-profil-${w}.png`);

        await p.goto('http://127.0.0.1:4173/#/');
        await p.getByText('Dagens Missioner').waitFor({ timeout: 8000 });
        const home = await p.evaluate(() => document.querySelector('main').innerText);
        if (/0\/\d+ mestret/.test(home)) throw new Error(`forsiden viser "0/… mestret" ved ${w}px`);
        const notStarted = await p.getByText('Ikke startet', { exact: true }).count();
        if (notStarted < 4) throw new Error(`kun ${notStarted} kompetenceområder står som ikke startet`);

        await p.goto('http://127.0.0.1:4173/#/bibliotek');
        await p.getByRole('heading', { name: 'Emner', exact: true }).waitFor({ timeout: 8000 });
        const lib = await p.getByText('Ikke startet', { exact: true }).count();
        if (lib < 21) throw new Error(`kun ${lib} emner står som ikke startet i Emner`);
      }
    } finally {
      await fresh.close();
    }
  });

  await step('profilen viser de sidste 14 dage', async () => {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      localStorage.setItem(
        'matematik-ai:profile',
        JSON.stringify({ name: 'Ida', onboarded: true, diagnosticDone: true, tourDone: true, createdAt: Date.now() }),
      );
      const attempts = [];
      const day = 24 * 60 * 60 * 1000;
      for (const [ago, n, right] of [[0, 9, 7], [1, 14, 11], [3, 6, 2], [4, 11, 10], [8, 4, 4], [12, 7, 5]]) {
        for (let i = 0; i < n; i++) {
          attempts.push({
            ts: Date.now() - ago * day - i * 60000, skillId: 'ligning-totrin', domainId: 'ligninger', generatorId: 'x',
            level: 2, correct: i < right, seconds: 30, hints: 0, tries: 1, phase: 'practice',
          });
        }
      }
      localStorage.setItem('matematik-ai:attempts', JSON.stringify(attempts));
      sessionStorage.setItem('seeded', '1');
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`pageerror (profil): ${e.message}`));
    try {
      for (const [w, h] of [[420, 900], [1280, 860]]) {
        await p.setViewportSize({ width: w, height: h });
        await p.goto('http://127.0.0.1:4173/#/profil');
        await p.reload({ waitUntil: 'networkidle' });
        const chart = p.getByRole('group', { name: 'Opgaver pr. dag' });
        await chart.waitFor({ timeout: 8000 });
        const bars = chart.getByRole('button');
        if ((await bars.count()) !== 14) throw new Error(`diagrammet har ${await bars.count()} søjler, ikke 14`);
        const caption = chart.locator('xpath=preceding-sibling::p[1]');
        if (!(await caption.innerText()).startsWith('I dag: 9 opgaver, 7 rigtige')) {
          throw new Error(`teksten over diagrammet siger "${await caption.innerText()}"`);
        }
        await bars.nth(12).click();
        await p.waitForTimeout(100);
        if (!(await caption.innerText()).startsWith('I går: 14 opgaver, 11 rigtige')) {
          throw new Error(`et tryk på gårsdagens søjle viser "${await caption.innerText()}"`);
        }
        await chart.scrollIntoViewIfNeeded();
        await p.waitForTimeout(700);
        await p.screenshot({ path: `/tmp/claude-0/shot-30-diagram-${w}.png` });
        shots.push(`/tmp/claude-0/shot-30-diagram-${w}.png`);
      }
    } finally {
      await ctx.close();
    }
  });

  await step('telefonens tastrække skriver minus i feltet', async () => {
    const touch = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      storageState: await page.context().storageState(),
    });
    const phone = await touch.newPage();
    phone.on('pageerror', (e) => errors.push(`pageerror (telefon): ${e.message}`));
    try {
      await phone.goto('http://127.0.0.1:4173/#/laer/ligning-totrin', { waitUntil: 'networkidle' });
      const field = phone.getByLabel('Dit svar');
      await field.waitFor({ timeout: 8000 });
      const keys = phone.getByRole('group', { name: 'Ekstra taster' });
      await keys.waitFor({ timeout: 5000 });
      await field.tap();
      await keys.getByRole('button', { name: 'Minus' }).tap();
      await phone.keyboard.type('7');
      const value = await field.inputValue();
      if (value !== '−7') throw new Error(`feltet indeholder "${value}", ikke "−7"`);
      const focused = await field.evaluate((el) => document.activeElement === el);
      if (!focused) throw new Error('feltet mistede fokus da tasten blev trykket - tastaturet ville lukke');
      await phone.screenshot({ path: '/tmp/claude-0/shot-28-tastraekke.png' });
      shots.push('/tmp/claude-0/shot-28-tastraekke.png');
    } finally {
      await touch.close();
    }
  });

  await step('forkert fortegn giver et præcist fingerpeg', async () => {
    await page.goto('http://127.0.0.1:4173/#/traen');
    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.reload({ waitUntil: 'networkidle' });
    const card = page.locator('main article.card').first();
    await card.waitFor({ timeout: 8000 });
    // Kun den synlige udgave af formlen; MathML-kopien til skærmlæsere står ved siden af.
    const prompt = (
      await card.locator('.prose-math').first().evaluate((el) => {
        const copy = el.cloneNode(true);
        copy.querySelectorAll('.katex-mathml').forEach((n) => n.remove());
        return copy.textContent ?? '';
      })
    ).replace(/[−–]/g, '-').replace(/\s+/g, '');
    let x = null;
    const eq = prompt.match(/(-?\d*)x([+-]\d+)?=(-?\d+)/);
    const story = prompt.match(/koster(\d+)krifastleje.*?plus(\d+)krpr\.time.*?betaler(\d+)kr/);
    if (eq) {
      const a = eq[1] === '' ? 1 : eq[1] === '-' ? -1 : Number(eq[1]);
      x = (Number(eq[3]) - Number(eq[2] ?? 0)) / a;
    } else if (story) {
      x = (Number(story[3]) - Number(story[1])) / Number(story[2]);
    }
    if (x === null) throw new Error(`kunne ikke læse opgaven: "${prompt}"`);
    const wrong = x === 0 ? '1' : String(-x).replace('.', ',');
    await page.evaluate(() => {
      window.__tones = 0;
      const create = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () {
        window.__tones += 1;
        return create.call(this);
      };
    });
    await page.getByLabel('Dit svar').fill(wrong);
    await page.getByRole('button', { name: 'Tjek svar' }).click();
    await page.getByText('Du skrev').waitFor({ timeout: 5000 });
    if ((await page.evaluate(() => window.__tones)) < 1) throw new Error('der kom ingen lyd ved et forkert svar');
    const fb = await page.locator('main').innerText();
    if (!fb.includes(`Du skrev ${wrong}.`)) throw new Error(`feedbacken gentager ikke svaret ${wrong}`);
    if (x !== 0 && !/fortegn/i.test(fb)) throw new Error(`fortegnsfejlen (${wrong} i stedet for ${x}) bliver ikke nævnt`);
  });
  await shot('31-fortegn');

  // Samme som settleWrong, men på en anden side end hovedsiden.
  async function settleWrongOn(p) {
    for (let t = 0; t < 2; t++) {
      if (await p.getByRole('button', { name: /^(Ny opgave|Næste opgave|Prøv en magen til)/ }).count()) return;
      const fields = p.locator('main article input:not([disabled])');
      const n = await fields.count();
      if (n) {
        for (let i = 0; i < n; i++) await fields.nth(i).fill('999999');
      } else {
        await p.locator('main [role="radio"], main [role="checkbox"]').nth(t).click();
      }
      await p.getByRole('button', { name: 'Tjek svar' }).click();
      await p.waitForTimeout(150);
    }
  }

  // Svarer forkert to gange, uanset opgavetype, så opgaven er afgjort.
  async function settleWrong() {
    for (let t = 0; t < 2; t++) {
      if (await page.getByRole('button', { name: /^(Ny opgave|Se runden|Næste opgave|Prøv en magen til)/ }).count()) return;
      const fields = page.locator('main article input:not([disabled])');
      const n = await fields.count();
      if (n) {
        for (let i = 0; i < n; i++) await fields.nth(i).fill('999999');
      } else if (await page.locator('main [role="radio"]').count()) {
        await page.locator('main [role="radio"]').first().click();
      } else {
        await page.locator('main [role="checkbox"]').nth(t).click();
      }
      await page.getByRole('button', { name: 'Tjek svar' }).click();
      await page.waitForTimeout(120);
    }
  }

  await step('lyden kan slås fra', async () => {
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    const toggle = page.getByRole('switch', { name: 'Lyde' });
    await toggle.waitFor({ timeout: 5000 });
    if ((await toggle.getAttribute('aria-checked')) !== 'true') throw new Error('lyden er ikke slået til fra start');
    await toggle.click();
    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('main article.card').first().waitFor({ timeout: 8000 });
    await page.evaluate(() => {
      window.__tones = 0;
      const create = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () {
        window.__tones += 1;
        return create.call(this);
      };
    });
    await settleWrong();
    if ((await page.evaluate(() => window.__tones)) > 0) throw new Error('der spiller lyd selvom den er slået fra');
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByRole('switch', { name: 'Lyde' }).click();
  });

  await step('en runde fri træning slutter med en opsamling', async () => {
    await page.goto('http://127.0.0.1:4173/#/bibliotek/broeker');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Træn 10 opgaver' }).click();
    await page.getByRole('dialog', { name: 'Træn 10 opgaver' }).getByRole('button').nth(1).click();
    for (let i = 0; i < 10; i++) {
      await page.locator('main article.card').first().waitFor({ timeout: 5000 });
      await settleWrong();
      const next = page.getByRole('button', { name: i === 9 ? 'Se runden' : 'Ny opgave' });
      await next.waitFor({ timeout: 5000 });
      await next.click();
      // Vent til den nye opgave står klar, ellers svarer testen på den gamle.
      if (i < 9) await next.waitFor({ state: 'detached', timeout: 5000 });
    }
    await page.getByRole('heading', { name: 'Runden er færdig' }).waitFor({ timeout: 5000 });
    const text = await page.locator('main').innerText();
    if (!/\b(10|[0-9])\/10\b/.test(text)) throw new Error('opsamlingen viser ikke rigtige ud af 10');
    await page.getByText('Næste skridt').waitFor({ timeout: 3000 });
  });
  await shot('32-runde-slut');

  await step('efter runden kommer man tilbage til emnet', async () => {
    await page.getByRole('button', { name: 'Tilbage til brøker' }).click();
    await page.getByRole('heading', { name: 'Brøker', exact: true }).waitFor({ timeout: 5000 });
  });

  await step('Stop for nu i en lektion viser hvad man nåede', async () => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('main article.card').first().waitFor({ timeout: 8000 });
    // Uden svar er der intet at samle op på: krydset går tilbage til emnet.
    await page.getByRole('button', { name: 'Stop for nu' }).click();
    await page.getByRole('heading', { name: 'Ligninger', exact: true }).waitFor({ timeout: 5000 });
    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.locator('main article.card').first().waitFor({ timeout: 8000 });
    await settleWrong();
    await page.getByRole('button', { name: 'Stop for nu' }).click();
    await page.getByRole('heading', { name: 'Stop for nu' }).waitFor({ timeout: 5000 });
    await page.getByText(/Næste gang fortsætter du herfra/).waitFor({ timeout: 3000 });
    await shot('33-stop-for-nu');
    await page.getByRole('button', { name: 'Fortsæt alligevel' }).click();
    await page.locator('main article.card').first().waitFor({ timeout: 5000 });
    await page.setViewportSize({ width: 420, height: 900 });
  });

  await step('lektionen sparer tid: opvarmning, test, huller og en magen til', async () => {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      const day = 24 * 60 * 60 * 1000;
      localStorage.setItem(
        'matematik-ai:profile',
        JSON.stringify({
          name: 'Liv', onboarded: true, diagnosticDone: true, tourDone: true, createdAt: Date.now(),
          diagnostic: { ligninger: 84 }, easyTopics: ['broeker'], hardTopics: [], recommended: [],
        }),
      );
      const base = {
        pKnown: 0.4, ability: 2, attempts: 3, correct: 2, streak: 0, bestStreak: 1, phase: 'guided', phaseProgress: 0,
        lastSeen: Date.now(), masteredAt: null, interval: 0, ease: 2.5, due: null, reviews: 0, lapses: 0,
        avgSeconds: 30, hintsUsed: 0, cleanStreak: 0,
      };
      localStorage.setItem('matematik-ai:skills', JSON.stringify({
        // Mestret for fem dage siden og nu ved at blive glemt.
        'ligning-ettrin': { ...base, skillId: 'ligning-ettrin', phase: 'mastery', pKnown: 0.95, ability: 1.4,
          masteredAt: Date.now() - 6 * day, lastSeen: Date.now() - 5 * day, interval: 2, due: Date.now() - day },
        'ligning-totrin': { ...base, skillId: 'ligning-totrin' },
      }));
      sessionStorage.setItem('seeded', '1');
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`pageerror (undervisning): ${e.message}`));
    const bar = p.locator('[data-focusbar]');
    try {
      // Opvarmning i det den nye færdighed bygger på.
      await p.goto('http://127.0.0.1:4173/#/laer/ligning-totrin', { waitUntil: 'networkidle' });
      await p.getByText('Opvarmning.', { exact: true }).waitFor({ timeout: 8000 });
      await p.screenshot({ path: '/tmp/claude-0/shot-43-opvarmning.png' });
      shots.push('/tmp/claude-0/shot-43-opvarmning.png');
      const prompt = (await p.locator('main article .prose-math').first().evaluate((el) => {
        const copy = el.cloneNode(true);
        copy.querySelectorAll('.katex-mathml').forEach((n) => n.remove());
        return copy.textContent ?? '';
      })).replace(/[−–]/g, '-').replace(/\s+/g, '');
      const m = prompt.match(/x([+-]\d+)=(-?\d+)/);
      if (!m) throw new Error(`opvarmningen er ikke en ligning i ét trin: "${prompt}"`);
      await p.getByLabel('Dit svar').fill(String(Number(m[2]) - Number(m[1])));
      await p.getByRole('button', { name: 'Tjek svar' }).click();
      await p.getByRole('button', { name: /^Videre til ligninger i to trin/ }).click();
      await bar.getByText('Trin 3 af 7').waitFor({ timeout: 5000 });
      const review = await p.evaluate(() => JSON.parse(localStorage.getItem('matematik-ai:skills'))['ligning-ettrin']);
      if (!(review.due > Date.now())) throw new Error('opvarmningen tæller ikke som repetition');

      // Forklaringen kan læses igen uden at man mister sin plads.
      await p.getByRole('button', { name: 'Læs forklaringen igen' }).click();
      await p.getByRole('dialog', { name: 'Ligninger i to trin' }).waitFor({ timeout: 5000 });
      await p.keyboard.press('Escape');
      await bar.getByText('Trin 3 af 7').waitFor({ timeout: 5000 });

      // En tabt opgave følges af en magen til.
      await settleWrongOn(p);
      await p.getByRole('button', { name: 'Prøv en magen til' }).click();
      await p.locator('main article.card').first().waitFor({ timeout: 5000 });

      // Et emne eleven kalder nemt: testen tilbydes i stedet for forklaringen.
      await p.goto('http://127.0.0.1:4173/#/laer/broek-forstaa');
      await p.getByRole('button', { name: 'Tag testen' }).click();
      await bar.getByText('Trin 7 af 7').waitFor({ timeout: 5000 });
      await p.getByText(/Tre opgaver i første hug/).waitFor({ timeout: 3000 });
      await p.screenshot({ path: '/tmp/claude-0/shot-44-test.png' });
      shots.push('/tmp/claude-0/shot-44-test.png');

      // Et hul: færdigheden bygger på noget eleven ikke har på plads.
      await p.goto('http://127.0.0.1:4173/#/laer/broek-plusminus');
      await p.getByText('Den her bygger på noget du ikke er færdig med').waitFor({ timeout: 8000 });
      await p.getByRole('button', { name: /^Tag .* først$/ }).click();
      await p.waitForURL(/#\/laer\/broek-forkort$/, { timeout: 5000 });
    } finally {
      await ctx.close();
    }
  });

  await step('et rigtigt svar der gør en fase færdig, viser svaret og går videre', async () => {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      localStorage.setItem('matematik-ai:profile', JSON.stringify({ name: 'Bo', onboarded: true, diagnosticDone: true, tourDone: true, createdAt: Date.now() }));
      localStorage.setItem('matematik-ai:skills', JSON.stringify({ 'ligning-ettrin': {
        skillId: 'ligning-ettrin', pKnown: 0.4, ability: 1.5, attempts: 1, correct: 1, streak: 1, bestStreak: 1, phase: 'guided',
        phaseProgress: 1, lastSeen: Date.now(), masteredAt: null, interval: 0, ease: 2.5, due: null, reviews: 0, lapses: 0,
        avgSeconds: 30, hintsUsed: 0, cleanStreak: 1,
      } }));
      sessionStorage.setItem('seeded', '1');
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`pageerror (fase): ${e.message}`));
    try {
      await p.goto('http://127.0.0.1:4173/#/laer/ligning-ettrin', { waitUntil: 'networkidle' });
      const card = p.locator('main article.card').first();
      await card.waitFor({ timeout: 8000 });
      const prompt = (await card.locator('.prose-math').first().evaluate((el) => {
        const copy = el.cloneNode(true);
        copy.querySelectorAll('.katex-mathml').forEach((n) => n.remove());
        return copy.textContent ?? '';
      })).replace(/[−–]/g, '-').replace(/\s+/g, '');
      const m = prompt.match(/x([+-]\d+)=(-?\d+)/);
      if (!m) throw new Error(`kunne ikke læse opgaven: "${prompt}"`);
      await p.getByLabel('Dit svar').fill(`x = ${Number(m[2]) - Number(m[1])}`);
      await p.getByRole('button', { name: 'Tjek svar' }).click();
      await p.getByRole('button', { name: 'Næste opgave' }).waitFor({ timeout: 5000 });
      await p.getByText(/Videre til trin 4 af 7/).waitFor({ timeout: 3000 });
      await p.locator('[data-focusbar]').getByText('Trin 4 af 7').waitFor({ timeout: 3000 });
    } finally {
      await ctx.close();
    }
  });

  await step('teksten har kontrast nok i begge temaer', async () => {
    await page.setViewportSize({ width: 1280, height: 860 });
    const found = [];
    for (const theme of ['Mørkt', 'Lyst']) {
      await page.goto('http://127.0.0.1:4173/#/indstillinger');
      await page.getByRole('tab', { name: theme }).click();
      for (const route of ['#/', '#/bibliotek', '#/bibliotek/ligninger', '#/laer/ligning-totrin', '#/traen/broek-forkort', '#/proeve', '#/profil', '#/indstillinger']) {
        await page.goto(`http://127.0.0.1:4173/${route}`);
        await page.waitForTimeout(900);
        for (const f of await lowContrast()) found.push(`${theme} ${route}: ${f}`);
      }
    }
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByRole('tab', { name: 'Mørkt' }).click();
    await page.setViewportSize({ width: 420, height: 900 });
    if (found.length) throw new Error(`${found.length} tekster med for lav kontrast:\n    ${[...new Set(found)].slice(0, 40).join('\n    ')}`);
  });

  await step('tastaturet: spring til indhold, synligt fokus og fokus tilbage', async () => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto('http://127.0.0.1:4173/#/');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Dagens Missioner').waitFor({ timeout: 8000 });

    await page.keyboard.press('Tab');
    const skip = await page.evaluate(() => {
      const el = document.activeElement;
      return { text: el?.textContent?.trim(), visible: el ? el.getBoundingClientRect().width > 20 : false };
    });
    if (skip.text !== 'Gå til indhold' || !skip.visible) throw new Error(`første tab rammer ikke et synligt "Gå til indhold" (${JSON.stringify(skip)})`);
    await page.keyboard.press('Enter');
    if ((await page.evaluate(() => document.activeElement?.id)) !== 'indhold') throw new Error('"Gå til indhold" flytter ikke fokus til indholdet');
    if (!/#\/$/.test(page.url())) throw new Error(`"Gå til indhold" skiftede side (${page.url()})`);

    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.locator('main article.card').first().waitFor({ timeout: 8000 });

    const help = page.getByRole('button', { name: 'Få hjælp', exact: true });
    // Fokus flyttes med tastaturet, så browseren ved at den skal vises.
    // Svarfeltet tager selv fokus lidt efter at siden er åbnet; det
    // skal være sket først.
    await page.waitForTimeout(400);
    await page.getByLabel('Dit svar').or(page.locator('main [role="radio"]').first()).first().focus();
    let reached = false;
    for (let i = 0; i < 30 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = (await page.evaluate(() => document.activeElement?.textContent?.trim())) === 'Få hjælp';
    }
    if (!reached) throw new Error('"Få hjælp" kan ikke nås med tabulatortasten');
    // Knapper animerer deres kant på 150 ms; mål efter den er færdig.
    await page.waitForTimeout(250);
    const ring = await help.evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
    if (ring.style === 'none' || ring.width === '0px') throw new Error('knappen viser ikke hvor fokus er');
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: 'Hjælp' }).waitFor({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Hjælp' }).waitFor({ state: 'detached', timeout: 5000 });
    const back = await page.evaluate(() => document.activeElement?.textContent?.trim());
    if (back !== 'Få hjælp') throw new Error(`fokus kommer ikke tilbage til knappen efter panelet lukker (${back})`);

    const math = await page.locator('main .prose-math .katex-mathml math').count();
    if (!math) throw new Error('formlerne har ingen MathML til skærmlæsere');
    await page.setViewportSize({ width: 420, height: 900 });
  });

  await step('kan installeres og virker uden net', async () => {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`pageerror (offline): ${e.message}`));
    try {
      await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
      const manifest = await p.evaluate(async () => {
        const link = document.querySelector('link[rel="manifest"]');
        if (!link) return null;
        const m = await (await fetch(link.href)).json();
        const icons = await Promise.all(m.icons.map((i) => fetch(new URL(i.src, link.href)).then((r) => r.ok)));
        return { name: m.name, display: m.display, icons: icons.filter(Boolean).length, maskable: m.icons.some((i) => i.purpose === 'maskable') };
      });
      if (!manifest) throw new Error('siden linker ikke til et manifest');
      if (manifest.display !== 'standalone' || manifest.icons < 3 || !manifest.maskable) {
        throw new Error(`manifestet er ikke klar til installation (${JSON.stringify(manifest)})`);
      }
      await p.evaluate(() => navigator.serviceWorker.ready);
      await p.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 10000 });

      await ctx.setOffline(true);
      await p.reload({ waitUntil: 'domcontentloaded' });
      await p.getByRole('heading', { name: 'MatematikAI' }).waitFor({ timeout: 10000 });
      await p.screenshot({ path: '/tmp/claude-0/shot-36-offline.png' });
      shots.push('/tmp/claude-0/shot-36-offline.png');
    } finally {
      await ctx.setOffline(false);
      await ctx.close();
    }
  });

  await step('husker fremgangen efter genindlæsning', async () => {
    await page.goto('http://127.0.0.1:4173/');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Freja', exact: true }).waitFor({ timeout: 8000 });
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
