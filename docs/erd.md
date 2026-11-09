# ERD macymoo

Sumber: `erd_macyourmoo.drawio` dari tim DS, disepakati FS dan DS.
Kolom dan tipe lengkap ada di `backend/migrations/001_init.sql`.

```mermaid
erDiagram
  orders ||--o{ deliveries : dikirim
  orders ||--o{ order_items : berisi
  orders ||--o{ payments : dibayar
  orders ||--o{ invoices : ditagih
  orders ||--o{ order_events : riwayat
  orders ||--o| reviews : diulas
  menus |o--o{ order_items : dipesan
  menus ||--o{ menu_options : "punya opsi"
  order_items ||--o{ order_item_options : memilih
  menu_options ||--o{ order_item_options : dipilih
  order_items ||--o{ order_item_labels : berlabel
  admin_users |o--o{ order_events : mencatat
```

Tabel mandiri (tanpa relasi): `closed_dates`, `settings`, `chat_logs`.
