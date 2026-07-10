import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Pogosta vprašanja (FAQ)",
  description:
    "Odgovori na najpogostejša vprašanja o DateMatch — agenciji za personalizirano iskanje partnerja: kako deluje, zasebnost, cene, predstavitve in odpoved.",
  alternates: { canonical: "/faq" },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Kako deluje DateMatch?",
    a: "DateMatch je agencija za personalizirano iskanje partnerja. Ustvarite profil (osnovni podatki, želje, vprašalnik ujemanja in fotografije), nato pa vaš osebni svetovalec preuči vaše želje, s pomočjo pametnega ujemanja in lastne presoje poišče primerne osebe ter organizira predstavitev. Vi se samo odločite za srečanje.",
  },
  {
    q: "Ali je DateMatch aplikacija za zmenke?",
    a: "Ne. Pri nas ni javnih profilov, drsanja ali klepeta z neznanci. Vaš profil vidi izključno vaš svetovalec, ki namesto vas opravi iskanje in preverjanje. Spletno mesto uporabljate le za vnos in urejanje svojega profila.",
  },
  {
    q: "Kdo vidi moj profil in fotografije?",
    a: "Samo vaš svetovalec in pooblaščeno osebje agencije. Fotografije in kontaktni podatki niso nikoli javni in se ne delijo z drugimi člani. Morebitnemu ujemanju predstavimo le izbrane informacije o vas — in to izključno z vašim soglasjem.",
  },
  {
    q: "Kako poteka predstavitev?",
    a: "Ko svetovalec najde primerno ujemanje, ga najprej predstavi vam in drugi osebi. Če oba potrdita zanimanje, uskladimo termin in kraj prvega srečanja. Po srečanju z obema opravimo kratek pogovor — vaše povratne informacije izboljšajo vsak naslednji izbor.",
  },
  {
    q: "Koliko stane članstvo?",
    a: "Ponujamo tri pakete (Standard, Premium in Elite), ki se razlikujejo po obsegu iskanja in podpori svetovalca. Za aktualni cenik in predstavitveni pogovor nam pišite na " + CONTACT_EMAIL + ".",
  },
  {
    q: "Kako izbirate ujemanja?",
    a: "Kombiniramo strukturiran vprašalnik (vrednote, življenjski slog, pripravljenost na resno zvezo), vaš lastni opis, želje in izločilne kriterije ter presojo izkušenega svetovalca. Tehnologija predlaga, človek odloči.",
  },
  {
    q: "Ali lahko sodelujem ne glede na spolno usmerjenost?",
    a: "Da. Dobrodošli so vsi — v profilu preprosto označite, koga želite spoznati, in vaš svetovalec bo iskanje prilagodil temu.",
  },
  {
    q: "Ali moram privoliti, preden me komu predstavite?",
    a: "Da. Brez vašega izrecnega soglasja (polje »Soglasje« v profilu) vas nikoli ne uvrstimo v noben izbor. Soglasje lahko kadar koli umaknete v svojem profilu.",
  },
  {
    q: "Kako prekličem sodelovanje ali izbrišem svoje podatke?",
    a: "Sodelovanje lahko kadar koli prekinete — pišite svojemu svetovalcu ali na " + CONTACT_EMAIL + ". Na vašo zahtevo trajno izbrišemo vse vaše podatke (profil, fotografije, zgodovino predstavitev) v skladu z GDPR. Podrobnosti so v naši politiki zasebnosti.",
  },
  {
    q: "Kaj se zgodi, če se s predlagano osebo ne ujameva?",
    a: "Nič hudega — to je del procesa. Vaše povratne informacije zabeležimo, para nikoli več ne predlagamo ponovno, svetovalec pa izbor prilagodi. Uspešnost iskanja z vsakim srečanjem raste.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1>Pogosta vprašanja</h1>
      <p className="legal-updated">
        Ne najdete odgovora? Pišite nam na{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      {FAQ.map((f) => (
        <section key={f.q}>
          <h2>{f.q}</h2>
          <p>{f.a}</p>
        </section>
      ))}
      <p className="legal-note">
        Povezane strani: <Link href="/pogoji">Pogoji poslovanja</Link> ·{" "}
        <Link href="/zasebnost">Varstvo podatkov (GDPR)</Link> ·{" "}
        <Link href="/vracila">Vračila in odpovedi</Link>
      </p>
    </article>
  );
}
