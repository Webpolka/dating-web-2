// app/(auth)/subscriptions/success/_components/subscription-success-content.tsx
// Перенос Blade success-страницы подписок в Next.js.
// Polling GET /subscriptions/status/{transactionId} каждые 2 секунды.
// После успеха — fetchUser() чтобы хедер сразу показал "VIP/Премиум активен".

'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

// tier определяет цветовую схему всего экрана (blue для VIP, orange для Premium).
// Берётся из ответа бэкенда (transaction.meta['tier']).
// В SubscriptionController::status нужно добавить поле 'tier' в response.
type Tier = 'vip' | 'premium';
type Status = 'pending' | 'success' | 'failed' | 'error';

interface StatusResponse {
  status: Status;
  planName: string | null;
  endsAt: string | null;
  failReason: string | null;
  // NEW: tier нужен чтобы фронт знал, какие цвета использовать.
  // Если бэкенд НЕ возвращает tier — fallback на 'premium' (orange).
  tier?: Tier;
  // NEW: returnUrl нужен для кнопки "Продолжить".
  // Если бэкенд НЕ возвращает returnUrl — fallback на текущий pathname.
  returnUrl?: string | null;
}

export function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const { fetchUser } = useAuthStore();

  const [status, setStatus] = useState<Status>(
    transactionId ? 'pending' : 'error',
  );
  const [planName, setPlanName] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [failReason, setFailReason] = useState('');
  // tier и returnUrl задаются как null изначально — до первого ответа API
  // показываем дефолтный "premium" цвет (orange), что безопасно.
  const [tier, setTier] = useState<Tier>('premium');
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFetchedUser = useRef(false);

  useEffect(() => {
    if (!transactionId) return;

    // Polling каждые 2 секунды, останавливаемся при status !== 'pending'
    // или после MAX_POLL_ATTEMPTS попыток (не вечно — защита от вечного спиннера)
    const MAX_POLL_ATTEMPTS = 60; // 60 × 2с = 2 минуты
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > MAX_POLL_ATTEMPTS) {
        clearInterval(interval);
        setStatus('error');
        setFailReason('Не удалось дождаться подтверждения оплаты. Проверьте статус подписки позже.');
        return;
      }

      try {
        const res = await api.get<StatusResponse>(
          `/subscriptions/status/${transactionId}`,
        );
        const data = res.data;

        setStatus(data.status);
        setPlanName(data.planName ?? '');
        setEndsAt(data.endsAt ?? '');
        setFailReason(data.failReason ?? '');
        setTier(data.tier ?? 'premium');
        setReturnUrl(data.returnUrl ?? null);

        if (data.status !== 'pending') {
          clearInterval(interval);

          // При успехе — обновляем auth-store, чтобы хедер сразу показал
          // "VIP/Премиум активен до DD.MM.YYYY".
          if (data.status === 'success') {
            if (!hasFetchedUser.current) {
              hasFetchedUser.current = true;
              fetchUser().catch((err) =>
                console.error('Failed to refresh user after subscription success', err),
              );
            }
          }
        }
      } catch (error) {
        console.error('Ошибка опроса статуса подписки:', error);
        // Не сбрасываем interval — пусть продолжает попытки, вдруг сеть восстановится
        // (лимит attempts всё равно остановит поллинг).
      }
    }, 2000);

    pollRef.current = interval;

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [transactionId, fetchUser]);

  // ИЗМЕНЕНО: защита от цикла возврата (как в SubscriptionController::success в Blade).
  // Если returnUrl ведёт на /premium или /vip, заменяем на главную — иначе пользователь
  // вернётся на ту же самую информационную страницу с кнопкой "Включить" (хотя уже включил).
  const safeReturnUrl = useMemo(() => {
    if (returnUrl) {
      // Точная проверка — только '/vip' или '/premium' без query
      if (returnUrl === '/vip' || returnUrl === '/premium') {
        return '/';
      }
      return returnUrl;
    }
    // Fallback: текущий pathname
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      // Защита от цикла: если это сам success page — попадём в петлю
      if (currentPath === '/subscriptions/success') {
        return '/';
      }
      return currentPath;
    }
    return '/';
  }, [returnUrl]);

  // Цветовые классы зависят от tier — вынесены в переменные чтобы не дублировать
  // @if($tier === 'vip') логику как в Blade.
  const isVip = tier === 'vip';

  // Градиентный заголовок (большой текст вверху success-экрана)
  const tierHeadingClass = isVip
    ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500'
    : 'text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500';

  // Плашка сверху (gradient bg в success)
  const headerBgClass = isVip
    ? 'bg-gradient-to-b from-blue-500/10 to-transparent'
    : 'bg-gradient-to-b from-orange-500/10 to-transparent';

  // Пинг-кружок (анимация)
  const pingBgClass = isVip ? 'bg-blue-500/20' : 'bg-orange-500/20';

  // Иконка-кружок внутри пинга
  const iconCircleClass = isVip
    ? 'bg-blue-500/10 dark:bg-blue-900/30'
    : 'bg-orange-500/10 dark:bg-orange-900/30';

  // Иконка галочки
  const checkIconClass = isVip ? 'text-blue-500' : 'text-orange-500';

  // Кнопка "Продолжить" (gradient)
  const continueButtonClass = isVip
    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600';

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* ЭКРАН ЗАГРУЗКИ (Pending) */}
        {status === 'pending' && (
          <div className="p-12 text-center flex flex-col items-center gap-6">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">Оплата обрабатывается банком</h1>
              <p className="text-muted-foreground text-sm">
                Пожалуйста, подождите. Это может занять несколько секунд.
              </p>
            </div>
          </div>
        )}

        {/* ЭКРАН УСПЕХА (Success) */}
        {status === 'success' && (
          <div>
            <div className={`p-8 text-center flex flex-col items-center gap-4 ${headerBgClass}`}>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full ${pingBgClass} animate-ping`}></div>
                <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${iconCircleClass}`}>
                  <CheckCircle2 className={`w-12 h-12 ${checkIconClass}`} strokeWidth={3} />
                </div>
              </div>
              <div className="space-y-2">
                {/* ИЗМЕНЕНО: tier выводится как uppercase заголовок.
                    В Blade было x-text="tier" (например, "vip" или "premium"),
                    но логичнее показать красивое имя. Возьмём planName если есть,
                    иначе просто tier в uppercase. */}
                <h1 className={`text-4xl font-extrabold tracking-tight uppercase ${tierHeadingClass}`}>
                  {planName || (isVip ? 'VIP' : 'Премиум')}
                </h1>
                <p className="text-muted-foreground font-medium text-lg">Оплата прошла успешно!</p>
              </div>
            </div>
            <div className="p-6 pt-4 flex flex-col gap-6 items-center text-center">
              <p className="text-foreground/90">
                Вы успешно подключили тариф <strong>{planName}</strong>.
                <br />
                {endsAt && (
                  <span>
                    Действует до: <span className="font-bold text-foreground">{endsAt}</span>
                  </span>
                )}
              </p>
              <div className="w-full space-y-3">
                {/* ИЗМЕНЕНО: используем <a href={safeReturnUrl}> вместо Link —
                    потому что safeReturnUrl может быть относительным путём ("/")
                    или внешним URL. <a> корректно обрабатывает оба варианта с
                    полной перезагрузкой страницы (важно чтобы auth-store обновился). */}
                <a
                  href={safeReturnUrl}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-6 font-semibold rounded-lg shadow-lg transition-all text-white ${continueButtonClass}`}
                >
                  Продолжить
                  <ArrowRight className="w-5 h-5" />
                </a>
                <Link
                  href="/"
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  На главную
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ЭКРАН ОШИБКИ (Failed) */}
        {status === 'failed' && (
          <div className="p-12 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-destructive" strokeWidth={2} />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">Ошибка оплаты</h1>
              <p className="text-muted-foreground text-sm">
                {failReason || 'Платеж не прошел. Попробуйте снова.'}
              </p>
            </div>
            <Link
              href={safeReturnUrl}
              className="w-full max-w-xs py-3 px-6 font-semibold rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors"
            >
              Попробовать снова
            </Link>
          </div>
        )}

        {/* ЭКРАН ОШИБКИ (Error / no transaction_id) */}
        {status === 'error' && (
          <div className="p-12 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-amber-600" strokeWidth={2} />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">Не удалось подтвердить платёж</h1>
              <p className="text-muted-foreground text-sm">
                Идентификатор транзакции не найден в URL. Если деньги списаны — подписка
                активируется автоматически в течение нескольких минут.
              </p>
            </div>
            <Link
              href="/"
              className="w-full max-w-xs py-3 px-6 font-semibold rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors"
            >
              На главную
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}