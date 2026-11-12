# mock: server tiruan macymoo

Server tiruan yang dibuat otomatis dari `docs/openapi.yaml` memakai [Prism](https://github.com/stoplightio/prism).
Tidak ada kode dan tidak ada database: jawaban diambil dari `example` di kontrak, atau dibuat dari skemanya.
Dipakai FS, AI, dan DS supaya bisa mulai integrasi sebelum backend asli jadi.

## Menjalankan

Butuh Node.js 18 ke atas.

```bash
cd mock
npm install
npm start
```

Server jalan di `http://localhost:4010`. Kontrak dibaca ulang otomatis saat `docs/openapi.yaml` berubah.

| Perintah | Isi jawaban |
|---|---|
| `npm start` | Tetap: `example` dari kontrak; kalau tidak ada, nilai contoh dari skema (`"string"`, `0`) |
| `npm run start:dynamic` | Acak tiap permintaan, tetap sesuai skema |

## Alamat

Tidak ada awalan `/api/v1` di server tiruan.

| Bagian | Asli | Tiruan |
|---|---|---|
| Express (publik, auth, admin) | `http://localhost:3000/api/v1/menus` | `http://localhost:4010/menus` |
| FastAPI internal | `http://localhost:8000/v1/health` | `http://localhost:4010/v1/health` |

- Frontend: isi `VITE_API_URL=http://localhost:4010` di `frontend/.env`.
- Backend (menguji panggilan ke AI sebelum FastAPI siap): isi `AI_SERVICE_URL=http://localhost:4010` di `backend/.env`.

## Contoh

```bash
# Publik
curl http://localhost:4010/menus

curl -X POST http://localhost:4010/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"Budi","phone":"081234567890","delivery_date":"2026-11-20","method":"ambil_sendiri","items":[{"menu_id":1,"qty":2,"option_ids":[1]},{"menu_id":2,"qty":1}],"agree_rules":true,"turnstile_token":"apa-saja"}'

curl http://localhost:4010/orders/status/token-apa-saja

# Admin: wajib ada cookie macymoo_admin (isinya bebas), tanpa itu 401
curl http://localhost:4010/admin/orders -H "Cookie: macymoo_admin=tes"

# Internal FastAPI: wajib ada header X-Internal-Secret (isinya bebas), tanpa itu 401
curl -X POST http://localhost:4010/v1/moolabel/predict \
  -H "Content-Type: application/json" -H "X-Internal-Secret: tes" \
  -d '{"items":[{"order_item_id":123,"note":"sausnya dipisah ya kak"}]}'
```

Di PowerShell pakai `curl.exe`, bukan `curl`.

## Memaksa jawaban error

Tambahkan header `Prefer: code=<status>` untuk meminta status tertentu yang ada di kontrak:

```bash
curl -X POST http://localhost:4010/moobot/chat \
  -H "Content-Type: application/json" -H "Prefer: code=503" \
  -d '{"message":"halo","turnstile_token":"apa-saja"}'
```

Berguna untuk menguji tampilan gagal: 404 token salah, 409 transisi tidak sah, 429 rate limit, 503 AI gagal.

## Batasan

- Request divalidasi terhadap kontrak: body yang salah bentuk dibalas 400. Aturan bisnis tidak dicek
  (tanggal sebelum besok, tanggal tutup, menu habis, Turnstile, transisi status).
- Tidak menyimpan apa pun: `POST /orders` selalu membalas contoh yang sama, dan token apa saja dianggap ada.
- Nilai cookie dan secret tidak diperiksa, hanya keberadaannya. Login tidak menyetel cookie sungguhan.
- Endpoint tanpa `example` di kontrak membalas nilai contoh dari skema. Kalau butuh data yang masuk akal,
  tambahkan `example` di `docs/openapi.yaml`, jangan di folder ini.
- Endpoint PDF dan Excel membalas 200 dengan isi contoh, bukan file sungguhan.
