/**
 * Demo singles events (fictional, for showcasing the events section).
 * Dates are relative to load time so the list always looks current.
 */

export interface DemoEvent {
  title: string;
  description: string;
  location: string;
  country: string;
  emoji: string;
  inDays: number;
  priceEur: number | null;
  capacity: number | null;
}

/**
 * Weekend event templates for the full-year plan. One event is placed on
 * each upcoming Saturday; the generator cycles through this pool and
 * lightly adapts wording to the season, so a whole year of weekends is
 * filled with varied, themed singles events.
 */
export interface WeekendTemplate {
  title: string;
  description: string;
  location: string;
  country: string;
  emoji: string;
  priceEur: number | null;
  capacity: number | null;
  /** Optional: only schedule in these months (1–12), e.g. sailing in summer. */
  months?: number[];
}

const WEEKEND_TEMPLATES: WeekendTemplate[] = [
  {
    title: "Pohod na Pohorje za samske",
    description:
      "Voden sobotni pohod s piknikom na vrhu. Sproščeno spoznavanje med hojo — samo dobra družba in razgledi.",
    location: "Pohorje, Slovenija",
    country: "Slovenija",
    emoji: "🥾",
    priceEur: 15,
    capacity: 24,
  },
  {
    title: "Degustacija vin za samske",
    description:
      "Večer slovenskih vin z vodeno degustacijo in prigrizki. Mize premešamo med rundami, da spoznate vse goste.",
    location: "Maribor, Slovenija",
    country: "Slovenija",
    emoji: "🍷",
    priceEur: 35,
    capacity: 20,
  },
  {
    title: "Kuharska delavnica v parih",
    description:
      "Pod vodstvom chefa v parih pripravite tri hode. Pare žrebamo, ob krožniku pa se vedno najde tema za pogovor.",
    location: "Ljubljana, Slovenija",
    country: "Slovenija",
    emoji: "👩‍🍳",
    priceEur: 45,
    capacity: 16,
  },
  {
    title: "Sončni vzhod nad Bledom",
    description:
      "Jutranji vzpon na Ojstrico z razgledom na Blejski otok, po spustu skupna kava in kremšnita ob jezeru.",
    location: "Bled, Slovenija",
    country: "Slovenija",
    emoji: "🌅",
    priceEur: 10,
    capacity: 18,
  },
  {
    title: "Salsa večer za samske",
    description:
      "Dvourna delavnica salse brez predznanja in brez para — partnerje menjamo ves večer. Sledi družabni ples.",
    location: "Koper, Slovenija",
    country: "Slovenija",
    emoji: "💃",
    priceEur: 20,
    capacity: 30,
  },
  {
    title: "Kolesarski izlet ob Dravi",
    description:
      "Lahkoten sobotni kolesarski izlet po ravninski poti s postankom na kmečkem dvorišču. Za vse ravni.",
    location: "Ptuj, Slovenija",
    country: "Slovenija",
    emoji: "🚴",
    priceEur: 12,
    capacity: 25,
  },
  {
    title: "Nedeljski brunch in družabne igre",
    description:
      "Sproščen dopoldan ob bogatem brunchu in namiznih igrah, ki hitro razbijejo led. Idealno za introvertirane.",
    location: "Ljubljana, Slovenija",
    country: "Slovenija",
    emoji: "🥐",
    priceEur: 25,
    capacity: 28,
  },
  {
    title: "Termalni wellness vikend",
    description:
      "Sobotni oddih v termah: bazeni, savne in skupna večerja. Umirjeno druženje v sproščujočem okolju.",
    location: "Rogaška Slatina, Slovenija",
    country: "Slovenija",
    emoji: "♨️",
    priceEur: 55,
    capacity: 20,
  },
  {
    title: "Fotografski sprehod po starem mestu",
    description:
      "Voden fotosprehod z nasveti fotografa. Med iskanjem kadrov je pogovor povsem naraven, tudi za sramežljive.",
    location: "Ljubljana, Slovenija",
    country: "Slovenija",
    emoji: "📷",
    priceEur: 18,
    capacity: 16,
  },
  {
    title: "Adrenalinski vikend na Soči",
    description:
      "Rafting na smaragdni Soči, večerja ob ognju in prenočišče v glampingu. Za samske, ki jih povezuje avantura.",
    location: "Bovec, Slovenija",
    country: "Slovenija",
    emoji: "🚣",
    priceEur: 120,
    capacity: 14,
    months: [5, 6, 7, 8, 9],
  },
  {
    title: "Jadranje za samske po Jadranu",
    description:
      "Vikend jadranja med Hvarom in Visom z izkušenim skiperjem. Majhna posadka, skupno kuhanje in skriti zalivi.",
    location: "Hvar, Hrvaška",
    country: "Hrvaška",
    emoji: "⛵",
    priceEur: 290,
    capacity: 10,
    months: [5, 6, 7, 8, 9],
  },
  {
    title: "Vikend spoznavanja v Zagrebu",
    description:
      "Mestni pobeg čez mejo: sprehod po Gornjem gradu, degustacija štrukljev in večerni speed-dating.",
    location: "Zagreb, Hrvaška",
    country: "Hrvaška",
    emoji: "🏙️",
    priceEur: 149,
    capacity: 22,
  },
  {
    title: "Zimski pohod s krpljami",
    description:
      "Vodena tura s krpljami po zasneženi planoti, sledi topel čaj v koči. Oprema vključena.",
    location: "Velika planina, Slovenija",
    country: "Slovenija",
    emoji: "🏔️",
    priceEur: 30,
    capacity: 18,
    months: [12, 1, 2],
  },
  {
    title: "Smučarski vikend za samske",
    description:
      "Dan na smučeh in večer ob après-ski v družbi. Za vse ravni — tudi za tiste, ki šele začenjajo.",
    location: "Kranjska Gora, Slovenija",
    country: "Slovenija",
    emoji: "⛷️",
    priceEur: 95,
    capacity: 20,
    months: [12, 1, 2, 3],
  },
  {
    title: "Piknik in odbojka na mivki",
    description:
      "Sproščeno poletno druženje ob reki: odbojka na mivki, piknik in glasba. Brez pritiska, samo zabava.",
    location: "Ljubljana, Slovenija",
    country: "Slovenija",
    emoji: "🏐",
    priceEur: 8,
    capacity: 32,
    months: [6, 7, 8],
  },
  {
    title: "Obisk vinske kleti in trgatev",
    description:
      "Sodelujte pri trgatvi, nato pa uživajte ob domači malici in mladem vinu. Jesenska tradicija za nova poznanstva.",
    location: "Goriška Brda, Slovenija",
    country: "Slovenija",
    emoji: "🍇",
    priceEur: 40,
    capacity: 24,
    months: [9, 10],
  },
];

