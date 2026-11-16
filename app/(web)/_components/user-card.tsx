// app/(web)/_components/user-card.tsx
//
// Карточка пользователя в ленте/поиске. Клик по карточке — переход в профиль
// /user/{slug}. Кнопка «Написать» для гостя открывает модалку логина
// (чат будет подключён позже на стороне бэкенда).

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, MessageCircle, User } from 'lucide-react';
import type { FeedUser } from '@/lib/api-types';

interface UserCardProps {
  user: FeedUser;
  index: number;
  isAuth: boolean;
  onWriteClick?: () => void;
}

export function UserCard({ user, index, isAuth, onWriteClick }: UserCardProps) {
  const router = useRouter();

  // Анимация появления (только для первых 9 — потом без задержки)
  const animationDelay = `${Math.min((index % 9) * 75, 400)}ms`;

  const handleCardClick = () => {
    router.push(`/user/${user.slug}`);
  };

  const handleWriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuth) {
      onWriteClick?.();
      return;
    }

    // TODO(чат): переход в чат /chat?user={slug} — после подключения чата на бэке
  };

  return (
    <div
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleCardClick();
      }}
      role="button"
      tabIndex={0}
      style={{
        animation: 'fadeInUp 0.4s ease-out forwards',
        animationDelay,
        opacity: 0,
      }}
      className={`relative group rounded-sm overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        user.has_premium
          ? 'border-2 border-yellow-400 shadow-md shadow-yellow-400/30'
          : 'border-border'
      }`}
    >
      {/* Область фото */}
      <div className="aspect-[5/4] bg-muted relative">
        {user.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photo}
            alt={user.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <User className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Бейдж количества фото */}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm z-10">
          <Camera className="w-3 h-3" />
          <span>{user.photos_count}</span>
        </div>
      </div>

      {/* Контент карточки */}
      <div className="p-3 space-y-1.5 text-sm flex-1 flex flex-col">
        {/* Имя, возраст, зодиак */}
        <div className="font-semibold text-foreground flex items-baseline gap-1">
          <span className="truncate">{user.name}</span>,
          <span>{user.age}</span>
          <span className="font-normal text-muted-foreground text-xs">
            ({user.zodiac})
          </span>
        </div>

        {/* Город */}
        <div className="text-muted-foreground text-xs truncate">
          {user.city}
        </div>

        {/* Дистанция */}
        <div className="flex items-center gap-1 text-primary text-xs w-fit mt-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {user.distance ? `В ${user.distance} от вас` : 'Геолокация не указана'}
          </span>
        </div>

        {/* Статус онлайн */}
        <div className="flex items-center gap-1.5 text-xs pt-1">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              user.is_online ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          <span
            className={`font-medium truncate ${
              user.is_online ? 'text-green-600' : 'text-muted-foreground'
            }`}
          >
            {user.status_text}
          </span>
        </div>

        {/* Кнопка "Написать" */}
        <Button
          variant="ghost"
          onClick={handleWriteClick}
          className="mt-auto pt-2 w-full bg-primary/10 text-primary hover:bg-primary/20 font-medium py-2 rounded-sm transition-colors flex items-center justify-center gap-1.5 text-xs h-auto"
        >
          <MessageCircle className="w-4 h-4" />
          Написать
        </Button>
      </div>
    </div>
  );
}