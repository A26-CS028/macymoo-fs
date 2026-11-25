import { test } from 'node:test'
import assert from 'node:assert/strict'
import { racikanOf } from './racikan.js'

const qtys = (rs) => rs.map((r) => r.qty)

test('tanpa racikan tambahan: semua porsi di utama', () => {
  assert.deepEqual(qtys(racikanOf(3, undefined)), [3])
  assert.deepEqual(qtys(racikanOf(3, { pedas: 1 })), [3]) // data lama di sessionStorage
})

test('racikan tambahan mengambil porsi dari utama', () => {
  assert.deepEqual(qtys(racikanOf(5, [{}, { qty: 2 }, { qty: 1 }])), [2, 2, 1])
})

test('keranjang berkurang: racikan terakhir dipotong, utama tetap minimal 1', () => {
  assert.deepEqual(qtys(racikanOf(3, [{}, { qty: 2 }, { qty: 2 }])), [1, 2])
  assert.deepEqual(qtys(racikanOf(1, [{}, { qty: 2 }])), [1])
})

test('jumlah selalu sama dengan keranjang', () => {
  for (let q = 1; q <= 8; q++) {
    const rs = racikanOf(q, [{}, { qty: 3 }, { qty: 2 }, { qty: 4 }])
    assert.equal(rs.reduce((a, r) => a + r.qty, 0), q)
    assert.ok(rs.every((r) => r.qty >= 1))
  }
})
