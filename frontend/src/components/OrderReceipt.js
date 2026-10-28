import React from 'react';
import { createPortal } from 'react-dom';
import { PAYMENT_STATUS, methodLabel, formatRupiah, formatDay, displayPhone } from '../api/orderApi';
import './OrderReceipt.css';

export const receiptNumber = (order) => `ORD-${order.id.slice(0, 6).toUpperCase()}`;

/** Order lines as [name, qty, price]; text-only orders have one line with the typed items. */
const receiptLines = (order) => (order.lines?.length
  ? order.lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price, amount: l.qty * l.price }))
  : [{ name: order.items, qty: null, price: null, amount: order.total }]);

/** Plain-text receipt for WhatsApp. */
export function receiptText(order, outletName) {
  const rp = (n) => formatRupiah(n).replace(/\s/g, ' ');
  const rows = receiptLines(order).map((l) => (l.qty
    ? `${l.name}\n  ${l.qty} x ${rp(l.price)} = ${rp(l.amount)}`
    : `${l.name}\n  ${rp(l.amount)}`));
  const parts = [
    `*${outletName}*`,
    `Nota ${receiptNumber(order)}`,
    `Tgl order: ${formatDay(order.orderDate)}`,
    `Customer: ${order.customerName}`,
    `${order.fulfillment === 'antar' ? 'Diantar' : 'Diambil'}: ${formatDay(order.pickupDate)}${order.pickupTime ? ` ${order.pickupTime}` : ''}`,
    order.fulfillment === 'antar' && order.deliveryAddress ? `Alamat: ${order.deliveryAddress}` : null,
    '',
    ...rows,
    '',
    order.deliveryFee > 0 ? `Ongkir: ${rp(order.deliveryFee)}` : null,
    `*Total: ${rp(order.grandTotal)}*`,
    ...order.payments.map((p) => `Bayar ${formatDay(p.date)} (${methodLabel(p.method)}): ${rp(p.amount)}`),
    order.remaining > 0 ? `*Sisa: ${rp(order.remaining)}*` : '*LUNAS*',
    '',
    'Terima kasih 🙏',
  ];
  return parts.filter((x) => x !== null).join('\n');
}

/**
 * Printable receipt, sized for 58/80mm thermal printers and fine on A4 too.
 * Rendered into <body> so printing shows only the receipt, not the app behind it.
 */
const OrderReceipt = ({ order, outletName, onClose }) => {
  const lines = receiptLines(order);
  const wa = `https://wa.me/${order.customerPhone}?text=${encodeURIComponent(receiptText(order, outletName))}`;

  return createPortal(
    <div className="rcpt-overlay">
      <div className="rcpt-toolbar">
        <button className="ord-btn ghost" onClick={onClose}>← Kembali</button>
        <a className="ord-wa" href={wa} target="_blank" rel="noreferrer">💬 Kirim via WA</a>
        <button className="ord-btn primary" onClick={() => window.print()}>🖨️ Cetak</button>
      </div>

      <div className="rcpt">
        <div className="rcpt-center">
          <div className="rcpt-title">{outletName}</div>
          <div>Nota {receiptNumber(order)}</div>
          <div>{formatDay(order.orderDate)}</div>
        </div>
        <div className="rcpt-rule" />
        <div>Customer: {order.customerName}</div>
        <div>{displayPhone(order.customerPhone)}</div>
        <div>
          {order.fulfillment === 'antar' ? 'Diantar' : 'Diambil'}: {formatDay(order.pickupDate)}
          {order.pickupTime ? ` ${order.pickupTime}` : ''}
        </div>
        {order.fulfillment === 'antar' && order.deliveryAddress && <div>Alamat: {order.deliveryAddress}</div>}
        <div className="rcpt-rule" />

        {lines.map((l, i) => (
          <div key={i} className="rcpt-item">
            <div>{l.name}</div>
            <div className="rcpt-row">
              <span>{l.qty ? `${l.qty} x ${formatRupiah(l.price)}` : ''}</span>
              <span>{formatRupiah(l.amount)}</span>
            </div>
          </div>
        ))}

        <div className="rcpt-rule" />
        <div className="rcpt-row"><span>Subtotal</span><span>{formatRupiah(order.total)}</span></div>
        {order.deliveryFee > 0 && <div className="rcpt-row"><span>Ongkir</span><span>{formatRupiah(order.deliveryFee)}</span></div>}
        <div className="rcpt-row rcpt-strong"><span>TOTAL</span><span>{formatRupiah(order.grandTotal)}</span></div>
        {order.payments.map((p) => (
          <div key={p.id} className="rcpt-row">
            <span>Bayar {formatDay(p.date)} ({methodLabel(p.method)})</span>
            <span>{formatRupiah(p.amount)}</span>
          </div>
        ))}
        <div className="rcpt-row rcpt-strong">
          <span>{order.remaining > 0 ? 'SISA' : PAYMENT_STATUS.lunas.label.toUpperCase()}</span>
          <span>{order.remaining > 0 ? formatRupiah(order.remaining) : ''}</span>
        </div>
        {order.notes && (
          <>
            <div className="rcpt-rule" />
            <div>Catatan: {order.notes}</div>
          </>
        )}
        <div className="rcpt-rule" />
        <div className="rcpt-center">Terima kasih</div>
      </div>
    </div>,
    document.body
  );
};

export default OrderReceipt;
