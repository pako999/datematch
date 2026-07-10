import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Politika zasebnosti in varstvo podatkov (GDPR)",
  description:
    "Kako DateMatch obdeluje osebne podatke: katere podatke zbiramo, za kakšne namene, kdo so obdelovalci, kako dolgo jih hranimo in katere pravice imate po GDPR.",
  alternates: { canonical: "/zasebnost" },
};

export default function PrivacyPage() {
  return (
    <article>
      <h1>Politika zasebnosti in varstvo osebnih podatkov (GDPR)</h1>
      <p className="legal-updated">Zadnja posodobitev: julij 2026</p>

      <h2>1. Upravljavec podatkov</h2>
      <p>
        Upravljavec osebnih podatkov je DateMatch, [naziv podjetja d.o.o.],
        [naslov], Slovenija (v nadaljevanju »agencija«, »mi«). Za vsa
        vprašanja v zvezi z varstvom podatkov smo dosegljivi na{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>2. Katere podatke zbiramo</h2>
      <ul>
        <li>
          <strong>Identifikacijski in kontaktni podatki:</strong> ime in
          priimek, e-pošta, telefon, datum rojstva, kraj in država bivanja.
        </li>
        <li>
          <strong>Podatki profila:</strong> spol, osebni opis, fotografije,
          višina, teža, barva oči in las, postava, izobrazba, poklic.
        </li>
        <li>
          <strong>Želje in odgovori vprašalnika:</strong> koga želite
          spoznati, starostni razpon, razdalja, vrednote, življenjski slog,
          izločilni kriteriji.
        </li>
        <li>
          <strong>Podatki o poteku storitve:</strong> predlogi ujemanj,
          predstavitve, termini srečanj in vaše povratne informacije po
          srečanjih.
        </li>
        <li>
          <strong>Tehnični podatki:</strong> podatki o prijavi (prek ponudnika
          Clerk), nastavitev jezika ter osnovna interna analitika uporabe.
        </li>
      </ul>

      <h2>3. Nameni in pravne podlage obdelave</h2>
      <ul>
        <li>
          <strong>Izvajanje storitve povezovanja</strong> (člen 6(1)(b) GDPR —
          pogodba): vodenje profila, personalizirano iskanje ujemanj,
          organizacija predstavitev.
        </li>
        <li>
          <strong>Predstavitev drugim članom</strong> (člen 6(1)(a) GDPR —
          izrecno soglasje): brez soglasja v profilu vas nikoli ne uvrstimo v
          izbor; soglasje lahko kadar koli umaknete.
        </li>
        <li>
          <strong>Obdelava podatkov o zdravju ali spolni usmerjenosti</strong>,
          kadar iz profila izhajajo (člen 9(2)(a) GDPR — izrecno soglasje).
        </li>
        <li>
          <strong>Obveščanje in komunikacija</strong> (člen 6(1)(b) in (f)):
          e-poštna sporočila o poteku predstavitev.
        </li>
        <li>
          <strong>Izboljšave storitve</strong> (člen 6(1)(f) — zakoniti
          interes): interna analitika uspešnosti ujemanj brez javne objave.
        </li>
      </ul>

      <h2>4. Avtomatizirana obdelava in umetna inteligenca</h2>
      <p>
        Pri iskanju ujemanj si pomagamo s programsko opremo, ki izračuna
        skladnost profilov (vprašalnik, opis, razdalja) in z jezikovnimi
        modeli pripravi interne povzetke za svetovalca. Nobena odločitev o
        predstavitvi ni sprejeta izključno avtomatizirano — končni izbor vedno
        potrdi vaš svetovalec (človek). Vaši podatki se ne uporabljajo za
        učenje modelov tretjih oseb.
      </p>

      <h2>5. Obdelovalci in prenos podatkov</h2>
      <p>
        Podatke obdelujejo naslednji pogodbeni obdelovalci, s katerimi imamo
        sklenjene pogodbe o obdelavi podatkov (DPA): Vercel (gostovanje),
        Neon (podatkovna baza), Clerk (prijava in računi), Vercel Blob
        (shramba fotografij), Anthropic (interni povzetki in obrazložitve),
        Voyage AI (semantična primerjava opisov), Resend (e-pošta) in PostHog
        (interna analitika). Nekateri obdelovalci podatke obdelujejo v ZDA na
        podlagi standardnih pogodbenih klavzul oz. okvira EU-US DPF.
      </p>

      <h2>6. Hramba podatkov</h2>
      <p>
        Podatke hranimo, dokler traja vaše članstvo, oziroma do umika
        soglasja ali zahteve za izbris. Po prenehanju članstva profil
        deaktiviramo, na vašo zahtevo pa vse podatke trajno izbrišemo
        (vključno z ocenami ujemanj, predstavitvami, povratnimi informacijami
        in fotografijami). Računovodske podatke hranimo skladno z davčnimi
        predpisi.
      </p>

      <h2>7. Vaše pravice</h2>
      <ul>
        <li>dostop do svojih podatkov in njihova kopija,</li>
        <li>popravek netočnih podatkov (kar lahko uredite tudi sami v profilu),</li>
        <li>izbris (»pravica do pozabe«),</li>
        <li>omejitev obdelave in ugovor,</li>
        <li>prenosljivost podatkov,</li>
        <li>umik soglasja — kadar koli, brez vpliva na zakonitost pretekle obdelave,</li>
        <li>
          pritožba pri Informacijskem pooblaščencu RS (Dunajska cesta 22,
          1000 Ljubljana, www.ip-rs.si).
        </li>
      </ul>
      <p>
        Zahtevo uveljavite na{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>; odgovorimo
        najkasneje v 30 dneh.
      </p>

      <h2>8. Varnost</h2>
      <p>
        Vsi podatki se prenašajo šifrirano (TLS) in hranijo pri ponudnikih z
        industrijskimi varnostnimi standardi. Dostop do podatkov strank imajo
        samo pooblaščeni svetovalci; vsak vpogled in sprememba sta zabeležena.
        Fotografije niso nikoli javno dostopne.
      </p>

      <h2>9. Piškotki</h2>
      <p>
        Uporabo piškotkov opisuje ločena <Link href="/piskotki">politika piškotkov</Link>.
      </p>

      <p className="legal-note">
        Ta dokument je informativna predloga in ne nadomešča pravnega
        svetovanja. Pred objavo dopolnite podatke podjetja ([naziv, naslov,
        matična/davčna številka]) in ga uskladite s pravnikom.
      </p>
    </article>
  );
}
