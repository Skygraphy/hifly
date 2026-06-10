# Plan: image_data einbinden — Datei als Quelle, wiederholbarer DB-Abgleich

## Kontext

`image_data_v2.ts` bleibt die maßgebliche Referenzdatei für Bildmetadaten (friendlyName, cluster, latLng, visible). Zum Zeitpunkt der Ausführung sind erst ein Teil der ~1.060 Bilder in der DB vorhanden. Der Abgleich muss jederzeit wiederholbar sein — wenn weitere Bilder hochgeladen werden, sollen die statischen Metadaten automatisch zugeordnet werden können.

---

## Gewählter Ansatz: Datei als In-Memory-Map + DB-Erweiterung + Sync-Endpunkt

### Schritt 1 — image_data_v2.ts erweitern

Eine zusätzliche `imageMap`-Export hinzufügen:

```typescript
// Schneller Lookup per ID
export const imageMap = new Map(images.map(img => [img.id, img]));
```

→ Erzeugt `image_data_v3.ts` (neue Version gemäß Versionierungsregel)

---

### Schritt 2 — DB-Spalten hinzufügen (Migration 021)

```sql
-- server/src/db/migrations/021_image_geo_fields.sql
ALTER TABLE images
  ADD COLUMN IF NOT EXISTS friendly_name TEXT,
  ADD COLUMN IF NOT EXISTS cluster       TEXT,
  ADD COLUMN IF NOT EXISTS lat           FLOAT8,
  ADD COLUMN IF NOT EXISTS lng           FLOAT8;
```

Die Spalten sind nullable. Bilder ohne Eintrag in der Datei haben NULL. Bilder, die noch nicht hochgeladen wurden, haben (noch) keinen DB-Eintrag.

---

### Schritt 3 — Sync-Endpunkt `POST /api/admin/sync-image-data`

Logik (wiederholbar, idempotent) — **zwei Richtungen**:

**Richtung A: Datei → DB** (Geo-Daten einspielen)
```
Für jeden Eintrag in image_data_v3.ts:
  - Suche DB-Row mit gleicher id
  - Existiert: UPDATE friendly_name, cluster, lat, lng
  - Existiert nicht: überspringen (noch nicht hochgeladen)
```

**Richtung B: DB → Datei** (Abgleich existierender DB-Bilder)
```
Alle DB-Bilder laden (SELECT id, friendly_name, cluster, lat, lng):
  - id in imageMap vorhanden  + geo-Daten fehlen (NULL): → wird durch Richtung A befüllt
  - id in imageMap vorhanden  + geo-Daten vorhanden:     → bereits synchronisiert
  - id NICHT in imageMap:                                → unbekanntes Bild (kein Eintrag in Datei)
```

Beide Richtungen laufen in einem einzigen Aufruf ab. Antwort:

```json
{
  "updated": 42,       // DB-Rows mit neuen Geo-Daten versehen
  "alreadySynced": 8,  // bereits vollständig synchronisiert
  "notInFile": 3,      // DB-Bilder ohne Eintrag in image_data (z.B. manuell hochgeladen)
  "notInDb": 1010,     // Datei-Einträge die noch nicht hochgeladen wurden
  "total": 1060        // Gesamteinträge in image_data
}
```

**Datei:** `server/src/controllers/admin.controller.ts` (neu oder erweitern)
**Route:** `POST /api/admin/sync-image-data` (nur `super_admin`)

Zusätzlich: `GET /api/admin/sync-image-data/status` liefert denselben Report ohne zu schreiben (reine Statusabfrage).

---

### Schritt 4 — Service enrichment (Sofort-Lookup ohne Sync)

In `images.service.ts` die `imageMap` importieren und `listImages`/`getImage` damit anreichern:

```typescript
import { imageMap } from '../image_data/image_data_v3';

// In listImages: nach DB-Abfrage
rows.map(row => ({
  ...row,
  friendly_name: row.friendly_name ?? imageMap.get(row.id)?.friendlyName ?? null,
  cluster:       row.cluster       ?? imageMap.get(row.id)?.cluster       ?? null,
  lat:           row.lat           ?? imageMap.get(row.id)?.latLng?.[0]   ?? null,
  lng:           row.lng           ?? imageMap.get(row.id)?.latLng?.[1]   ?? null,
}))
```

→ Bilder haben immer aktuelle Geodaten, auch wenn der Sync noch nicht ausgeführt wurde. Nach dem Sync liegen die Werte dauerhaft in der DB (SQL-filterbar).

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `server/src/image_data/image_data_v3.ts` | Neu: v2 + `imageMap` Export |
| `server/src/db/migrations/021_image_geo_fields.sql` | Neu: 4 nullable Spalten |
| `server/src/services/images.service.ts` | `SUMMARY_FIELDS` + Map-Enrichment |
| `server/src/types/index.ts` | `ImageSummary`/`ImageDetail` Typen erweitern |
| `server/src/controllers/admin.controller.ts` | Sync-Handler + Status-Handler |
| `server/src/routes/admin.routes.ts` | POST + GET sync-Routen |
| `client/src/api/images.ts` | Response-Typen erweitern |

---

## Verifikation

1. Migration in Supabase ausführen
2. `GET /api/images` → Bilder enthalten `cluster`, `lat`, `lng` aus Map (vor Sync)
3. `GET /api/admin/sync-image-data/status` → zeigt aktuellen Stand ohne Schreibzugriff
4. `POST /api/admin/sync-image-data` ausführen → befüllt geo-Daten für alle vorhandenen DB-Bilder
5. Erneuter `GET /api/images` → Werte kommen jetzt aus der DB-Spalte
6. `GET /api/admin/sync-image-data/status` erneut → `alreadySynced` steigt, `updated` = 0
7. Abgleich wiederholbar: nach jedem neuen Upload nochmals POST → neues Bild erhält Geo-Daten
