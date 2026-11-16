-- Seed dev: 4 menu + opsi sesuai KF bagian 3 dan 7, id sama dengan contoh di openapi.yaml.
-- Harga ayam paha (+2000) hanya contoh uji; harga asli diatur Nabila di Kelola menu.
INSERT INTO menus (id, name, description, price, photo_url, is_available) VALUES
  (1, 'Mackster',  'Mac & cheese, saus keju kornet', 35000, NULL, true),
  (2, 'Nutrimac',  'Mac & cheese, brokoli, dada ayam panggang', 37000, NULL, true),
  (3, 'Wraphoria', 'Mac & cheese dan ayam krispi dalam tortila', 27000, NULL, true),
  (4, 'Mac Bites', '4 bites berbalut paper rice, isian ayam krispi, saus keju', 25000, NULL, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_options (id, menu_id, option_group, name, extra_price) VALUES
  (1, 1, 'pedas', 'Light', 0), (2, 1, 'pedas', 'Medium', 0), (3, 1, 'pedas', 'Spicy', 0),
  (4, 1, 'keju', 'Tambah keju', 3000),

  (5, 2, 'pedas', 'Light', 0), (6, 2, 'pedas', 'Medium', 0), (7, 2, 'pedas', 'Spicy', 0),
  (8, 2, 'keju', 'Tambah keju', 3000),
  (9, 2, 'tanpa_makaroni', 'Tanpa makaroni', 0),
  (10, 2, 'tanpa_brokoli', 'Tanpa brokoli', 0),
  (11, 2, 'ayam', 'Ayam dada', 0), (12, 2, 'ayam', 'Ayam paha', 2000),

  (13, 3, 'pedas', 'Light', 0), (14, 3, 'pedas', 'Medium', 0), (15, 3, 'pedas', 'Spicy', 0),
  (16, 3, 'keju', 'Tambah keju', 3000),
  (17, 3, 'ayam', 'Ayam dada', 0), (18, 3, 'ayam', 'Ayam paha', 2000),

  (19, 4, 'pedas', 'Light', 0), (20, 4, 'pedas', 'Medium', 0), (21, 4, 'pedas', 'Spicy', 0),
  (22, 4, 'keju', 'Tambah keju', 3000),
  (23, 4, 'ayam', 'Ayam dada', 0), (24, 4, 'ayam', 'Ayam paha', 2000)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('menus', 'id'), (SELECT max(id) FROM menus));
SELECT setval(pg_get_serial_sequence('menu_options', 'id'), (SELECT max(id) FROM menu_options));