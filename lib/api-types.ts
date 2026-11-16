// lib/api-types.ts
//
// Общие типы API-ответов (DTO). Единый источник правды для всех компонентов,
// чтобы каждый файл не объявлял собственную копию интерфейса (раньше FeedUser
// был продублирован в трёх местах, UserInterest — в четырёх).

/** Карточка пользователя в поисковой выдаче (GET /users/search). */
export interface FeedUser {
  id: number;
  slug: string;
  name: string;
  age: number | string;
  city: string;
  is_online: boolean;
  has_premium: boolean;
  photo: string | null;
  photos_count: number;
  zodiac: string;
  distance: string | null;
  status_text: string;
}

/** Ответ поиска (GET /users/search) — плоская пагинация без обёртки. */
export interface SearchResponse {
  users?: FeedUser[];
  current_page?: number;
  last_page?: number;
  total?: number;
  per_page?: number;
  /** Формат ошибки при недоступности поиска: { error: true, message } */
  error?: boolean;
  message?: string;
}

/** Интерес из справочника (GET /interests). */
export interface Interest {
  id: number;
  name: string;
  slug: string;
  users_count?: number;
}

/** Категория интересов со вложенными интересами (GET /interests). */
export interface InterestCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  interests: Interest[];
}

/** Интерес в профиле пользователя (GET /user/{slug}, PATCH /profile/interests). */
export interface UserInterest {
  id: number;
  name: string;
  slug?: string;
  category?: { id: number; name: string; slug: string } | null;
}

/** Фильтры поиска — общий state FeedClient и SearchPanel. */
export interface SearchFilters {
  gender: string;
  city_id: string;
  country_id: string;
  city_label: string;
  dating_goal: string;
  activity: string;
  age: number[];
  age_from: number;
  age_to: number;
  is_new: boolean;
  verified_only: boolean;
  interest_ids: number[];
  adv1: string;
  adv1_values: string[];
  adv2: string;
  adv2_values: string[];
  adv3: string;
  adv3_values: string[];
  weight: number[];
  height: number[];
}

/** Тариф подписки (GET /subscriptions/plans?tier=vip|premium). */
export interface SubscriptionPlan {
  id: number;
  tier: 'vip' | 'premium';
  name: string;
  slug: string;
  price: number;
  old_price: number | null;
  currency: string;
  duration_days: number;
}

/** Подарок из каталога (GET /gifts). */
export interface Gift {
  id: number;
  name: string;
  price: number;
  image_url: string;
  type: string;
}

/** Подарок в профиле (user.gifts_received). */
export interface GiftReceived {
  id: number;
  image_url: string;
  snapshot_name: string;
  is_private: boolean;
  message: string | null;
  created_at: string;
  sender?: {
    slug: string;
    name: string;
    avatar_url: string;
  } | null;
}

/** Фото пользователя (user.photos, GET /onboarding/photos). */
export interface UserPhoto {
  id: number;
  url?: string | null;
  thumb_url?: string | null;
  medium_url?: string | null;
  large_url?: string | null;
  original_url?: string | null;
  path_original?: string | null;
  is_primary?: boolean;
  is_intimate?: boolean;
  position?: number;
  status?: string;
  album_name?: string;
}

/** Результат гео-поиска (GET /geo/search). */
export interface GeoResult {
  id: number;
  type: 'city' | 'country';
  label: string;
}
