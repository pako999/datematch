import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Vračila, odpovedi in reklamacije",
  description:
    "Pogoji odstopa od pogodbe, vračila plačil, odpovedi članstva in reklamacij pri agenciji DateMatch v skladu s slovensko in evropsko potrošniško zakonodajo.",
  alternates: { canonical: "/vracila" },
};

export default function RefundsPage() {
  return (
    <article>
      <h1>Vračila, odpovedi in reklamacije</h1>
      <p className="legal-updated">Zadnja posodobitev: julij 2026</p>

      <h2>1. 14-dnevna pravica do odstopa</h2>
      <p>
        Kot potrošnik imate pravico, da v 14 dneh od sklenitve pogodbe
        (nakupa članstva) brez navedbe razloga odstopite od pogodbe (45.
        člen ZVPot-1 oz. Direktiva 2011/83/EU). Odstop sporočite na{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Prejeta
        plačila vrnemo najkasneje v 14 dneh od prejema obvestila, z istim
        plačilnim sredstvom, s katerim ste plačali.
      </p>
      <p>
        Če na vašo izrecno zahtevo z izvajanjem storitve (iskanjem in
        predstavitvami) začnemo že v odstopnem roku, nam v primeru odstopa
        pripada sorazmerno plačilo za že opravljeni del storitve.
      </p>

      <h2>2. Odpoved članstva</h2>
      <ul>
        <li>
          Članstvo lahko kadar koli odpoveste s sporočilom svojemu svetovalcu
          ali na {CONTACT_EMAIL}; odpoved velja z iztekom tekočega
          obračunskega obdobja.
        </li>
        <li>
          Sodelovanje lahko kadar koli začasno ustavite (status »na premoru«)
          — v tem času vas ne vključujemo v izbore.
        </li>
        <li>
          Umik soglasja za predstavitve ne pomeni samodejne odpovedi
          članstva, pomeni pa, da vas do ponovne privolitve nikomur ne
          predstavimo.
        </li>
      </ul>

      <h2>3. Kaj vračamo in česa ne moremo jamčiti</h2>
      <p>
        Naša storitev je skrbno, personalizirano iskanje in organizacija
        predstavitev — ne moremo pa jamčiti, da bo iz srečanj nastala zveza.
        Neuspešno ujemanje zato samo po sebi ni razlog za vračilo. Vračilo
        oziroma sorazmerno vračilo pripada, kadar storitev ni bila opravljena
        v dogovorjenem obsegu ali kakovosti.
      </p>

      <h2>4. Reklamacije</h2>
      <p>
        Reklamacijo oddate na <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
        z opisom in datumom dogodka. Odgovorimo najkasneje v 8 dneh. Če se ne
        strinjate z rešitvijo, lahko uporabite platformo EU za spletno
        reševanje sporov (ec.europa.eu/odr) ali se obrnete na pristojno
        sodišče.
      </p>

      <h2>5. Izbris podatkov ob prenehanju</h2>
      <p>
        Ob odpovedi lahko zahtevate trajni izbris vseh svojih podatkov —
        postopek je opisan v <Link href="/zasebnost">politiki zasebnosti</Link>.
      </p>

      <p className="legal-note">
        Informativna predloga — dopolnite podatke podjetja in cenovna
        določila ter jo uskladite s pravnikom.
      </p>
    </article>
  );
}
