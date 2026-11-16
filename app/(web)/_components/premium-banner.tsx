// app/(web)/_components/premium-banner.tsx
// Баннер «Включи Премиум» в сайдбаре/профиле. Ведёт на промо-страницу
// /subscriptions/premium (реальный роут приложения).
'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PremiumBannerProps {
  className?: string;
  avatars: string[];
}

export function PremiumBanner({ className, avatars }: PremiumBannerProps) {
  return (
    <div className={cn("mb-3", className)}>
      <h3 className="text-base font-medium text-accent-foreground mb-2">Премиум доступ</h3>
      <Link 
        href="/subscriptions/premium" 
        className="block relative mb-6 overflow-hidden rounded-md p-3 shadow-sm border border-green-200 dark:border-green-800/50 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/40 dark:to-emerald-950/20 transition-colors"
      >
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex items-center -space-x-3 shrink-0">
            {avatars[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatars[0]} className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-md" alt="Девушка 1" />
            )}
            {avatars[1] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatars[1]} className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-md" alt="Девушка 2" />
            )}
            <div className="flex w-12 h-12 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-yellow-400 to-amber-600 shadow-md z-10">
              <svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 text-left pl-2 pr-4">
            <h4 className="font-bold text-green-900 dark:text-green-100 text-base">
              Хочешь больше возможностей?
            </h4>
            <p className="text-green-700/80 dark:text-green-300/80 text-xs mt-0.5">
              Оформи Premium и получи свободу общения!
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}