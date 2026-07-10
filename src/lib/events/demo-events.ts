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
