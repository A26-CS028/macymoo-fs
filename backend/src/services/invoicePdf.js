// Invoice PDF dibuat saat diminta (serverless, KF bagian 11). Tidak menyentuh database:
// terima `detail` dari loadDetail (routes/admin/orders.js) dan baris invoice dari invoiceNumber.js.
// Dua tahap: buildInvoiceModel (data murni, mudah diuji) lalu renderInvoicePdf (menggambar).
// pdfkit dimuat saat dipakai, bukan saat start: kalau gagal dimuat di runtime (pdfkit me-require
// fontkit/linebreak yang hanya ESM), yang rusak hanya route invoice, bukan seluruh API.

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const METHOD_LABEL = { antar_nabila: 'Diantar Nabila', ambil_sendiri: 'Ambil Sendiri' };

// Tanpa toLocaleString: hasilnya bergantung ICU runtime. Rp35.000, negatif: -Rp5.000.
function rupiah(n) {
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}Rp${s}`;
}

// 'YYYY-MM-DD' -> '20 November 2026' (string, bukan Date: tidak ada pergeseran zona waktu)
function formatDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * @param detail  hasil loadDetail (OrderDetail)
 * @param invoice { display_no, issued_at } dari issueInvoice / insertInvoice
 */
function buildInvoiceModel(detail, invoice) {
  const t = detail.totals;
  const multi = detail.deliveries.length > 1;

  const sections = detail.deliveries.map((d, i) => ({
    title: multi ? `Pengiriman ${i + 1}` : 'Pengiriman',
    date: formatDate(d.delivery_date),
    method: METHOD_LABEL[d.method] || d.method,
    items: detail.items
      .filter((it) => it.delivery_id === d.id)
      .map((it) => {
        const extra = it.options.reduce((s, o) => s + o.extra_price, 0);
        return {
          name: it.name,
          options: it.options.map((o) => (o.extra_price > 0 ? `${o.name} (+${rupiah(o.extra_price)})` : o.name)),
          note: it.note || null,
          qty: it.qty,
          unit: it.unit_price + extra, // harga per porsi termasuk opsi; qty * unit = line_total
          total: it.line_total,
        };
      }),
    // Ongkir hanya relevan untuk Antar Nabila; Ambil Sendiri tidak punya baris ongkir.
    shipping_fee: d.method === 'antar_nabila' ? d.shipping_fee : null,
  }));

  const totals = [{ label: 'Subtotal', value: rupiah(t.subtotal) }];
  totals.push({ label: 'Ongkir', value: rupiah(t.shipping_total) });
  if (t.discount > 0) totals.push({ label: 'Diskon', value: rupiah(-t.discount) });
  totals.push({ label: 'Total', value: rupiah(t.grand_total), bold: true });
  if (detail.payments.length > 0) totals.push({ label: 'Sudah dibayar', value: rupiah(t.paid_net) });
  if (t.refund_due > 0) totals.push({ label: 'Perlu dikembalikan', value: rupiah(t.refund_due) });
  else totals.push({ label: 'Sisa tagihan', value: rupiah(t.balance_due), bold: true });

  return {
    display_no: invoice.display_no,
    issued: formatDate(invoice.issued_at),
    order_code: detail.order_code,
    customer: detail.customer_name || '-', // boleh kosong (fitur Anonimkan)
    sections,
    totals,
  };
}

const COL = { name: { x: 50, w: 240 }, qty: { x: 295, w: 40 }, unit: { x: 340, w: 95 }, total: { x: 440, w: 105 } };
const LEFT = 50;
const RIGHT = 545;

function renderInvoicePdf(model) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Invoice ${model.display_no}`, Author: 'macyourmoo' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const ensure = (h) => {
      if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
    };
    const line = (y) => doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.5).strokeColor('#999999').stroke();
    const cells = (y, name, qty, unit, total, font) => {
      doc.font(font).fontSize(10).fillColor('#000000');
      doc.text(name, COL.name.x, y, { width: COL.name.w });
      doc.text(qty, COL.qty.x, y, { width: COL.qty.w, align: 'right' });
      doc.text(unit, COL.unit.x, y, { width: COL.unit.w, align: 'right' });
      doc.text(total, COL.total.x, y, { width: COL.total.w, align: 'right' });
    };

    // Kepala
    doc.font('Helvetica-Bold').fontSize(20).text('INVOICE', LEFT, 50);
    doc.font('Helvetica').fontSize(10).fillColor('#444444').text('macyourmoo', LEFT, doc.y);
    doc.moveDown(1);
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11).text(model.display_no, LEFT, doc.y);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Tanggal terbit: ${model.issued}`, LEFT, doc.y);
    doc.text(`Kode pesanan: ${model.order_code}`, LEFT, doc.y);
    doc.text(`Pelanggan: ${model.customer}`, LEFT, doc.y);
    doc.moveDown(1);

    // Satu bagian per pengiriman: item lalu ongkir pengiriman itu
    for (const s of model.sections) {
      ensure(60);
      doc.font('Helvetica-Bold').fontSize(11).text(`${s.title}: ${s.date} (${s.method})`, LEFT, doc.y);
      doc.moveDown(0.4);
      const head = doc.y;
      cells(head, 'Item', 'Qty', 'Harga', 'Jumlah', 'Helvetica-Bold');
      doc.y = head + 14;
      line(doc.y);
      doc.y += 4;

      for (const it of s.items) {
        const sub = [it.options.join(', '), it.note ? `Catatan: ${it.note}` : '']
        .filter(Boolean)
        .join('\n');
        doc.font('Helvetica').fontSize(10);
        const nameH = doc.heightOfString(it.name, { width: COL.name.w });
        doc.fontSize(8);
        const subH = sub ? doc.heightOfString(sub, { width: COL.name.w }) : 0;
        const h = nameH + subH + 5;
        ensure(h);
        const y = doc.y;
        cells(y, it.name, String(it.qty), rupiah(it.unit), rupiah(it.total), 'Helvetica');
        if (sub) doc.font('Helvetica').fontSize(8).fillColor('#555555').text(sub, COL.name.x, y + nameH, { width: COL.name.w });
        doc.fillColor('#000000');
        doc.y = y + h;
      }

      if (s.shipping_fee !== null) {
        ensure(18);
        const y = doc.y;
        cells(y, 'Ongkir', '', '', rupiah(s.shipping_fee), 'Helvetica');
        doc.y = y + 16;
      }
      line(doc.y);
      doc.y += 14;
    }

    // Ringkasan
    ensure(model.totals.length * 16 + 10);
    for (const r of model.totals) {
      const y = doc.y;
      const font = r.bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(font).fontSize(10).fillColor('#000000');
      doc.text(r.label, 290, y, { width: 145, align: 'right' });
      doc.text(r.value, COL.total.x, y, { width: COL.total.w, align: 'right' });
      doc.y = y + 16;
    }

    doc.end();
  });
}

const buildInvoicePdf = ({ detail, invoice }) => renderInvoicePdf(buildInvoiceModel(detail, invoice));

module.exports = { rupiah, formatDate, buildInvoiceModel, renderInvoicePdf, buildInvoicePdf };
