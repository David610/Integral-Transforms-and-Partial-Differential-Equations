# NK-Express

> Betriebskostenabrechnung (Nebenkostenabrechnung) für vermietete Mehrfamilien­häuser –
> in Sekunden, direkt im Browser. Zielgruppe: Property- und Asset-Management.

NK-Express ist ein Prototyp, der die häufigsten Pflichten einer **rechtssicheren
Betriebskosten­abrechnung** automatisiert: Verteilung der Kosten nach gewähltem
Umlageschlüssel (§ 556a BGB), HeizkostenV-konforme Heizkostenaufteilung,
CO₂-Kosten­aufteilung nach 10-Stufen­modell (CO2KostAufG) sowie Leerstand,
nicht umlagefähige Positionen und Mieter-Saldo.

## Idee

In einer typischen Hausverwaltung mit z. B. 15 Mietverhältnissen pro Objekt sind
die größten Zeitfresser nicht die Kostenpositionen selbst, sondern:

- die korrekte **Verteilung** je nach Umlageschlüssel pro Position,
- die **HeizkostenV-konforme Aufteilung** (50–70 % Verbrauch, Rest Fläche),
- die **CO₂-Kostenaufteilung** seit 2023 (Vermieter-/Mieteranteil nach Effizienz),
- der **Leerstand** (Kostenanteil trägt der Eigentümer, nicht die Mieter),
- der saubere **PDF-Export** je Mieter mit Saldo und Fristenhinweis.

NK-Express bündelt das in einer ruhigen, klaren UI – Stammdaten rein, Kosten rein,
Knopf drücken, PDF raus. Alles läuft lokal im Browser; keine Daten verlassen das Gerät.

## Tech-Stack

- **Vite + React 18 + TypeScript** – schnelles Dev-Setup, strikte Typen
- **Tailwind CSS + shadcn/ui-Pattern** – sauberes, professionelles UI
- **Zustand** mit `persist`-Middleware – State + `localStorage`
- **@react-pdf/renderer** – PDF-Export pro Mieter
- **Vitest** – Unit-Tests für die Domain-Logik
- **lucide-react** – Iconset

## Architektur

```
src/
  domain/         Reine Rechenfunktionen (UI-frei, voll getestet)
    types.ts        Datenmodell
    umlage.ts       § 556a BGB — Umlageschlüssel
    heizkosten.ts   HeizkostenV § 7 — Grund/Verbrauch 30/70
    co2.ts          CO2KostAufG — 10-Stufenmodell
    abrechnung.ts   Orchestrierung der Mieterabrechnung
    format.ts       de-DE Zahlen-, Währungs-, Datumsformat
  data/seed.ts    Beispielobjekt MFH Magdeburg, 15 Einheiten
  store/          Zustand-Store mit localStorage-Persistenz
  components/
    ui/           Button, Card, Input, Label, Select, Table, Badge
    StammdatenForm.tsx, KostenTable.tsx,
    AbrechnungPreview.tsx, AbrechnungPdf.tsx,
    FristenBanner.tsx
  pages/          Dashboard, Stammdaten, Kosten, Abrechnung
  App.tsx, main.tsx
```

**Wichtigste Regel:** Die Rechtslogik steht ausschließlich in `src/domain/*`. Sie
ist rein, deterministisch, ohne Storage-/UI-Abhängigkeiten und durch Tests
abgesichert. Die UI ruft `erstelleAbrechnung()` als Selector auf.

## Rechtsgrundlagen

