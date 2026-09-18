# MatematikAI

En adaptiv matematiktutor til 9. klasse. Appen tager en elev fra
begynderniveau til et højt niveau ved at tilpasse sig elevens niveau,
fejl, tempo og arbejdsvaner — ikke ved at give alle det samme materiale
i den samme rækkefølge.

Alt kører i browseren. Ingen server, ingen konto, ingen data der
forlader maskinen.

```bash
npm install
npm run dev      # udviklingsserver
npm test         # 261 tests
npm run build    # statisk build til dist/
```

## Hvad appen gør

**Niveautest først.** Eleven svarer på et par spørgsmål om sig selv og
tager derefter en diagnostisk test, der kører en lille sværhedstrappe
inden for hvert af de 19 emner. Resultatet er ikke én score, men en
profil: *Algebra 62 %, Brøker 38 %, Geometri 74 %* — og en anbefaling om
hvor man får mest ud af tiden. Testen kan afsluttes når som helst; de
emner der ikke nås, markeres som ikke-testede frem for at få et gættet
tal.

**Syv trin pr. emne.** Forklaring → gennemregnet eksempel → guidet
træning → selvstændig opgave → variation → udfordring → mestringstjek.
Fasen gemmes, så eleven kan lukke appen midt i et forløb og fortsætte
samme sted dagen efter. Variationsfasen trækker bevidst en *anden*
opgavetype inden for samme færdighed, så eleven ikke bare lærer én
opskrift der virker på én indpakning.

**Sværhedsgraden flytter sig.** Tre rene rigtige i træk hæver niveauet.
Under 45 % rigtige for nylig sænker det. Klarer eleven kun opgaverne ved
hjælp af hints, sænkes det også — det er ikke forståelse endnu. To fejl i
træk i samme fase sender eleven et trin tilbage, hvor der er mere støtte.

**Fejl bliver diagnosticeret, ikke bare talt.** Hver opgave kender de
typiske fejlsvar man kan give i netop den. Rammer eleven et af dem, får
hun at vide *hvorfor* det gik galt — "du lagde nævnerne sammen" — ikke
bare "forkert". Sker den samme fejl to gange, stopper progressionen og
en fejlklinik forklarer misforståelsen, før der gives flere opgaver.

**Repetition inden det glemmes.** Mestrede emner planlægges efter en
SM-2-inspireret model med en glemselskurve, så de dukker op igen lige
før de falder ud.

**AI-lærer der ikke giver svaret.** Spørger eleven "hvad er svaret?",
svarer tutoren med et modspørgsmål der peger på første skridt. Hjælpen
trappes op for hver gang eleven spørger igen, og først på fjerde trin
gennemgås hele løsningen — at holde eleven hen længere end det er
stædighed, ikke undervisning.

## Sådan hænger koden sammen

```
src/
  types/          Kernetyper. En opgave kender sit eget svar, sine hints,
                  sin trinvise løsning og de typiske fejl i den.
  lib/            Determinstisk RNG, eksakte brøker, dansk talformatering,
                  svarparsing og -kontrol, hash-router, localStorage.
  content/        Pensum: 19 emner, 66 færdigheder, 170 opgavegeneratorer
                  + kataloget over 57 typiske misforståelser.
  engine/         mastery (BKT + Elo) · adaptive (sværhed, faser) ·
                  srs (repetition) · diagnosis (fejlanalyse, adfærd) ·
                  planner (dagens plan) · diagnostic · gamification
  tutor/          Regelbaseret socratisk tutor + valgfri Claude-adapter
  components/     Matematikrendering, 15 SVG-visualiseringer, svarfelter,
                  opgavekort, UI-primitiver
  pages/          Onboarding · Niveautest · Forside · Lektion · Bibliotek ·
                  Træning · Repetition · Profil · Indstillinger
```

Den centrale beslutning er, at **en opgave er et selvforklarende
objekt**. Den bærer sit facit, sine hints i stigende orden, sin trinvise
løsning og sine kendte fejlsvar med sig. Det er dét, der gør både den
adaptive motor og AI-tutoren i stand til at arbejde uden et eneste
backend-kald — og det gør begge dele testbare.

### Den adaptive motor

Mestring modelleres med **Bayesian knowledge tracing**, men et rigtigt
svar tæller ikke altid lige meget:

- Hints hæver gættesandsynligheden. Et svar fundet efter tre hints —
  hvor det sidste næsten er facit — beviser mindre end et fundet selv.
- Multiple choice med få muligheder hæver den også.
- Et svar der kommer hurtigere end opgaven kan læses (under ca. tre
  sekunder) tæller *slet ikke* som bevis. Uden den regel kunne man
  klikke sig til "mestret".

