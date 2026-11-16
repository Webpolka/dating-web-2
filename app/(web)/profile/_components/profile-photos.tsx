// app/(web)/profile/_components/profile-photos.tsx
//
// "Мои фото" — статичная секция.
//
// Структура:
//   - Заголовок "Мои фото" + ссылка "Все фото" справа
//   - Grid из 6 квадратиков (aspect-square, rounded-sm, gap-0.5):
//     [0] — кнопка "Добавить фото" (bg-primary, иконка Camera + Plus в кружочке)
//     [1..5] — фото пользователя или серый плейсхолдер (с серой иконкой Camera+Plus)
//
// Клик по "Добавить фото" / "Все фото" → переход на страницу управления фото
// (загрузка/удаление сейчас живут на /onboarding)

'use client';

import Link from 'next/link';
import { Camera, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { UserPhoto } from '@/lib/api-types';

interface ProfilePhotosProps {
  photos: UserPhoto[] | null;
  className?: string;
}

const PHOTOS_PAGE_URL = '/onboarding';

export function ProfilePhotos({ photos, className }: ProfilePhotosProps) {
  // Берём максимум 5 фото, сортируем: is_primary первыми, потом по position
  const sortedPhotos = (photos || [])
    .slice()
    .sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.position ?? 999) - (b.position ?? 999);
    })
    .slice(0, 5);

  // Строим массив из 5 элементов: фото или null (плейсхолдер)
  const slots: (UserPhoto | null)[] = Array.from({ length: 5 }, (_, i) =>
    sortedPhotos[i] ?? null,
  );

  return (
    <div className={cn('mb-6', className)}>
      {/* === Заголовок + ссылка "Все фото" === */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-accent-foreground">
          Мои фото
        </h3>
        <Link
          href={PHOTOS_PAGE_URL}
          className="text-xs text-blue-500 hover:underline"
        >
          Все фото
        </Link>
      </div>

      {/* === Grid из 6 квадратиков === */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-0.5">
        {/* [0] — кнопка "Добавить фото" (синяя, без border, hover осветляется) */}
        <Link
          href={PHOTOS_PAGE_URL}
          className={cn(
            'aspect-square rounded-sm flex items-center justify-center',
            'bg-primary hover:brightness-150 transition-all',
          )}
          aria-label="Добавить фото"
        >
          {/* Обёртка relative для иконки — плюсик привязан к ИКОНКЕ, не к квадратику */}
          <div className="relative w-2/5 h-2/5">
            {/* Фотоаппарат (пухленький, занимает треть ширины квадратика) */}
            <Camera
              className="w-full h-full text-primary-foreground"
              strokeWidth={2.5}
            />
            {/* Плюсик в правом нижнем углу ИКОНКИ, в белом кружочке */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary-foreground rounded-full flex items-center justify-center shadow-sm">
              <Plus
                className="w-4 h-4 text-primary"
                strokeWidth={4}
              />
            </div>
          </div>
        </Link>

        {/* [1..5] — фото или серые плейсхолдеры */}
        {slots.map((photo, idx) => {
          if (photo) {
            // Есть фото — показываем картинку (без border)
            return (
              <Link
                key={photo.id || idx}
                href={PHOTOS_PAGE_URL}
                className={cn(
                  'aspect-square rounded-sm overflow-hidden bg-muted',
                  'hover:opacity-80 transition-opacity',
                  photo.is_primary && 'ring-1 ring-primary',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumb_url || photo.medium_url || photo.url || ''}
                  alt="Фото профиля"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </Link>
            );
          }

          // Нет фото — серый плейсхолдер с такой же иконкой (только серой)
          return (
            <div
              key={`placeholder-${idx}`}
              className={cn(
                'aspect-square rounded-sm flex items-center justify-center',
                'bg-muted/50',
              )}
            >
              {/* Та же иконка, но серая и тусклая */}
              <div className="relative w-2/5 h-2/5">
                <Camera
                  className="w-full h-full text-muted-foreground/50"
                  strokeWidth={2.5}
                />
                {/* Серый плюсик в сером кружочке */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-muted rounded-full flex items-center justify-center">
                  <Plus
                    className="w-4 h-4 text-muted-foreground/50"
                    strokeWidth={4}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}