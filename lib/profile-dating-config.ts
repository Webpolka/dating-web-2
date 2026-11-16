// lib/profile-config.ts
//
// Конфиг целей знакомства — переиспользуемый в:
//   - profile-preferences.tsx (редактирование своего профиля)
//   - search-panel.tsx (фильтры поиска)
//   - registration form (выбор при регистрации)
//
// Иконки — SVG path для lucide-react (stroke-width 1.5).
// Чтобы использовать: <svg><path d="{icon}" /></svg>
// Или через lucide: найти подходящую иконку по path.

export interface DatingGoal {
  key: string;
  label: string;
  icon: string;  // SVG path data
}

export const DATING_GOALS: DatingGoal[] = [
  {
    key: 'friends',
    label: 'Поиск друзей',
    icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
  },
  {
    key: 'family',
    label: 'Создание семьи',
    icon: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 21h18M8.25 12h7.5M6 6.75h12M6 12V6.75M18 12V6.75M4.5 3.75h15M4.5 21v-8.25',
  },
  {
    key: 'travel',
    label: 'Путешествия',
    icon: 'M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5',
  },
  {
    key: 'romantic',
    label: 'Романтические отношения',
    icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z',
  },
  {
    key: 'casual',
    label: 'Свободные отношения',
    icon: 'M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z',
  },
];

// Хелпер: получить label по key
export function getDatingGoalLabel(key: string): string {
  return DATING_GOALS.find((g) => g.key === key)?.label ?? key;
}

// Хелпер: получить массив label-ов по массиву key-ей
export function getDatingGoalLabels(keys: string[] | null | undefined): string[] {
  if (!keys || !Array.isArray(keys)) return [];
  return keys.map(getDatingGoalLabel).filter(Boolean);
}