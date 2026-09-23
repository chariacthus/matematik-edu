/**
 * Formelsamling til prøven med hjælpemidler.
 *
 * Til den rigtige FP9 med hjælpemidler har eleven en formelsamling,
 * lommeregner og regneark. Uden den her ville appens prøve kræve at
 * man kunne alle formler udenad - og det er præcis dét, den prøve
 * IKKE tester.
 *
 * Formlerne står med LaTeX, så de sættes med samme notation som i
 * opgaverne.
 */

export interface FormulaGroup {
  title: string;
  entries: { name: string; tex: string; note?: string }[];
}

export const FORMELSAMLING: FormulaGroup[] = [
  {
    title: 'Areal',
    entries: [
      { name: 'Rektangel', tex: 'A = l \\cdot b' },
      { name: 'Trekant', tex: 'A = \\tfrac{1}{2} \\cdot h \\cdot g', note: 'g er grundlinjen, h er højden på g' },
      { name: 'Parallelogram', tex: 'A = h \\cdot g' },
      { name: 'Trapez', tex: 'A = \\tfrac{1}{2}(a + b) \\cdot h' },
      { name: 'Cirkel', tex: 'A = \\pi \\cdot r^2' },
    ],
  },
  {
    title: 'Omkreds',
    entries: [
      { name: 'Rektangel', tex: 'O = 2l + 2b' },
      { name: 'Cirkel', tex: 'O = 2 \\pi r = \\pi d' },
    ],
  },
  {
    title: 'Rumfang',
    entries: [
      { name: 'Kasse', tex: 'V = l \\cdot b \\cdot h' },
      { name: 'Prisme og cylinder', tex: 'V = A_{grund} \\cdot h' },
      { name: 'Cylinder', tex: 'V = \\pi r^2 h' },
      { name: 'Pyramide og kegle', tex: 'V = \\tfrac{1}{3} \\cdot A_{grund} \\cdot h' },
      { name: 'Kegle', tex: 'V = \\tfrac{1}{3} \\pi r^2 h' },
      { name: 'Kugle', tex: 'V = \\tfrac{4}{3} \\pi r^3' },
    ],
  },
  {
    title: 'Trekanter',
    entries: [
      { name: 'Vinkelsum', tex: 'A + B + C = 180^\\circ' },
      { name: 'Pythagoras', tex: 'a^2 + b^2 = c^2', note: 'kun i en retvinklet trekant; c er hypotenusen' },
      { name: 'Sinus', tex: '\\sin(v) = \\frac{\\text{modstående}}{\\text{hypotenuse}}' },
      { name: 'Cosinus', tex: '\\cos(v) = \\frac{\\text{hosliggende}}{\\text{hypotenuse}}' },
      { name: 'Tangens', tex: '\\tan(v) = \\frac{\\text{modstående}}{\\text{hosliggende}}' },
    ],
  },
  {
    title: 'Vinkler',
    entries: [
      { name: 'Nabovinkler', tex: 'u + v = 180^\\circ' },
      { name: 'Vinkler om et punkt', tex: 'u + v + w + z = 360^\\circ' },
      { name: 'Topvinkler', tex: 'u = v', note: 'vinkler over for hinanden når to linjer skærer' },
    ],
  },
  {
    title: 'Procent og rente',
    entries: [
      { name: 'Procent af et tal', tex: '\\text{del} = \\frac{p}{100} \\cdot \\text{hele}' },
      { name: 'Procentvis ændring', tex: 'p = \\frac{\\text{ny} - \\text{gammel}}{\\text{gammel}} \\cdot 100' },
      { name: 'Vækstfaktor', tex: 'a = 1 + \\frac{p}{100}' },
      { name: 'Renteformlen', tex: 'K_n = K_0 \\cdot (1 + r)^n' },
    ],
  },
  {
    title: 'Funktioner',
    entries: [
      { name: 'Lineær funktion', tex: 'y = ax + b', note: 'a er hældningen, b er skæring med y-aksen' },
      { name: 'Hældning gennem to punkter', tex: 'a = \\frac{y_2 - y_1}{x_2 - x_1}' },
      { name: 'Proportionalitet', tex: 'y = ax' },
      { name: 'Omvendt proportionalitet', tex: 'y = \\frac{a}{x}' },
    ],
  },
  {
    title: 'Statistik og sandsynlighed',
    entries: [
      { name: 'Gennemsnit', tex: '\\bar{x} = \\frac{\\text{sum af tal}}{\\text{antal tal}}' },
      { name: 'Variationsbredde', tex: 'R = \\text{største} - \\text{mindste}' },
      { name: 'Sandsynlighed', tex: 'P = \\frac{\\text{gunstige udfald}}{\\text{mulige udfald}}' },
    ],
  },
];