Sideløbende føres en **Elo-agtig evnevurdering** på skalaen 1–5, som
afgør hvilket niveau opgaverne trækkes på. Elo passer her, fordi den
automatisk vægter overraskelser tungest: at klare en svær opgave rykker
meget, at klare en let rykker næsten ingenting.

### Test

```
npm test          # 261 tests
npm run smoke     # bygger og kører appen i en rigtig browser
```

Den vigtigste kontrol ligger i `src/content/content.test.ts`: den
sampler **hver generator på hvert niveau** og kræver at

- opgavens eget facit bliver godkendt af retteren,
- svarmuligheder aldrig er ens,
- en fælde aldrig rammer det rigtige svar.

Det fangede flere reelle regnefejl undervejs — blandt andet at
`20 + 4·5 − 21:3` giver det samme resultat med og uden regnehierarki, så
fælden for "regner fra venstre mod højre" ville have fortalt eleven at
et korrekt svar var en misforståelse.

`npm run smoke` kører hele elevrejsen igennem i Chromium: onboarding,
niveautest, forside, bibliotek, et lektionsforløb med forkert svar og
feedback, AI-læreren, mørkt tema og at fremgangen overlever en
genindlæsning. Det kræver en Chromium; scriptet leder selv efter en, og
`CHROMIUM_PATH` kan pege på en bestemt. Browsere hentes ikke ned ved
`npm install` (projektet bruger `playwright-core`).

## Retteren

Eleven skal ikke miste point på tastaturvaner, så retteren accepterer

- dansk komma og engelsk punktum (`3,14` og `3.14`),
- mellemrum, enheder og valuta (`125 kr`, `7,5 cm`, `20%`),
- ækvivalente brøker (`2/4` for `1/2`), medmindre opgaven beder om en
  forkortet brøk,
- algebraiske udtryk uanset ledrækkefølge: `2x + 3`, `3 + 2x` og
  `x + x + 3` tæller alle som samme svar.

Bevidst begrænsning: udtryk med parenteser, brøkstreger eller rodtegn
sammenlignes tegn for tegn efter normalisering. Generatoren angiver
derfor selv de gyldige former via `accept`.

## AI-lærer og Claude

Den indbyggede tutor er regelbaseret og kører uden netværk. Den bygger
udelukkende på opgavens egne hints, løsningstrin og kendte fejl, så den
ikke kan finde på matematik der ikke passer til opgaven.

Under **Indstillinger** kan man tilkoble Claude med sin egen API-nøgle.
Pædagogikken ligger i systemprompten — modellen får besked på ikke at
afsløre facit før hjælpetrin 4, og den får opgavens hints og
løsningstrin med. Nøglen gemmes kun i browseren og sendes kun til
Anthropics API. Fejler kaldet, svarer den indbyggede tutor i stedet, så
eleven aldrig står med en app der ikke svarer.

## Data og privatliv

Alt ligger i `localStorage` under nøglen `matematik-ai:*`. Der er ingen
server, ingen konto og ingen sporing. Under Indstillinger kan eleven
hente sine data som JSON, gendanne dem på en anden maskine eller slette
alt. Al kode, der læser fra storage, håndterer at det kan fejle — i
privat browsing virker appen stadig, den husker bare ikke mellem besøg.

## Pensum

19 emner, 66 færdigheder, 170 opgavegeneratorer:

**Tal & algebra** — tal og regning, brøker, decimaltal, procenter,
forhold og proportionalitet, potenser, kvadratrødder, algebra,
ligninger, uligheder

**Geometri** — geometri, areal og rumfang, trigonometri

**Funktioner** — koordinatsystem, funktioner

**Statistik & sandsynlighed** — statistik, sandsynlighed

**Anvendelse** — problemløsning, matematiske modeller

Generatorerne er parametriserede og deterministiske: hver opgave kan
genskabes 1:1 fra sit seed, hvilket både gør dem testbare og gør det
muligt at vende tilbage til præcis samme opgave.

## Tilgængelighed

Brugerfladen fungerer med tastatur, bruger rigtige roller på knapper,
dialoger og fremdriftsvisninger, og har synlig fokusmarkering. Figurer
har tekstalternativer. Lyst og mørkt tema følger systemet som standard.
`prefers-reduced-motion` respekteres. Layoutet er bygget til telefon
først.

## Kendte begrænsninger

- Udtrykssammenligning ganger ikke parenteser ud; se afsnittet om
  retteren.
- Diagnosen dækker 2 opgaver pr. emne. Det er et bevidst kompromis
  mellem præcision og hvor længe en 15-årig gider sidde med en test.
- `npm audit` melder to moderate sårbarheder i `@vitest/mocker`. De er
  begrænset til testafvikleren, som dette projekt ikke bruger mocking i,
  og de indgår ikke i produktionsbygget.
