// app/(web)/premium/_components/premium-page-client.tsx
// Информационная страница Premium-доступа — перенос Blade-шаблона.
// ОБНОВЛЁННАЯ ВЕРСИЯ:
// 1) Тексты преимуществ, likesCount и avatars взяты из PremiumController (старый Blade-проект)
// 2) НОВОЕ: если у пользователя уже есть активный Premium — показываем страницу "404 не найдено"
//    (аналог старого редиректа из PremiumController при has_active_premium)
// 3) НОВОЕ: кнопка "Включить Премиум" теперь открывает PremiumModal через ui-store
//    (раньше была заглушка с toast.info('Скоро...'))

'use client';

import { useEffect } from 'react';
import {
  MessageCircle, Heart, Users, Star, Eye, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';

// Иконки для преимуществ — TypeScript-safe lookup.
// Ключи соответствуют $benefits[i]['icon'] из PremiumController.
const BENEFIT_ICONS = {
  message: MessageCircle,
  heart: Heart,
  users: Users,
  star: Star,
  eye: Eye,
  ban: Ban,
} as const;

type BenefitKey = keyof typeof BENEFIT_ICONS;

interface Benefit {
  icon: BenefitKey;
  text: string;
}

// Настоящие тексты из App\Http\Controllers\Web\Subscriptions\PremiumController.
const BENEFITS: Benefit[] = [
  { icon: 'message', text: 'Свободно пиши всем девушкам, которые понравились' },
  { icon: 'heart', text: 'Посмотри, кто поставил тебе лайк и не против встретиться' },
  { icon: 'users', text: 'Увеличь шансы в 10 раз — напиши сразу нескольким девушкам' },
  { icon: 'star', text: 'Получи преимущество в общении с новыми и популярными девушками' },
  { icon: 'eye', text: 'Просматривай анкеты в режиме «Невидимки»' },
  { icon: 'ban', text: 'Отключи показ рекламы' },
];

// likesCount = 14 (из PremiumController, пока хардкод — бэкенда для этого нет).
const LIKES_COUNT = 14;

// 5 аватарок через pravatar.cc (бесплатный сервис), как в PremiumController.
const AVATARS = [
  'https://i.pravatar.cc/100?img=1',
  'https://i.pravatar.cc/100?img=5',
  'https://i.pravatar.cc/100?img=9',
  'https://i.pravatar.cc/100?img=20',
  'https://i.pravatar.cc/100?img=33',
];

export function PremiumPageClient() {
  // NEW: читаем auth-store чтобы понять, есть ли уже Premium у пользователя.
  // И ui-store чтобы открыть PremiumModal по клику "Включить Премиум".
  const { user } = useAuthStore();
  const { openPremiumModal } = useUIStore();

  // NEW: если у пользователя уже есть активный Premium — показываем "404 не найдено"
  // и тост "У вас уже активен Премиум-доступ". Аналог старого редиректа из PremiumController.
  // toast.info вызывается ОДИН раз при монтировании — через useEffect, чтобы не
  // дублировался при каждом re-render.
  useEffect(() => {
    if (user?.has_active_premium) {
      toast.info('У вас уже активен Премиум-доступ');
    }
  }, [user?.has_active_premium]);

  if (user?.has_active_premium) {
    return <NotFoundPlaceholder />;
  }

  // Обработчик клика по кнопке "Включить Премиум" — открывает PremiumModal.
  const handleBuyPremium = () => {
    openPremiumModal();
  };

  return (
    <div className="pb-8">
      {/* БЛОК 1: ПОНРАВИВШИЕСЯ ЛЮДИ (Широкая плашка + Аватарки на границе) */}
      <div className="relative w-full -mx-4 px-4 md:mx-0 md:px-0">
        {/* Плашка (30% прозрачность основного цвета) */}
        <div className="w-full bg-orange-500/30 dark:bg-orange-500/20 pt-6 pb-16 flex flex-col items-center gap-6 border border-orange-500/20">
          {/* Текст с сердечком */}
          <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm text-red-600 dark:text-red-400 border border-red-500/30 rounded-full px-5 py-2 shadow-sm">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
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
            Свобода общения и новые свидания с{' '}
            <span className="text-amber-500">Премиум</span>-доступом
          </h1>
        </div>

        {/* БЛОК 2: ПРЕИМУЩЕСТВА ПРЕМИУМА (Карточки с иконками на границе) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
          {BENEFITS.map((benefit, i) => {
            const IconComponent = BENEFIT_ICONS[benefit.icon];
            return (
              <div
                key={i}
                className="relative bg-orange-500/10 dark:bg-orange-500/5 border border-orange-500/20 rounded-lg px-6 pt-8 pb-3 flex flex-col items-center text-center gap-3 shadow-sm"
              >
                {/* Иконка (протыкает верхнюю границу) */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg border-4 border-background">
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

        {/* КНОПКА ПОКУПКИ — открывает PremiumModal через ui-store */}
        <div className="flex justify-center pb-4">
          <button
            onClick={handleBuyPremium}
            className="w-full max-w-sm flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg shadow-lg hover:from-orange-600 hover:to-amber-600 transition-all text-lg"
          >
            <Star className="w-6 h-6 fill-current" />
            Включить Премиум
          </button>
        </div>
      </div>
    </div>
  );
}

// NEW: кастомная страница "404 не найдено" — показывается, если у пользователя
// уже есть активный Premium. Аналогично vip-page-client.tsx.
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
