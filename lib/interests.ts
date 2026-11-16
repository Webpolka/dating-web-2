// lib/interests.ts
//
// Клиент справочника интересов + нормализация ответа GET /api/interests.
//
// ЗАЧЕМ НОРМАЛИЗАЦИЯ: формат этого endpoint'а менялся вместе с бэкендом
// (интересы переехали в таблицу БД). Чтобы фронт больше не падал
// («categories.forEach is not a function») и не показывал пустой дропдаун,
// приводим к канонической структуре «категории → интересы» любой из
// реалистичных вариантов ответа:
//
//   1. { categories: [{ id, name, interests: [...] }] }  — текущий формат API
//   2. { categories: { data: [...] } }                   — обёртка пагинации
//   3. { data: [...] }                                   — JsonResource-обёртка
//   4. [ { id, name, interests: [...] }, ... ]           — массив категорий
//   5. [ { id, name, category_id | category }, ... ]     — плоский список
//      интересов (группируется по категориям на клиенте)
//
// Ответ также кэшируется на время жизни страницы: справочник одинаковый
// для всех, а InterestMultiSelect монтируется и в поиске, и в профиле.

import api from '@/lib/api';
import type { Interest, InterestCategory } from '@/lib/api-types';

/** Приземлённая проверка «похоже на интерес». */
function isInterestLike(value: unknown): value is Interest & {
  category_id?: number;
  category?: { id: number; name: string; slug: string } | null;
} {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    (typeof v.id === 'number' || typeof v.id === 'string') &&
    typeof v.name === 'string' &&
    v.name.length > 0
  );
}

/** Приземлённая проверка «похоже на категорию с интересами». */
function isCategoryLike(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === 'string' && v.name.length > 0 && Array.isArray(v.interests);
}

/** Группирует плоский список интересов по категории. */
function groupFlatInterests(items: unknown[]): InterestCategory[] {
  const groups = new Map<string, InterestCategory>();

  for (const raw of items) {
    if (!isInterestLike(raw)) continue;
    const interest = raw as Interest & {
      category_id?: number | null;
      category?: { id: number; name: string; slug: string } | null;
    };

    const category = interest.category ?? null;
    const categoryId = category?.id ?? interest.category_id ?? 0;
    const groupKey = String(categoryId);

    let group = groups.get(groupKey);
    if (!group) {
      group = {
        id: categoryId,
        name: category?.name ?? 'Другое',
        slug: category?.slug ?? `category-${groupKey}`,
        icon: null,
        interests: [],
      };
      groups.set(groupKey, group);
    }
    group.interests.push({
      id: Number(interest.id),
      name: interest.name,
      slug: interest.slug ?? String(interest.id),
      users_count: interest.users_count,
    });
  }

  return Array.from(groups.values());
}

/**
 * Приводит произвольный ответ /interests к InterestCategory[].
 * Никогда не бросает исключение; при нераспознанном формате возвращает [].
 */
export function normalizeInterestCategories(input: unknown): InterestCategory[] {
  if (input === null || input === undefined) return [];

  // Снимаем обёртки: { categories: X } → X, { data: X } → X, { data: { data: X } } → X …
  let payload: unknown = input;
  for (let depth = 0; depth < 3; depth++) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) break;
    const obj = payload as Record<string, unknown>;
    const next: unknown = obj.categories ?? obj.interests ?? obj.data ?? obj;
    if (next === payload) break; // больше нечего разворачивать
    payload = next;
  }

  if (!Array.isArray(payload)) return [];

  const categoryLike = payload.filter(isCategoryLike);
  if (categoryLike.length > 0) {
    // Формат «категории с interests» — нормализуем каждую.
    return categoryLike
      .map((raw) => {
        const cat = raw as unknown as {
          id: number;
          name: string;
          slug: string;
          icon: string | null;
          interests: unknown[];
        };
        return {
          id: Number(cat.id ?? 0),
          name: String(cat.name),
          slug: String(cat.slug ?? ''),
          icon: cat.icon ?? null,
          interests: (Array.isArray(cat.interests) ? cat.interests : []).filter(
            isInterestLike,
          ) as Interest[],
        };
      })
      .filter((cat) => cat.interests.length > 0);
  }

  // Плоский список интересов — группируем по категории.
  const flat = payload.filter(isInterestLike);
  if (flat.length > 0) return groupFlatInterests(flat);

  return [];
}

/** Кэш запроса справочника на время жизни страницы (одинаковый для всех мест). */
let interestsPromise: Promise<InterestCategory[]> | null = null;

/**
 * Загружает справочник интересов (GET /interests) с кэшированием.
 * Пустой результат и ошибки не кэшируются — следующая попытка снова дёрнет API.
 */
export function fetchInterestCategories(): Promise<InterestCategory[]> {
  if (!interestsPromise) {
    interestsPromise = api
      .get('/interests')
      .then((res) => {
        const groups = normalizeInterestCategories(res.data);
        if (groups.length === 0) interestsPromise = null; // не кэшируем пустой/битый ответ
        return groups;
      })
      .catch((err: unknown) => {
        interestsPromise = null; // при ошибке даём повторить позже
        throw err;
      });
  }
  return interestsPromise;
}
