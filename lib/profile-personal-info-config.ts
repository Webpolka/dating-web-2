// lib/personal-info-config.ts
//
// Конфиг опций для секции "Личная информация" профиля.
// Все select-ы и чекбоксы — здесь, не дублируем в компоненте.
// Значения (value) совпадают с числовыми кодами на бэкенде (UserProfile).

// === Внешность ===
export const BODY_TYPE_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 1, label: 'Стройное' },
  { value: 3, label: 'Спортивное' },
  { value: 5, label: 'Есть пара лишних кило' },
  { value: 6, label: 'Полное' },
];

export const EYE_COLOR_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 1, label: 'Карие' },
  { value: 2, label: 'Серые' },
  { value: 3, label: 'Голубые' },
  { value: 4, label: 'Зеленые' },
];

export const HAIR_COLOR_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 1, label: 'Блонд' },
  { value: 2, label: 'Русые' },
  { value: 3, label: 'Шатен' },
  { value: 9, label: 'Черные' },
  { value: 4, label: 'Рыжие' },
  { value: 7, label: 'Седые' },
  { value: 6, label: 'Мелированные' },
  { value: 8, label: 'Бритая наголо' },
];

export const BODY_DECORATIONS = [
  { value: 1, label: 'Пирсинг' },
  { value: 2, label: 'Татуировки' },
  { value: 3, label: 'Шрамы' },
  { value: 5, label: 'Веснушки' },
];

// === Отношения ===
export const RELATIONSHIP_STATUS_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 5, label: 'Свободен' },
  { value: 1, label: 'Занят' },
  { value: 2, label: 'Женат, живем порознь' },
  { value: 3, label: 'Всё сложно' },
];

// === Дети ===
export const CHILDREN_STATUS_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 5, label: 'Нет, и не хочу' },
  { value: 8, label: 'Нет, и ищу без детей' },
  { value: 2, label: 'Возможны в будущем' },
  { value: 6, label: 'Уже есть, больше не хочу' },
  { value: 7, label: 'Уже есть, хочу еще' },
];

// === Животные ===
export const PETS_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 3, label: 'Собака' },
  { value: 2, label: 'Кошка' },
  { value: 5, label: 'Нет' },
  { value: 6, label: 'Нет, и не хочу' },
  { value: 1, label: 'Да, много разных' },
];

// === Жильё ===
export const HOUSING_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 1, label: 'Собственная квартира' },
  { value: 7, label: 'Дом, коттедж' },
  { value: 8, label: 'Снимаю квартиру' },
  { value: 9, label: 'Снимаю комнату' },
  { value: 3, label: 'Живу у родителей' },
  { value: 10, label: 'Без жилья' },
];

// === Авто ===
export const HAS_CAR_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 1, label: 'Нет' },
  { value: 3, label: 'Есть' },
];

// === Образование ===
export const EDUCATION_LEVEL_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 2, label: 'Среднее' },
  { value: 3, label: 'Среднее-специальное' },
  { value: 4, label: 'Студент(-ка)' },
  { value: 5, label: 'Неполное высшее' },
  { value: 6, label: 'Высшее' },
  { value: 8, label: 'Несколько высших' },
];

// === Доход ===
export const INCOME_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 2, label: 'Хватает только на основное' },
  { value: 3, label: 'Хватает на основное и отдых' },
  { value: 4, label: 'На всё хватает и остаётся' },
];

// === Курение ===
export const SMOKING_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 8, label: 'Против курения' },
  { value: 1, label: 'Не курю, но не против' },
  { value: 5, label: 'Иногда курю' },
  { value: 9, label: 'Курю электронные сигареты' },
  { value: 2, label: 'Курю регулярно' },
];

// === Алкоголь ===
export const ALCOHOL_OPTIONS = [
  { value: 0, label: 'Нет ответа' },
  { value: 5, label: 'Против алкоголя' },
  { value: 1, label: 'Не пью, но не против' },
  { value: 3, label: 'Иногда выпиваю' },
];

// === Языки ===
export const LANGUAGES = [
  { value: 1, label: 'Русский' },
  { value: 8, label: 'Украинский' },
  { value: 2, label: 'Английский' },
  { value: 3, label: 'Немецкий' },
  { value: 4, label: 'Французский' },
  { value: 5, label: 'Итальянский' },
  { value: 6, label: 'Испанский' },
  { value: 7, label: 'Португальский' },
  { value: 10, label: 'Арабский' },
  { value: 9, label: 'Иврит' },
  { value: 11, label: 'Корейский' },
  { value: 12, label: 'Китайский' },
  { value: 13, label: 'Нидерландский' },
  { value: 14, label: 'Индонезийский' },
  { value: 15, label: 'Японский' },
  { value: 16, label: 'Шведский' },
  { value: 17, label: 'Тайский' },
  { value: 18, label: 'Вьетнамский' },
  { value: 20, label: 'Турецкий' },
  { value: 19, label: 'Хинди' },
];

// === Спорт ===
export const SPORTS = [
  { value: 1, label: 'Бег' },
  { value: 2, label: 'Ходьба' },
  { value: 3, label: 'Фитнес' },
  { value: 4, label: 'Плавание' },
  { value: 5, label: 'Велосипед' },
  { value: 7, label: 'Ролики' },
  { value: 8, label: 'Лыжи' },
  { value: 9, label: 'Качалка' },
  { value: 10, label: 'Экстрим' },
  { value: 11, label: 'Единоборства' },
  { value: 12, label: 'Йога' },
  { value: 13, label: 'Командные игры' },
  { value: 14, label: 'Танцы' },
  { value: 16, label: 'Футбол' },
  { value: 17, label: 'Волейбол' },
  { value: 19, label: 'Хоккей' },
  { value: 20, label: 'Коньки' },
  { value: 22, label: 'Пилатес' },
  { value: 23, label: 'Гимнастика' },
  { value: 24, label: 'Скалолазание' },
  { value: 25, label: 'Тренировки на улице' },
];

// === Хелпер: получить label по value из массива опций ===
export function getLabelByValue(
  options: { value: number; label: string }[],
  value: number | null | undefined,
): string | null {
  if (value === null || value === undefined || value === 0) return null;
  return options.find((o) => o.value === value)?.label ?? null;
}

// === Хелпер: получить массив label-ов по массиву value-ей ===
export function getLabelsByValues(
  options: { value: number; label: string }[],
  values: number[] | null | undefined,
): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean) as string[];
}
