import { test } from 'node:test'
import assert from 'node:assert/strict'
import { porsiPerTanggal, seninDari, jumlah } from './porsi.js'

test('Senin minggu berjalan', () => {
  assert.equal(seninDari('2026-11-25'), '2026-11-23') // Rabu
  assert.equal(seninDari('2026-11-23'), '2026-11-23') // Senin
  assert.equal(seninDari('2026-11-29'), '2026-11-23') // Minggu
})

test('menjumlah per tanggal dan menu; batal & belum dikonfirmasi tidak dihitung', () => {
  const orders = [
    { id: 1, status: 'diproses', delivery_dates: ['2026-11-26'], items_summary: [{ name: 'Nutrimac', qty: 2 }, { name: 'Mackster', qty: 1 }] },
    { id: 2, status: 'selesai', delivery_dates: ['2026-11-26'], items_summary: [{ name: 'Nutrimac', qty: 3 }] },
    { id: 3, status: 'dibatalkan', delivery_dates: ['2026-11-26'], items_summary: [{ name: 'Nutrimac', qty: 9 }] },
    { id: 4, status: 'menunggu_konfirmasi', delivery_dates: ['2026-11-26'], items_summary: [{ name: 'Nutrimac', qty: 9 }] },
    { id: 5, status: 'diproses', delivery_dates: ['2026-11-26', '2026-11-27'], items_summary: [{ name: 'Wraphoria', qty: 10 }] },
  ]
  const details = { 5: { deliveries: [{ id: 50, delivery_date: '2026-11-26' }, { id: 51, delivery_date: '2026-11-27' }], items: [{ delivery_id: 50, name: 'Wraphoria', qty: 5 }, { delivery_id: 51, name: 'Wraphoria', qty: 5 }] } }
  const r = porsiPerTanggal(orders, details, ['2026-11-26', '2026-11-27'])
  assert.deepEqual(r['2026-11-26'], { Nutrimac: 5, Mackster: 1, Wraphoria: 5 })
  assert.deepEqual(r['2026-11-27'], { Wraphoria: 5 })
  assert.equal(jumlah(r['2026-11-26']), 11)
})