/** Special multi-day highlights sprinkled into the year (bigger trips). */
const HIGHLIGHT_TEMPLATES: (WeekendTemplate & { month: number })[] = [
  {
    title: "Karibsko križarjenje za samske",
    description:
      "Osem dni med otoki vzhodnih Karibov s skupino samskih iz Slovenije. Spremstvo svetovalca DateMatch, skupne večerje in izleti na kopno.",
    location: "Vzhodni Karibi",
    country: "Karibi",
    emoji: "🛳️",
    priceEur: 1890,
    capacity: 12,
    month: 2,
  },
  {
    title: "Silvestrska gala za samske",
    description:
      "Elegantno silvestrovanje ob morju: večerja s štirimi hodi, živa glasba in polnočna zdravica. Dress code: svečano.",
    location: "Portorož, Slovenija",
    country: "Slovenija",
    emoji: "🎆",
    priceEur: 89,
    capacity: 60,
    month: 12,
  },
];

/**
 * Build a full year of weekend events — one per upcoming Saturday for 52
 * weeks — cycling through the templates and respecting seasonal months.
 * `from` is the reference "now"; passed in so callers control the clock.
 */
export function generateYearPlan(from: Date): {
  title: string;
  description: string;
  location: string;
  country: string;
  emoji: string;
  startsAt: Date;
  priceEur: number | null;
  capacity: number | null;
}[] {
  // First upcoming Saturday at 10:00 local.
  const first = new Date(from);
  const daysUntilSat = (6 - first.getDay() + 7) % 7 || 7;
  first.setDate(first.getDate() + daysUntilSat);
  first.setHours(10, 0, 0, 0);

  const events: ReturnType<typeof generateYearPlan> = [];
  let cursor = 0;

  for (let week = 0; week < 52; week++) {
    const date = new Date(first);
    date.setDate(first.getDate() + week * 7);
    const month = date.getMonth() + 1;

    // A highlight owns the first suitable weekend of its month.
    const highlight = HIGHLIGHT_TEMPLATES.find(
      (h) => h.month === month && !events.some((e) => e.title === h.title),
    );
    const tpl =
      highlight ??
      pickTemplate(month, cursor++);

    events.push({
      title: tpl.title,
      description: tpl.description,
      location: tpl.location,
      country: tpl.country,
      emoji: tpl.emoji,
      startsAt: date,
      priceEur: tpl.priceEur,
      capacity: tpl.capacity,
    });
  }
  return events;
}