| Norm                      | Wirkung in NK-Express                                                    |
| ------------------------- | ------------------------------------------------------------------------ |
| **§ 2 BetrKV**            | Katalog der 17 umlagefähigen Betriebskostenpositionen                    |
| **§ 556a BGB**            | Umlagemaßstab; Default = Wohnfläche, alternativ Einheiten/Personen/Verbrauch |
| **§ 556 Abs. 3 BGB**      | 12-Monats-Frist für Abrechnung und Mieter-Einwendung (Banner in UI)      |
| **HeizkostenV § 7**       | Heiz-/Warmwasserkosten 30/70 (Grund/Verbrauch), 50–70 % einstellbar      |
| **HeizkostenV § 12**      | 15 % Kürzungsrecht bei nicht-verbrauchsabhängiger Abrechnung             |
| **CO2KostAufG § 5**       | 10-Stufenmodell für die Vermieter-/Mieteranteils-Verteilung              |

## Lokal starten

```bash
npm install
npm run dev       # Dev-Server auf http://localhost:5173
npm test          # 47 Unit-Tests in src/domain
npm run build     # Production-Build inkl. tsc --noEmit
```

## Deployment auf Cloudflare Pages

NK-Express ist eine reine Static-Site (alles läuft im Browser, kein Backend).
Cloudflare Pages eignet sich perfekt:

**Variante 1 – Git-Integration (empfohlen):**

1. Repo auf GitHub pushen.
2. In Cloudflare Dashboard: `Workers & Pages` → `Create application` → `Pages` →
   `Connect to Git` → Repo auswählen.
3. Build-Settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `22` (Env-Var `NODE_VERSION=22`)
4. `Save and Deploy`. Jeder Push auf `main` triggert ein neues Deployment;
   PRs bekommen automatisch Preview-URLs.

**Variante 2 – Wrangler CLI (Direktupload):**

```bash
npm install -g wrangler
npm run build
wrangler pages deploy dist --project-name=nk-express
```

## Was läuft, was nicht

- ✅ Vollständige Rechtslogik mit Unit-Tests (`date`, `umlage`, `heizkosten`, `co2`, `abrechnung`)
- ✅ Stammdatenpflege Gebäude + Einheiten, Leerstand-Handling
- ✅ Tagesgenaue Berücksichtigung von Mietbeginn/-ende im Abrechnungsjahr
- ✅ Kostenpositionen frei erfassbar, BetrKV-Mapping, Umlageschlüssel-Wahl
- ✅ Dashboard, Fristenbanner, Saldenübersicht
- ✅ Abrechnungs-Vorschau je Mieter mit Einzelpositionen
- ✅ PDF-Export pro Mieter (@react-pdf/renderer)
- ✅ Persistenz via localStorage, "Seed laden" als Reset
- ✅ Deutsche Formate (de-DE), responsives Layout, tastaturbedienbar

**Bewusst weggelassen** (kein Produktionsanspruch):

- Multi-Objekt-Verwaltung (das Modell trägt es, die UI zeigt nur ein Objekt)
- Authentifizierung, Benutzerrollen, Audit-Log
- Server-Persistenz / Buchhaltungs-Schnittstellen (DATEV, Aareon)
- Detaillierte CO₂-Brennstoffaufschlüsselung (Erdgas-Standardfaktor 0,201 kg/kWh)

## Beispieldatensatz

Beim ersten Start lädt NK-Express ein vollständiges Beispiel:

- **MFH Magdeburg, Neue Neustadt**, 15 Wohneinheiten, ~851 m²
- realistische Kostenpositionen (Grundsteuer, Wasser, Müll, Hausmeister,
  Versicherung, Wärmelieferung, Messdienst, Straßenreinigung)
- nicht umlagefähige Positionen (Verwaltung, Instandhaltung, Rauchmelder-Miete)
- eine Einheit als Leerstand (Mietende 28.02.2025) — der Eigentümer trägt
  deren Anteil sichtbar als Vermieteranteil

Über "Seed laden" in der Sidebar kann jederzeit auf den Ausgangsstand
zurückgesetzt werden.

## Hinweise

Diese App ist ein **Prototyp** und ersetzt keine juristische Prüfung. Sie zeigt
die Mechanik der Rechtsnormen am Praxisfall, aber jede konkrete Abrechnung muss
vom Vermieter bzw. von der Hausverwaltung geprüft und freigegeben werden.
