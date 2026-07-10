import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Politika piškotkov",
  description:
    "Kateri piškotki se uporabljajo na spletnem mestu DateMatch, čemu služijo in kako jih lahko upravljate.",
  alternates: { canonical: "/piskotki" },
};

export default function CookiesPage() {
  return (
    <article>
      <h1>Politika piškotkov</h1>
      <p className="legal-updated">Zadnja posodobitev: julij 2026</p>

      <h2>1. Kaj so piškotki</h2>
      <p>
        Piškotki so majhne besedilne datoteke, ki jih spletno mesto shrani v
        vaš brskalnik. Uporabljamo jih zgolj toliko, kolikor je nujno za
        delovanje storitve — brez oglaševalskih ali sledilnih piškotkov
        tretjih oseb.
      </p>

      <h2>2. Piškotki, ki jih uporabljamo</h2>
      <h3>Nujni piškotki (ni potrebna privolitev)</h3>
      <ul>
        <li>
          <strong>Prijavna seja (Clerk, npr. __session, __client):</strong>{" "}
          omogočajo varno prijavo in ohranjanje seje. Trajanje: do izteka
          seje oz. do 7 dni.
        </li>
        <li>
          <strong>locale:</strong> shrani izbrani jezik (slovenščina /
          angleščina). Trajanje: 12 mesecev.
        </li>
      </ul>
      <h3>Analitični piškotki (samo, če so vklopljeni)</h3>
      <ul>
        <li>
          <strong>PostHog (ph_*):</strong> interna, anonimizirana statistika
          uporabe konzole za osebje agencije. Ne uporablja se za oglaševanje
          in se ne deli s tretjimi osebami.
        </li>
      </ul>

      <h2>3. Upravljanje piškotkov</h2>
      <p>
        Piškotke lahko kadar koli izbrišete ali blokirate v nastavitvah
        svojega brskalnika. Ker uporabljamo skoraj izključno nujne piškotke,
        lahko blokada vpliva na delovanje prijave in profila.
      </p>

      <h2>4. Kontakt</h2>
      <p>
        Vprašanja o piškotkih: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        Več o obdelavi osebnih podatkov v{" "}
        <Link href="/zasebnost">politiki zasebnosti</Link>.
      </p>

      <p className="legal-note">
        Informativna predloga — pred objavo jo uskladite z dejansko
        konfiguracijo (npr. če PostHog ni vklopljen, razdelek o analitičnih
        piškotkih ne velja).
      </p>
    </article>
  );
}
