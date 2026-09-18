import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, AREAS, CATEGORIES, DOMAINS, aidsOf, matchesAids } from './index';
import type { CategoryId } from '../types';

describe('dækning af Fælles Mål', () => {
  it('har alle fire kompetenceområder', () => {
    const ids = CATEGORIES.map((c) => c.id).sort();
    expect(ids).toEqual(['geometri-maaling', 'kompetencer', 'statistik-sandsynlighed', 'tal-algebra']);
  });

  it('placerer hvert emne i et gyldigt kompetenceområde og område', () => {
    const cats = new Set(CATEGORIES.map((c) => c.id));
    const areas = new Map(AREAS.map((a) => [a.id, a.category]));
    for (const d of DOMAINS) {
      expect(cats.has(d.category), `${d.id} har ukendt kompetenceområde`).toBe(true);
      expect(areas.has(d.area), `${d.id} har ukendt fagområde`).toBe(true);
      // Emnets område skal høre under emnets kompetenceområde.
      expect(areas.get(d.area), `${d.id}: område og kompetenceområde passer ikke sammen`).toBe(d.category);
    }
  });

  it('dækker de fagområder FP9 rent faktisk prøver i', () => {
    // Kompetenceområderne kommunikation, ræsonnement, repræsentation og
    // hjælpemidler trænes tværgående i alle opgaver frem for som egne
    // emner. Resten skal have mindst ét emne.
    const tvaergaaende = new Set(['kommunikation', 'raesonnement', 'repraesentation', 'hjaelpemidler']);
    const covered = new Set(DOMAINS.map((d) => d.area));
    for (const area of AREAS) {
      if (tvaergaaende.has(area.id)) continue;
      expect(covered.has(area.id), `ingen emner under "${area.name}"`).toBe(true);
    }
  });

  it('har indhold i alle fire kompetenceområder', () => {
    for (const cat of CATEGORIES) {
      const n = DOMAINS.filter((d) => d.category === (cat.id as CategoryId)).length;
      expect(n, `${cat.name} er tomt`).toBeGreaterThan(0);
    }
  });
});

describe('FP9: med og uden hjælpemidler', () => {
  it('mærker hver færdighed med en gyldig prøvedel', () => {
    for (const skill of ALL_SKILLS) {
      expect(['uden', 'med', 'begge']).toContain(aidsOf(skill));
    }
  });

  it('har rigeligt at træne til prøven uden hjælpemidler', () => {
    const uden = ALL_SKILLS.flatMap((s) => s.generators.filter((g) => matchesAids(s, g, 'uden')));
    expect(uden.length).toBeGreaterThan(100);
  });

  it('holder opgaver der kræver lommeregner ude af prøven uden hjælpemidler', () => {
    const calculatorSkills = ['trig-find-side', 'trig-find-vinkel', 'procent-vaekstfaktor', 'areal-cirkel'];
    for (const id of calculatorSkills) {
      const skill = ALL_SKILLS.find((s) => s.id === id);
      expect(skill, `${id} findes ikke`).toBeDefined();
      expect(aidsOf(skill!), `${id} burde kræve hjælpemidler`).toBe('med');
      for (const g of skill!.generators) {
        expect(matchesAids(skill!, g, 'uden'), `${id}/${g.id} kom med i prøven uden hjælpemidler`).toBe(false);
      }
    }
  });

  it('har begge prøvedele repræsenteret i hvert kompetenceområde med fagligt indhold', () => {
    for (const cat of CATEGORIES.filter((c) => c.id !== 'kompetencer')) {
      const skills = ALL_SKILLS.filter((s) => DOMAINS.find((d) => d.id === s.domainId)?.category === cat.id);
      const uden = skills.filter((s) => s.generators.some((g) => matchesAids(s, g, 'uden')));
      expect(uden.length, `${cat.name} har intet til prøven uden hjælpemidler`).toBeGreaterThan(0);
    }
  });
});

describe('pensummets omfang', () => {
  it('rapporterer sit omfang', () => {
    const generators = ALL_SKILLS.reduce((n, s) => n + s.generators.length, 0);
    const uden = ALL_SKILLS.flatMap((s) => s.generators.filter((g) => matchesAids(s, g, 'uden'))).length;
    // eslint-disable-next-line no-console
    console.log(
      `Emner: ${DOMAINS.length} | Færdigheder: ${ALL_SKILLS.length} | Generatorer: ${generators} ` +
        `(${uden} uden hjælpemidler, ${generators - uden} kun med)`,
    );
    expect(DOMAINS.length).toBeGreaterThanOrEqual(21);
    expect(ALL_SKILLS.length).toBeGreaterThan(60);
    expect(generators).toBeGreaterThan(100);
  });
});
