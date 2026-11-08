# macymoo-fs

Repo Full Stack proyek macymoo (UMKM macyourmoo), Capstone Asah 2026, Tim A26-CS028.

## Isi repo

| Folder | Isi |
|---|---|
| `frontend/` | React (Vite, Tailwind), di-deploy ke Vercel |
| `backend/` | Express, migrasi Neon, di-deploy ke Vercel |
| `docs/` | `openapi.yaml` (kontrak API), `erd.md` |
| `mock/` | Server tiruan dari `openapi.yaml` untuk AI dan DS |

## Repo terkait

- [macymoo-ai](https://github.com/A26-CS028/macymoo-ai): FastAPI (MooLabel, MooBot), pelatihan model
- [macymoo-ds](https://github.com/A26-CS028/macymoo-ds): analisis data dan pembuat dataset MooLabel

## Kontrak API

Kontrak API hanya diubah di `docs/openapi.yaml`. Setiap perubahan dikabari ke semua path (FS, AI, DS).

## Aturan kerja

- `main` dilindungi: kerja di branch `feat/...`, `fix/...`, `docs/...`.
- Pull request wajib di-review rekan satu path sebelum merge.
- `.env` tidak di-commit; nilai asli disimpan di environment variable Vercel.
- Tidak ada nama, HP, alamat, atau invoice asli di repo.

## Menjalankan lokal

(diisi setelah setup selesai)
