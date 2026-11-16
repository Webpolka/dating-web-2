// lib/subscriptions.ts
//
// Общая логика модалок покупки подписок (VIP и Premium):
//   - useSubscriptionPlans(tier, isOpen) — загрузка тарифов с защитой от
//     неожиданного формата ответа;
//   - buildSubscriptionReturnUrl() — куда вернуть пользователя после оплаты;
//   - formatPrice — в lib/format.ts.
//
// Раньше это дублировалось в vip-modal.tsx и premium-modal.tsx один в один.

'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { SubscriptionPlan } from '@/lib/api-types';

/**
 * Загружает тарифы подписки при открытии модалки.
 * Возвращает { plans, loading }. plans всегда массив — если бэк вернул
 * неожиданный формат, показываем «нет доступных тарифов» вместо краша.
 */
export function useSubscriptionPlans(
  tier: 'vip' | 'premium',
  isOpen: boolean,
): { plans: SubscriptionPlan[]; loading: boolean } {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<{ plans?: SubscriptionPlan[] }>(
          `/subscriptions/plans?tier=${tier}`,
        );
        if (cancelled) return;
        const list = Array.isArray(data?.plans) ? data.plans : [];
        setPlans(list);
      } catch (err) {
        console.error(`[useSubscriptionPlans] Failed to load ${tier} plans`, err);
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tier, isOpen]);

  return { plans, loading };
}

/**
 * Вычисляет return_url для POST /subscriptions/pay.
 *
 * 1) Модалка открыта с обычной страницы — возвращаем на неё же.
 * 2) Модалка открыта с промо-страницы (/subscriptions/vip или /subscriptions/premium) —
 *    возвращаем на предыдущую страницу (referrer): после покупки промо-страница
 *    уже неактуальна. Защита от циклов: referrer на success-страницу или чужой
 *    домен → '/'.
 */
export function buildSubscriptionReturnUrl(): string {
  const currentPath = window.location.pathname;
  const isPromoPage =
    currentPath === '/subscriptions/vip' || currentPath === '/subscriptions/premium';

  if (!isPromoPage) {
    return currentPath + window.location.search;
  }

  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      if (referrerUrl.origin === window.location.origin) {
        const isSuccessPage =
          referrerUrl.pathname.startsWith('/subscriptions/success') ||
          referrerUrl.pathname.startsWith('/billing/success');
        if (!isSuccessPage) {
          return referrerUrl.pathname + referrerUrl.search;
        }
      }
    } catch {
      // некорректный referrer — fallback ниже
    }
  }

  return '/';
}
