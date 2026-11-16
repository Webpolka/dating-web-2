// app/(web)/_components/vip-banner.tsx
// Баннер «Включи VIP» в сайдбаре/профиле. Ведёт на промо-страницу
// /subscriptions/vip (реальный роут приложения).
'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface VipBannerProps {
  className?: string;
  avatars: string[];
}

export function VipBanner({ className, avatars }: VipBannerProps) {
  return (
    <div className={cn("mb-3", className)}>
      <h3 className="text-base font-medium text-accent-foreground mb-2">VIP Статус</h3>
      <Link 
        href="/subscriptions/vip" 
        className="block relative mb-6 overflow-hidden rounded-md p-3 shadow-sm border border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950/40 dark:to-sky-950/20 transition-colors"
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
            <div className="flex w-12 h-12 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-cyan-600 shadow-md z-10">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 3h12l4 6-6 13H10L4 9l2-6z" /> {/* Иконка бриллианта */}
              </svg>
            </div>
          </div>
          <div className="flex-1 text-left pl-2 pr-4">
            <h4 className="font-bold text-blue-900 dark:text-blue-100 text-base">
              Встань первым в поиске!
            </h4>
            <p className="text-blue-700/80 dark:text-blue-300/80 text-xs mt-0.5">
              Оформи VIP и выделяйся среди остальных.
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}