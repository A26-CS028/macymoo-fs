import { test } from 'node:test'
import assert from 'node:assert/strict'
import { uraiBaris, uraiTeksBot } from './teksBot.js'

test('jawaban MooBot production 26 Nov: daftar dan tebal tanpa tanda markdown', () => {
  const teks = 'Halo! Berikut adalah menu macymoo beserta harganya:\n\n* **Mackster**: Rp35.000\n* **Nutrimac**: Rp37.000\n\nAda lagi yang bisa saya bantu?'
  assert.deepEqual(uraiTeksBot(teks), [
    { type: 'p', lines: [[{ text: 'Halo! Berikut adalah menu macymoo beserta harganya:', bold: false }]] },
    { type: 'list', items: [
      [{ text: 'Mackster', bold: true }, { text: ': Rp35.000', bold: false }],
      [{ text: 'Nutrimac', bold: true }, { text: ': Rp37.000', bold: false }],
    ] },
    { type: 'p', lines: [[{ text: 'Ada lagi yang bisa saya bantu?', bold: false }]] },
  ])
})

test('tanda - dan •, judul #, miring dibuang; baris berurutan tetap satu paragraf', () => {
  const blok = uraiTeksBot('### Cara bayar\nQRIS *atau* transfer\n- DP 50%\n• Lunas')
  assert.deepEqual(blok, [
    { type: 'p', lines: [[{ text: 'Cara bayar', bold: true }], [{ text: 'QRIS atau transfer', bold: false }]] },
    { type: 'list', items: [[{ text: 'DP 50%', bold: false }], [{ text: 'Lunas', bold: false }]] },
  ])
})

test('teks biasa tidak berubah: tanda bintang di tengah kata, harga, dan tanpa markdown', () => {
  assert.deepEqual(uraiBaris('Mackster Rp35.000, 2*3 porsi'), [{ text: 'Mackster Rp35.000, 2*3 porsi', bold: false }])
  assert.deepEqual(uraiBaris('saus_keju dan menu_id'), [{ text: 'saus_keju dan menu_id', bold: false }])
  assert.deepEqual(uraiTeksBot(''), [])
  assert.deepEqual(uraiTeksBot(undefined), [])
})

test('isi HTML dari AI tetap teks biasa (dirender React, bukan innerHTML)', () => {
  assert.deepEqual(uraiTeksBot('**<img src=x onerror=alert(1)>**'), [
    { type: 'p', lines: [[{ text: '<img src=x onerror=alert(1)>', bold: true }]] },
  ])
})