/** Pick the next season-appropriate template, cycling deterministically. */
function pickTemplate(month: number, offset: number): WeekendTemplate {
  const inSeason = WEEKEND_TEMPLATES.filter(
    (t) => !t.months || t.months.includes(month),
  );
  const pool = inSeason.length > 0 ? inSeason : WEEKEND_TEMPLATES;
  return pool[offset % pool.length]!;
}

export const DEMO_EVENTS: DemoEvent[] = [
  {
    title: "Pohod na Pohorje za samske",
    description:
      "Voden nedeljski pohod od Bolfenka do Rogle s piknikom na vrhu. Sproščeno spoznavanje med hojo, brez prisile — samo dobra družba in razgledi.",
    location: "Pohorje, Slovenija",
    country: "Slovenija",
    emoji: "🥾",
    inDays: 14,
    priceEur: 15,
    capacity: 24,
  },
  {
    title: "Degustacija vin za samske",
    description:
      "Večer štajerskih vin v vinski kleti z vodeno degustacijo in prigrizki. Mize premešamo med vsako rundo, da spoznate vse goste.",
    location: "Maribor, Slovenija",
    country: "Slovenija",
    emoji: "🍷",
    inDays: 21,
    priceEur: 35,
    capacity: 20,
  },
  {
    title: "Kuharska delavnica v parih",
    description:
      "Pod vodstvom chefa v parih pripravite tri hode — pare žrebamo, ob krožniku pa se vedno najde tema za pogovor.",
    location: "Ljubljana, Slovenija",
    country: "Slovenija",
    emoji: "👩‍🍳",
    inDays: 28,
    priceEur: 45,
    capacity: 16,
  },
  {
    title: "Sončni vzhod nad Bledom",
    description:
      "Jutranji vzpon na Ojstrico in Osojnico s pogledom na Blejski otok, po spustu pa skupna kava in kremšnita ob jezeru.",
    location: "Bled, Slovenija",
    country: "Slovenija",
    emoji: "🌅",
    inDays: 35,
    priceEur: 10,
    capacity: 18,
  },
  {
    title: "Salsa večer za začetnike",
    description:
      "Dvourna delavnica salse za samske — brez predznanja in brez para, partnerje menjamo ves večer. Sledi družabni ples ob obali.",
    location: "Koper, Slovenija",
    country: "Slovenija",
    emoji: "💃",
    inDays: 42,
    priceEur: 20,
    capacity: 30,
  },
  {
    title: "Adrenalinski vikend na Soči",
    description:
      "Dvodnevni pobeg v Bovec: rafting na smaragdni Soči, večerja ob ognju in prenočišče v glampingu. Za samske, ki jih povezuje avantura.",
    location: "Bovec, Slovenija",
    country: "Slovenija",
    emoji: "🚣",
    inDays: 49,
    priceEur: 120,
    capacity: 14,
  },
  {
    title: "Jadranje za samske po Jadranu",
    description:
      "Štiridnevno jadranje med Hvarom in Visom z izkušenim skiperjem. Majhna posadka, skupno kuhanje na krovu in kopanje v skritih zalivih.",
    location: "Hvar, Hrvaška",
    country: "Hrvaška",
    emoji: "⛵",
    inDays: 60,
    priceEur: 390,
    capacity: 10,
  },
  {
    title: "Vikend spoznavanja v Zagrebu",
    description:
      "Mestni pobeg čez mejo: vodeni sprehod po Gornjem gradu, degustacija štrukljev in večerni speed-dating v butičnem hotelu.",
    location: "Zagreb, Hrvaška",
    country: "Hrvaška",
    emoji: "🏙️",
    inDays: 70,
    priceEur: 149,
    capacity: 22,
  },
  {
    title: "Karibsko križarjenje za samske",
    description:
      "Osem dni med otoki vzhodnih Karibov s skupino samskih iz vse Slovenije. Spremstvo svetovalca DateMatch, skupne večerje in izleti na kopno.",
    location: "Vzhodni Karibi",
    country: "Karibi",
    emoji: "🛳️",
    inDays: 120,
    priceEur: 1890,
    capacity: 12,
  },
  {
    title: "Silvestrska gala za samske",
    description:
      "Elegantno silvestrovanje v Portorožu: večerja s štirimi hodi, živa glasba in polnočna zdravica z pogledom na morje. Dress code: svečano.",
    location: "Portorož, Slovenija",
    country: "Slovenija",
    emoji: "🎆",
    inDays: 160,
    priceEur: 89,
    capacity: 60,
  },
];
