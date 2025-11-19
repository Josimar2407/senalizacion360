import React from 'react';

/**
 * NumberInput móvil-friendly
 * - Permite vacío ("") mientras escribes
 * - Limita a maxDigits
 * - Normaliza a 0 solo en onBlur (Ajuste 1)
 * - Devuelve string "" o dígitos (string) en onChange; en onBlur fuerza 0 si está vacío
 */
export default function NumberInput({
  value,
  onChange,
  maxDigits = 2,
  width = 56,
  fontSize = '0.9rem',
  ariaLabel = ''
}) {
  const shown = value === 0 ? 0 : (value ?? ''); // mostrar 0 si es 0, si no permitir ""

  const handleChange = (e) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    const trimmed = v.slice(0, maxDigits);
    // Ajuste 1: no forzar 0; permitir vacío
    onChange && onChange(trimmed === '' ? '' : trimmed);
  };

  const handleBlur = (e) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    // Ajuste 1: normalizar a 0 SOLO en blur
    onChange && onChange(v === '' ? 0 : v);
  };

  return (
    <input
      aria-label={ariaLabel}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      style={{ width, textAlign: 'center', fontSize, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 8 }}
      value={String(shown)}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={(e) => e.target.select()}
    />
  );
}
