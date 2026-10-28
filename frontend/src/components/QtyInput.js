import React from 'react';
import './Stock.css';

const STEPS = [5, 10];

/** Quantity cell with − / + buttons so stock can be filled in with thumbs only. */
const QtyInput = ({ value, onChange, steps = STEPS }) => {
  const n = Number(value) || 0;
  return (
    <div className="stk-qty">
      <button type="button" onClick={() => onChange(Math.max(n - 1, 0))} aria-label="Kurangi">−</button>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={value === 0 ? '' : value}
        placeholder="0"
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(parseInt(e.target.value, 10) || 0, 0))}
      />
      {steps.map((s) => (
        <button type="button" key={s} onClick={() => onChange(n + s)}>+{s}</button>
      ))}
    </div>
  );
};

export default QtyInput;
