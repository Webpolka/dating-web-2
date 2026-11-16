// lib/birthdate.ts
//
// Общие константы и хелперы для поля «дата рождения» (три селекта: день/месяц/год).
// Раньше MONTHS и парсинг даты дублировались в register-form, register-modal
// и profile-header.

/** Дни 1–31 (строками — значения для Select). */
export const BIRTH_DAYS: string[] = Array.from({ length: 31 }, (_, i) =>
  String(i + 1),
);

/** Названия месяцев на русском (индекс 0 = январь). */
export const BIRTH_MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

/**
 * Годы для формы регистрации: 1950–2010.
 * Диапазон совпадает с серверной валидацией register (birth_year 1950–2010).
 */
export const BIRTH_YEARS: string[] = Array.from(
  { length: 61 },
  (_, i) => String(2010 - i),
);

/** Проверяет, что дата реальная (нет 31 февраля и т.п.). */
export function isRealDate(day: string, month: string, year: string): boolean {
  if (!day || !month || !year) return false;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return (
    d.getFullYear() === Number(year) &&
    d.getMonth() + 1 === Number(month) &&
    d.getDate() === Number(day)
  );
}

/** Парсит ISO-строку «1983-04-16» в { day, month, year }. */
export function parseBirthDate(
  iso: string | null | undefined,
): { day: string; month: string; year: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: String(d.getUTCDate()).padStart(2, '0'),
    month: String(d.getUTCMonth() + 1).padStart(2, '0'),
    year: String(d.getUTCFullYear()),
  };
}

/** Собирает «YYYY-MM-DD» из трёх строк (null, если что-то не заполнено). */
export function buildBirthDate(
  day: string,
  month: string,
  year: string,
): string | null {
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
