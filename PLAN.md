# HiFly DNG Image Management App — Implementierungsplan

## Context

Greenfield-Projekt in `d:\HiFly\website`. Die App verwaltet große DNG-RAW-Fotos (~100 MB), lädt sie zu AWS S3 hoch, generiert JPG-Vorschauen, zeigt sie in einer Galerie an und ermöglicht Download und Filterung. Ziel: bis zu 10.000+ Bilder mit Tagging, Adressanzeige und Hash-basierter Identifikation.

---

## Tech Stack (final)

| Schicht | Technologie |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind CSS, DaisyUI (dark theme, pink-orange Signalfarbe) |
| Backend | Node.js + Express.js + TypeScript |
| Worker | Node.js (dcraw + sharp), läuft separat (EC2 oder lokal) |
| Datenbank | **Supabase** (Managed PostgreSQL) |
| Storage | AWS S3 (presigned URLs für Upload + Download) |
| Queue | AWS SQS (async JPG-Generierung) |
| Auth | JWT + bcryptjs, E-Mail + Passwort |
| State | Zustand (UI) + TanStack Query (Server) |

---

## Dateinamensformat

Beispiel: `Adalbert_Stifter_Gasse_2024_07_13_001_7EE7.DNG`

Parsing-Regex: `/^(.+)_(\d{4})_(\d{2})_(\d{2})_(\d+)_([A-Fa-f0-9]{4})\.DNG$/i`

| Segment | Wert | Verhalten |
|---|---|---|
| `Adalbert_Stifter_Gasse` | Adresse | Unterstriche → Leerzeichen, immer angezeigt |
| `2024_07_13` | Aufnahmedatum | In DB gespeichert (als `DATE`), **niemals** ans Frontend |
| `001` | Sequenznummer | In DB gespeichert, nicht angezeigt |
| `7EE7` | Hash / ID | Primärschlüssel, angezeigt (Referenz/Bestellung) |

---

## S3-Ordnerstruktur pro Bild

```
images/7EE7/
  original.dng    ← ~100 MB, Original
  large.jpg       ← 3000px breit
  medium.jpg      ← 1200px breit
  small.jpg       ← 600px breit
  thumb.jpg       ← 200px (quadratisch, Cover-Crop)
```

---

## Datenbankschema (Supabase / PostgreSQL)

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE images (
  hash              CHAR(4) PRIMARY KEY,
  original_filename TEXT NOT NULL,
  address           TEXT NOT NULL,
  capture_date      DATE NOT NULL,           -- NIEMALS ans Frontend
  sequence_number   TEXT,
  s3_key_prefix     TEXT NOT NULL,           -- "images/7EE7/"
  file_size_bytes   BIGINT,
  checksum          TEXT NOT NULL UNIQUE,    -- SHA-256
  tags              TEXT[] NOT NULL DEFAULT '{}',
  upload_timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_status TEXT NOT NULL DEFAULT 'pending',
  processing_error  TEXT,
  processed_at      TIMESTAMPTZ
);

CREATE INDEX idx_images_tags ON images USING GIN (tags);
CREATE INDEX idx_images_upload_ts ON images (upload_timestamp DESC);
```

---

## API-Übersicht

```
POST /api/auth/login
POST /api/auth/register

POST /api/upload/initiate   → Checksums prüfen, presigned PUT-URLs zurückgeben
POST /api/upload/confirm    → SQS-Job starten

GET    /api/images          ?tags[]&address&status&page&limit
GET    /api/images/:hash    → Detail + alle presigned URLs
PATCH  /api/images/:hash/tags
DELETE /api/images/:hash
DELETE /api/images          (Bulk, Body: { hashes[] })

GET    /api/tags            → [{ tag, count }]
```

`capture_date` erscheint in **keiner** API-Antwort.

---

## Worker: DNG → JPG Pipeline

1. SQS-Message: `{ hash, s3KeyPrefix }`
2. `original.dng` von S3 laden → temp file
3. `dcraw -T -w -b 2.0 -c original.dng` → TIFF (stdout)
4. `sharp` → 4 JPG-Varianten (large/medium/small/thumb)
5. JPGs parallel nach S3 hochladen
6. Supabase: `processing_status = 'ready'`

**dcraw installieren**: `apt install dcraw` (Ubuntu/EC2)

---

## Design

- Dark theme: `#0d0d18` Base, `#161625` Surface
- Signal-Farbe (Schrift/Akzente): Gradient `#FF6B6B → #FF8E53 → #FFAD3B`
- DaisyUI custom theme: `hifly`
