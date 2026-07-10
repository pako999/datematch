import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Pogoji poslovanja",
  description:
    "Splošni pogoji uporabe storitev agencije DateMatch: opis storitve, članstvo, obveznosti strank, zasebnost, omejitev odgovornosti in pristojno pravo.",
  alternates: { canonical: "/pogoji" },
};

export default function TermsPage() {
  return (
    <article>
      <h1>Splošni pogoji poslovanja</h1>
      <p className="legal-updated">Zadnja posodobitev: julij 2026</p>

      <h2>1. Ponudnik in veljavnost</h2>
      <p>
        Te pogoje uporablja DateMatch, [naziv podjetja d.o.o.], [naslov],
        Slovenija (v nadaljevanju »agencija«). Veljajo za vse uporabnike
        spletnega mesta in vse člane, ki z agencijo sklenejo pogodbo o
        storitvah povezovanja. Z ustvarjanjem profila potrjujete, da ste
        pogoje prebrali in jih sprejemate.
      </p>

      <h2>2. Opis storitve</h2>
      <p>
        DateMatch je agencija za personalizirano iskanje partnerja. Storitev
        obsega: sprejem in pregled profila, osebni pogovor s svetovalcem,
        personalizirano iskanje in preverjanje ujemanj, organizacijo
        predstavitev ter zbiranje povratnih informacij. Storitev ni javna
        aplikacija za zmenke — profili niso javno vidni in člani med seboj ne
        komunicirajo prek platforme.
      </p>

      <h2>3. Pogoji za članstvo</h2>
      <ul>
        <li>starost najmanj 18 let,</li>
        <li>resničnost in točnost navedenih podatkov,</li>
        <li>samski stan oziroma status, ki dopušča iskanje partnerja,</li>
        <li>spoštljivo vedenje do predstavljenih oseb in osebja agencije.</li>
      </ul>
      <p>
        Agencija lahko sprejem v članstvo zavrne ali članstvo prekine, če
        član navede neresnične podatke, se do drugih vede žaljivo ali
        kako drugače krši te pogoje.
      </p>

      <h2>4. Cene in plačilo</h2>
      <p>
        Storitve se zaračunavajo po veljavnem ceniku oziroma individualni
        ponudbi (paketi Standard, Premium, Elite). Cene so sporočene pred
        sklenitvijo pogodbe. Plačilo se izvede pred začetkom izvajanja
        storitve, razen če je pisno dogovorjeno drugače.
      </p>

      <h2>5. Predstavitve in soglasje</h2>
      <p>
        Član je v izbor za predstavitve vključen izključno s svojim izrecnim
        soglasjem, ki ga lahko kadar koli umakne. Agencija drugemu članu
        pred obojestransko potrditvijo ne razkrije kontaktnih podatkov.
        Agencija si prizadeva za kakovostne predloge, ne jamči pa sklenitve
        poznanstva ali zveze.
      </p>

      <h2>6. Obveznosti člana</h2>
      <ul>
        <li>ažurno sporočanje sprememb (status, želje, dosegljivost),</li>
        <li>zaupno ravnanje s podatki predstavljenih oseb,</li>
        <li>pravočasna odpoved dogovorjenih srečanj,</li>
        <li>posredovanje povratnih informacij po srečanjih.</li>
      </ul>

      <h2>7. Zasebnost</h2>
      <p>
        Obdelavo osebnih podatkov ureja{" "}
        <Link href="/zasebnost">politika zasebnosti (GDPR)</Link>, uporabo
        piškotkov pa <Link href="/piskotki">politika piškotkov</Link>.
      </p>

      <h2>8. Odstop, odpoved in reklamacije</h2>
      <p>
        Pravico do odstopa, pogoje odpovedi in postopek reklamacij ureja
        stran <Link href="/vracila">Vračila in odpovedi</Link>, ki je
        sestavni del teh pogojev.
      </p>

      <h2>9. Omejitev odgovornosti</h2>
      <p>
        Agencija odgovarja za skrbno izvedbo storitve, ne odgovarja pa za
        ravnanje članov na srečanjih ali po njih, za točnost podatkov, ki
        jih navedejo člani, niti za odločitve članov o nadaljevanju
        poznanstva. Srečanja potekajo na lastno odgovornost; priporočamo
        običajno previdnost pri spoznavanju novih ljudi.
      </p>

      <h2>10. Spremembe pogojev</h2>
      <p>
        Agencija lahko pogoje spremeni; o bistvenih spremembah člane obvesti
        po e-pošti vsaj 15 dni pred uveljavitvijo. Če se s spremembo ne
        strinjate, lahko članstvo odpoveste pred njeno uveljavitvijo.
      </p>

      <h2>11. Pravo in spori</h2>
      <p>
        Uporablja se pravo Republike Slovenije. Morebitne spore stranki
        rešujeta sporazumno, sicer je pristojno stvarno pristojno sodišče po
        sedežu agencije oziroma po prebivališču potrošnika, kadar tako
        določa zakon. Kontakt:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <p className="legal-note">
        Informativna predloga — pred objavo dopolnite podatke podjetja in
        cenik ter dokument uskladite s pravnikom.
      </p>
    </article>
  );
}
