// app/(web)/vip/_components/vip-page-client.tsx
// Информационная страница VIP-статуса — перенос Blade-шаблона.
// ОБНОВЛЁННАЯ ВЕРСИЯ:
// 1) Тексты преимуществ, likesCount и avatars взяты из VipController (старый Blade-проект)
// 2) НОВОЕ: если у пользователя уже есть активный VIP — показываем страницу "404 не найдено"
//    (аналог старого редиректа из VipController при has_active_vip)
// 3) НОВОЕ: кнопка "Включить VIP-статус" теперь открывает VipModal через ui-store

'use client';

import { useEffect } from 'react';
import { Gem, TrendingUp, Image as ImageIcon, MessageCircle, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';

// Иконки для преимуществ — TypeScript-safe lookup.
// Ключи соответствуют $benefits[i]['icon'] из VipController.
const BENEFIT_ICONS = {
  top: TrendingUp,
  photo: ImageIcon,
  message: MessageCircle,
} as const;

type BenefitKey = keyof typeof BENEFIT_ICONS;

interface Benefit {
  icon: BenefitKey;
  text: string;
}

// ИЗМЕНЕНО: настоящие тексты из App\Http\Controllers\Web\Subscriptions\VipController.
const BENEFITS: Benefit[] = [
  { icon: 'top', text: 'Показ в Топе раз в три дня' },
  { icon: 'photo', text: 'Фото показываются первыми в знакомствах' },
  { icon: 'message', text: 'Сообщения показываются выше других' },
];

// ИЗМЕНЕНО: likesCount = 14 (из VipController, пока хардкод — бэкенда для этого нет).
const LIKES_COUNT = 14;

// ИЗМЕНЕНО: 5 аватарок через pravatar.cc (бесплатный сервис), как в VipController.
const AVATARS = [
  'https://i.pravatar.cc/100?img=1',
  'https://i.pravatar.cc/100?img=5',
  'https://i.pravatar.cc/100?img=9',
  'https://i.pravatar.cc/100?img=20',
  'https://i.pravatar.cc/100?img=33',
];

export function VipPageClient() {
  // NEW: читаем auth-store чтобы понять, есть ли уже VIP у пользователя.
  // И ui-store чтобы открыть VipModal по клику "Включить VIP-статус".
  const { user } = useAuthStore();
  const { openVipModal } = useUIStore();

  // NEW: если у пользователя уже есть активный VIP — показываем "404 не найдено"
  // и тост "У вас уже активен VIP-статус". Аналог старого редиректа из VipController.
  // toast.info вызывается ОДИН раз при монтировании — через useEffect, чтобы не
  // дублировался при каждом re-render.
  useEffect(() => {
    if (user?.has_active_vip) {
      toast.info('У вас уже активен VIP-статус');
    }
  }, [user?.has_active_vip]);

  if (user?.has_active_vip) {
    return <NotFoundPlaceholder />;
  }

  return (
    <div className="pb-8">
      {/* БЛОК 1: ПОНРАВИВШИЕСЯ ЛЮДИ (Широкая плашка + Аватарки на границе) */}
      <div className="relative w-full -mx-4 px-4 md:mx-0 md:px-0">
        {/* Плашка (30% прозрачность синего) */}
        <div className="w-full bg-blue-500/30 dark:bg-blue-500/20 pt-6 pb-16 flex flex-col items-center gap-6 border border-blue-500/20">
          {/* Текст с сердечком */}
          <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm text-red-600 dark:text-red-400 border border-red-500/30 rounded-full px-5 py-2 shadow-sm">
            <Star className="w-5 h-5 text-red-500 fill-current" />
            <span className="font-semibold text-sm">
              Ты понравился {LIKES_COUNT} девушкам. Они не против пообщаться
            </span>
          </div>
        </div>

        {/* Ряд аватарок (лежат на нижней границе плашки) */}
        <div className="flex justify-center -mt-12">
          <div className="flex items-center justify-center -space-x-6">
            {AVATARS.map((avatar, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-full border-4 border-card object-cover shadow-md"
              />
            ))}

            {/* Пульсирующий красный кружок с числом */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"></div>
              <div className="relative w-24 h-24 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-2xl border-4 border-card shadow-md">
                +{LIKES_COUNT}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Новые возможности и ещё больше знакомств с{' '}
            <span className="text-blue-500">VIP</span>-статусом
          </h1>
        </div>

        {/* БЛОК 2: ПРЕИМУЩЕСТВА VIP (Карточки с иконками на границе) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-10">
          {BENEFITS.map((benefit, i) => {
            const IconComponent = BENEFIT_ICONS[benefit.icon];
            return (
              <div
                key={i}
                className="relative bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 rounded-lg px-6 pt-8 pb-3 flex flex-col items-center text-center gap-3 shadow-sm"
              >
                {/* Иконка (протыкает верхнюю границу) */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg border-4 border-background">
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* Текст преимущества */}
                <p className="text-sm text-foreground/90 font-medium leading-snug">
                  {benefit.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* КНОПКА ПОКУПКИ — открывает VipModal через ui-store */}
        <div className="flex justify-center pb-4">
          <button
            onClick={openVipModal}
            className="w-full max-w-sm flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-lg shadow-lg hover:from-blue-600 hover:to-indigo-600 transition-all text-lg"
          >
            <Gem className="w-6 h-6" />
            Включить VIP-статус
          </button>
        </div>
      </div>
    </div>
  );
}

// NEW: кастомная страница "404 не найдено" — показывается, если у пользователя
// уже есть активный VIP. Аналогично premium-page-client.tsx.
// Используем собственный JSX вместо next/navigation notFound() — потому что
// notFound() требует Server Component, а у нас Client Component.
function NotFoundPlaceholder() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-extrabold text-muted-foreground mb-4">404</h1>
        <p className="text-lg font-medium text-foreground mb-2">Страница не найдена</p>
        <p className="text-sm text-muted-foreground">
          Страница, которую вы ищете, не существует или была перемещена.
        </p>
      </div>
    </div>
  );
}
