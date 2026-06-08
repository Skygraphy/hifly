# HiFly — Rollen & Zugriffsrechte

## Rollenmodell

| Rolle | DB-Wert | Kann |
|---|---|---|
| Anonym | — | Galerie ansehen (Thumbnails) |
| User | `'user'` | + Bilder herunterladen |
| Admin | `'admin'` | + Hochladen, Bearbeiten, Löschen |
| Super-Admin | `'super_admin'` | + User zu Admins ernennen |

**Nur ein Super-Admin** — er ernennt Admins. Admins können keine weiteren Admins ernennen.

---

## Datenbankänderungen

### Migration `006_users_role.sql`
```sql
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'super_admin'));
```
Super-Admin einmalig setzen:
```sql
UPDATE users SET role = 'super_admin' WHERE email = 'deine@email.com';
```

---

## Backend

- **JWT-Payload** enthält jetzt `role`
- **3 Middleware-Stufen:** `requireAuth`, `requireAdmin`, `requireSuperAdmin`
- **`GET /api/images`** → öffentlich, aber ohne Token keine Download-URLs
- **Upload/Delete/Tags** → weiterhin `requireAdmin`
- **`GET/PATCH /api/users`** → nur `super_admin`

---

## Frontend

- **`/gallery`** — öffentliche Galerie (kein Login nötig)
- **`/admin/upload`** — nur Admin
- **`/admin/manage`** — nur Admin
- **`/admin/users`** — nur Super-Admin
- **Login-Modal** erscheint wenn Anonym auf Download klickt
- **Navbar** zeigt Links je nach Rolle

---

## Routen-Übersicht

| Route | Schutz |
|---|---|
| `/home` | Öffentlich |
| `/gallery` | Öffentlich |
| `/login` | Öffentlich |
| `/admin/upload` | Admin+ |
| `/admin/manage` | Admin+ |
| `/admin/users` | Super-Admin |
