// app/(web)/user/[slug]/_components/subscription-banner.tsx
'use client';

import { useAuthStore } from '@/store/auth-store';
import { PremiumBanner } from './premium-banner';
import { VipBanner } from './vip-banner';

interface SubscriptionBannerProps {
  className?: string;  
}

export function SubscriptionBanner({className}:SubscriptionBannerProps) {
  const { user } = useAuthStore();
  const avatars = ['https://i.pravatar.cc/100?img=47', 'https://i.pravatar.cc/100?img=45'];

  if (!user) return null;

  // 1. Если нет Премиума -> показываем Премиум
  if (!user.has_active_premium) {
    return <PremiumBanner className={className} avatars={avatars} />;
  }

  // 2. Если Премиум есть, но нет VIP -> показываем VIP
  if (!user.has_active_vip) {
    return <VipBanner className={className} avatars={avatars} />;
  }

  // 3. Если есть всё -> ничего не показываем
  return null;
}