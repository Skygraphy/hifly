# Plan: image_data einbinden — Datei als Quelle, wiederholbarer DB-Abgleich

## Kontext

`klosterneuburg_stadt.ts` ist die einzige maßgebliche Referenzdatei für Bildmetadaten. Alle `image_data_vX.ts`-Versionen sind obsolet. Dieser Plan verwendet ausschließlich `klosterneuburg_stadt.ts` als Quelle.

**Aktuelle Attributstruktur je Eintrag:**
```typescript
{
  id: string,               // Dateiname ohne Extension → PK in images-Tabelle
  hash: string,             // 4-stelliger Code
  lat_lng: [number, number],// Koordinaten [lat, lng]
  main_location: string,    // Adresse (aus id extrahiert)
  secondary_locations: [],  // weitere Orte
  tags: [],                 // statische Tags
  user_tags: [],            // benutzerdefinierte Tags
  cluster: string,          // Buchstabe A–W
  web_visible: boolean,
  web_ranking: number,
  print_visible: boolean,
  print_ranking: number
}
```

---

## Gewählter Ansatz: Datei als In-Memory-Map + DB-Erweiterung + Sync-Endpunkt

### Schritt 1 — imageMap-Export hinzufügen

`klosterneuburg_stadt.ts` direkt erweitern:

```typescript
export const imageMap = new Map(images.map(img => [img.id, img]));
```

---

### Schritt 2 — DB-Schema anpassen (Migration 021)

**GPS-Speicherung:** Zwei separate Spalten `lat FLOAT8, lng FLOAT8`. Einfach, ohne Extension, ausreichend für Kartenmarker und Bounding-Box-Abfragen. PostGIS wäre bei Bedarf später nachrüstbar.

**`address` → `main_location` umbenennen:** Das bestehende `address`-Feld speichert denselben Inhalt wie `main_location` aus der Datei; eine einheitliche Benennung vermeidet Dopplung.

```sql
-- server/src/db/migrations/021_image_geo_fields.sql

-- Bestehendes Feld umbenennen
ALTER TABLE images RENAME COLUMN address TO main_location;

-- Neue Felder hinzufügen
ALTER TABLE images
  ADD COLUMN IF NOT EXISTS secondary_locations TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS user_tags           TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cluster             TEXT,
  ADD COLUMN IF NOT EXISTS web_visible         BOOLEAN  DEFAULT true,
  ADD COLUMN IF NOT EXISTS web_ranking         INTEGER  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS print_visible       BOOLEAN  DEFAULT true,
  ADD COLUMN IF NOT EXISTS print_ranking       INTEGER  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS lat                 FLOAT8,
  ADD COLUMN IF NOT EXISTS lng                 FLOAT8;
```

`lat_lng[0]` → `lat`, `lat_lng[1]` → `lng`. Das bestehende `tags`-Feld wird durch den Sync mit den Datei-Tags überschrieben.

---

### Schritt 3 — Sync-Endpunkt `POST /api/admin/sync-image-data`

Logik (wiederholbar, idempotent) — **zwei Richtungen**:

**Richtung A: Datei → DB** (Metadaten einspielen)
```
Für jeden Eintrag in klosterneuburg_stadt.ts (imageMap):
  - Suche DB-Row mit gleicher id
  - Existiert: UPDATE main_location, secondary_locations, tags, user_tags,
                       cluster, web_visible, web_ranking, print_visible, print_ranking,
                       lat = lat_lng[0], lng = lat_lng[1]
  - Existiert nicht: überspringen (noch nicht hochgeladen)
```

**Richtung B: DB → Datei** (Abgleich existierender DB-Bilder)
```
Alle DB-Bilder laden (SELECT id, main_location, cluster, lat, lng):
  - id in imageMap vorhanden  + Metadaten fehlen (NULL): → wird durch Richtung A befüllt
  - id in imageMap vorhanden  + Metadaten vorhanden:     → bereits synchronisiert
  - id NICHT in imageMap:                                → unbekanntes Bild (kein Eintrag in Datei)
```

Beide Richtungen laufen in einem einzigen Aufruf ab. Antwort:

```json
{
  "updated": 42,
  "alreadySynced": 8,
  "notInFile": 3,
  "notInDb": 1010,
  "total": 1060
}
```

**Datei:** `server/src/controllers/admin.controller.ts`
**Routen:**
- `POST /api/admin/sync-image-data` — schreibt (nur `super_admin`)
- `GET  /api/admin/sync-image-data/status` — liest nur, kein Schreibzugriff

---

### Schritt 4 — Service enrichment (Sofort-Lookup ohne Sync)

```typescript
import { imageMap } from '../image_data/klosterneuburg_stadt';

// In listImages / getImage: nach DB-Abfrage
rows.map(row => {
  const meta = imageMap.get(row.id);
  return {
    ...row,
    main_location:       row.main_location       ?? meta?.main_location       ?? null,
    secondary_locations: row.secondary_locations ?? meta?.secondary_locations ?? [],
    cluster:             row.cluster             ?? meta?.cluster             ?? null,
    web_visible:         row.web_visible         ?? meta?.web_visible         ?? true,
    web_ranking:         row.web_ranking         ?? meta?.web_ranking         ?? 1,
    print_visible:       row.print_visible       ?? meta?.print_visible       ?? true,
    print_ranking:       row.print_ranking       ?? meta?.print_ranking       ?? 1,
    lat:                 row.lat                 ?? meta?.lat_lng?.[0]        ?? null,
    lng:                 row.lng                 ?? meta?.lat_lng?.[1]        ?? null,
  };
})
```

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `server/src/image_data/klosterneuburg_stadt.ts` | Erweitern: `imageMap` Export hinzufügen |
| `server/src/db/migrations/021_image_geo_fields.sql` | Neu: RENAME address→main_location + 9 neue Spalten |
| `server/src/services/images.service.ts` | `address`→`main_location` in SUMMARY_FIELDS + neue Felder + Map-Enrichment |
| `server/src/controllers/images.controller.ts` | Filter-Parameter `address` → `main_location` |
| `server/src/types/index.ts` | `ImageSummary`/`ImageDetail`: `address`→`main_location` + neue Felder |
| `server/src/controllers/admin.controller.ts` | Sync-Handler + Status-Handler |
| `server/src/routes/admin.routes.ts` | POST + GET sync-Routen |
| `client/src/api/images.ts` | `address`→`main_location` + neue Response-Felder |

---

## Verifikation

1. Migration in Supabase ausführen
2. `GET /api/images` → Bilder enthalten `main_location`, `cluster`, `lat`, `lng` aus Map (vor Sync)
3. `GET /api/admin/sync-image-data/status` → zeigt aktuellen Stand ohne Schreibzugriff
4. `POST /api/admin/sync-image-data` → befüllt Metadaten für alle vorhandenen DB-Bilder
5. Erneuter `GET /api/images` → Werte kommen aus DB-Spalten
6. `GET /api/admin/sync-image-data/status` erneut → `alreadySynced` steigt, `updated` = 0
7. Abgleich wiederholbar: nach jedem neuen Upload nochmals POST → neues Bild erhält Metadaten
