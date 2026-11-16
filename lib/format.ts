// lib/format.ts
//
// Общие функции форматирования для UI.
// formatDateHuman раньше дублировался в user-gifts.tsx и profile-gifts.tsx.

/** Дата для ленты подарков: «Сегодня» / «Вчера» / «12 марта 2025 г.». */
export function formatDateHuman(dateStr: string | null | undefined): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Цена в рублях: «250 ₽» (без копеек, если целое) — общая для модалок оплаты. */
export function formatPrice(price: number): string {
  return price % 1 === 0
    ? `${price.toLocaleString('ru-RU')} ₽`
    : `${price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`;
}
