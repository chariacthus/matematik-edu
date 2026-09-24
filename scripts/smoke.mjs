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

const step = async (name, fn) => {
  process.stdout.write(`  ${name} … `);
  try { await fn(); console.log('ok'); }
  catch (e) { console.log('FEJL'); errors.push(`${name}: ${e.message}`); throw e; }
};

const shots = [];
const shot = async (name) => {
  // Lad indtoninger og forsinkede liste-animationer falde til ro, ellers
  // fanger billedet en halvgennemsigtig side.
  await page.waitForTimeout(700);
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
  if (spotlights < 6) throw new Error(`kun ${spotlights} trin i rundvisningen markerer noget på skærmen`);
}

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
    await shot('25-selvvurdering');
    await page.getByRole('button', { name: /^Videre$/ }).click();
    await page.getByRole('button', { name: 'Brøker', exact: true }).click();
    await shot('26-emnevalg');
    await page.getByRole('button', { name: /^Videre \(1 valgt\)$/ }).click();
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

  await step('åbner AI-læreren som flydende panel og beder om svaret', async () => {
    await page.getByRole('button', { name: 'AI-lærer', exact: true }).click();
    const dock = page.getByRole('dialog', { name: 'AI-lærer' });
    await dock.waitFor({ timeout: 5000 });
    // Panelet må ikke dække hele skærmen på desktopbredde, men her er
    // vi på telefon, hvor det er et ark. Vi kontrollerer bare at det
    // ikke er den gamle modal ved at se efter panelets egen overskrift.
    await dock.getByText('Ligninger i to trin').waitFor({ timeout: 5000 });
    await page.getByLabel('Besked til AI-læreren').fill('hvad er svaret?');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByText(/lærer ingenting af at få tallet/).waitFor({ timeout: 5000 });
  });
  await shot('08-ai-laerer');

  await step('viser fri træning', async () => {
    await page.getByRole('button', { name: 'Luk AI-lærer' }).click();
    await page.goto('http://127.0.0.1:4173/#/traen');
    await page.getByRole('heading', { name: 'Fri træning' }).waitFor({ timeout: 8000 });
    await shot('24-traen');

    // Emne -> færdigheder -> tilbage. Før var hver færdighed en lille
    // pille i én lang væg; nu vælger man emne først.
    await page.getByRole('button', { name: /^Brøker:/ }).click();
    const back = page.getByRole('button', { name: 'Alle emner' });
    await back.waitFor({ timeout: 5000 });
    const rows = await page.locator('main button.card-interactive').count();
    if (rows < 3) throw new Error(`emnet viser kun ${rows} færdigheder`);
    await back.click();
    await page.getByRole('button', { name: /^Brøker:/ }).waitFor({ timeout: 5000 });
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
    await page.goto('http://127.0.0.1:4173/#/proeve');
    await page.getByRole('heading', { name: 'Prøvetræning' }).waitFor({ timeout: 8000 });
    await page.getByRole('heading', { name: 'Uden hjælpemidler' }).waitFor({ timeout: 5000 });
  });
  await shot('11-proeve');

  await step('kører en prøve uden hjælpemidler', async () => {
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.getByText(/Opgave 1 af 20/).waitFor({ timeout: 8000 });
    // Uret skal blive stående øverst når man ruller ned i en opgave. En
    // lav skærm sikrer at der faktisk er noget at rulle - ellers ville
    // tjekket bestå uden at bevise noget.
    await page.setViewportSize({ width: 420, height: 480 });
    await page.mouse.move(200, 300);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    const pos = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      top: Math.round(document.querySelector('[role="timer"]').getBoundingClientRect().top),
    }));
    if (pos.y < 50) throw new Error(`siden rullede ikke (scrollY ${pos.y}) - tjekket beviser intet`);
    if (pos.top < 0 || pos.top > 140) throw new Error(`uret er rullet ud af syne (top ${pos.top}px)`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize({ width: 420, height: 900 });
    // Formelsamlingen hører til prøven MED hjælpemidler. Slipper den ind
    // her, tester prøven ikke længere det den skal.
    if (await page.getByRole('button', { name: 'Formelsamling' }).count()) {
      throw new Error('formelsamlingen er tilgængelig i prøven uden hjælpemidler');
    }
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Spring over' }).click();
      await page.waitForTimeout(120);
    }
    await page.getByRole('button', { name: 'Aflevér prøven' }).click();
    await page.getByRole('heading', { name: /Prøven er afleveret/ }).waitFor({ timeout: 8000 });
  });
  await shot('12-proeveresultat');

  await step('giver formelsamling i prøven med hjælpemidler', async () => {
    // Prøven står på resultatskærmen. En hash-navigation genindlæser
    // ikke siden, så her skal der en rigtig reload til.
    await page.goto('http://127.0.0.1:4173/#/proeve');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Prøvetræning' }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'Start' }).nth(1).click();
    await page.getByText(/Opgave 1 af 12/).waitFor({ timeout: 8000 });
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

  await step('viser prisen på AI-læreren i indstillinger', async () => {
    await page.goto('http://127.0.0.1:4173/#/indstillinger');
    await page.getByText(/Den indbyggede AI-lærer er gratis/).waitFor({ timeout: 8000 });
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

  await step('AI-panelet i mørkt tema', async () => {
    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.getByRole('button', { name: 'AI-lærer', exact: true }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'AI-lærer', exact: true }).click();
    await page.getByRole('dialog', { name: 'AI-lærer' }).waitFor({ timeout: 5000 });
    await page.getByLabel('Besked til AI-læreren').fill('jeg forstår det ikke');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.waitForTimeout(700);

    // Panelet skal fylde det meste af højden på en telefon, og elevens
    // egen besked skal være synlig. Ellers er samtalen ubrugelig.
    const box = await page.evaluate(() => {
      const el = document.querySelector('[role="dialog"][aria-label="AI-lærer"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width), vh: window.innerHeight };
    });
    if (!box) throw new Error('AI-panelet blev ikke fundet');
    if (box.height < box.vh * 0.5) {
      throw new Error(`AI-panelet er kun ${box.height}px højt af ${box.vh}px - beskeder får ikke plads`);
    }
    await page.getByText('jeg forstår det ikke').waitFor({ timeout: 5000 });
  });
  await shot('16-ai-moerk');

  await step('AI-panelet svæver i hjørnet på en stor skærm', async () => {
    // Luk panelet fra forrige trin. En hash-navigation genindlæser ikke
    // siden, så det ville ellers stå og dække knappen.
    await page.getByRole('button', { name: 'Luk AI-lærer' }).click();
    await page.getByRole('dialog', { name: 'AI-lærer' }).waitFor({ state: 'detached', timeout: 5000 });
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.getByRole('button', { name: 'AI-lærer', exact: true }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'AI-lærer', exact: true }).click();
    await page.getByRole('dialog', { name: 'AI-lærer' }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Panelet skal ligge i nederste højre hjørne af vinduet. Ligger det
    // et andet sted, er det blevet fanget inde i opgavekortet igen.
    const box = await page.evaluate(() => {
      const r = document.querySelector('[role="dialog"][aria-label="AI-lærer"]').getBoundingClientRect();
      return { right: Math.round(window.innerWidth - r.right), bottom: Math.round(window.innerHeight - r.bottom), height: Math.round(r.height) };
    });
    if (box.right > 40 || box.bottom > 40) {
      throw new Error(`AI-panelet sidder ${box.right}px fra højre og ${box.bottom}px fra bunden - det er ikke forankret til vinduet`);
    }
    if (box.height < 500) throw new Error(`AI-panelet er kun ${box.height}px højt på en stor skærm`);
    // Opgaven skal stadig kunne læses ved siden af - derfor ingen modal.
    await page.getByText(/Løs ligningen/).first().waitFor({ timeout: 5000 });
    // Og den må ikke ligge under panelet. Indholdet rykker til side
    // mens panelet er åbent; gør det ikke det, forsvinder hintet ind
    // under panelets venstre kant.
    const clear = await page.evaluate(() => {
      // Kortet, ikke <main>: main beholder sin bredde og skubber
      // indholdet ind med padding, så dens egen kasse flytter sig ikke.
      const card = document.querySelector('article.card');
      const panel = document.querySelector('[role="dialog"][aria-label="AI-lærer"]');
      if (!card || !panel) return null;
      return Math.round(panel.getBoundingClientRect().left - card.getBoundingClientRect().right);
    });
    if (clear === null) throw new Error('fandt ikke både opgavekort og panel');
    if (clear < 0) throw new Error(`opgavekortet ligger ${-clear}px ind under AI-panelet`);
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
    await page.goto('http://127.0.0.1:4173/#/laer/ligning-totrin');
    await page.locator('main article.card').first().waitFor({ timeout: 8000 });
    const paper = await page.evaluate(() => ({
      total: document.querySelectorAll('.paper-head').length,
      inside: document.querySelectorAll('article .paper-head, figure .paper-head').length,
    }));
    if (paper.total === 0) throw new Error('det ternede papir mangler bag overskriften');
    if (paper.inside > 0) throw new Error('det ternede papir ligger inde i en opgave');

    await page.setViewportSize({ width: 420, height: 900 });
  });

  await step('prøvetræning i mørkt tema', async () => {
    await page.goto('http://127.0.0.1:4173/#/proeve');
    await page.getByRole('heading', { name: 'Prøvetræning' }).waitFor({ timeout: 8000 });
  });
  await shot('17-proeve-moerk');

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
