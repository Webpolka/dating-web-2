'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Gift } from 'lucide-react';
import Link from 'next/link';

export function SuccessContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const { fetchUser } = useAuthStore();

  const [status, setStatus] = useState('pending');
  const [creditsAmount, setCreditsAmount] = useState(0);
  const [failReason, setFailReason] = useState('');
  const [returnUrl, setReturnUrl] = useState('/');

  // Поллинг статуса: раз в 2 секунды, но не вечно —
  // после MAX_POLL_ATTEMPTS неудачных попыток показываем ошибку.
  const MAX_POLL_ATTEMPTS = 60; // 60 × 2с = 2 минуты

  useEffect(() => {
    if (!transactionId) return;

    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > MAX_POLL_ATTEMPTS) {
        clearInterval(interval);
        setStatus('error');
        setFailReason('Не удалось дождаться подтверждения платежа. Проверьте историю операций или попробуйте позже.');
        return;
      }

      try {
        const res = await api.get(`/billing/status/${transactionId}`);
        const data = res.data;

        setStatus(data.status);
        setCreditsAmount(data.creditsAmount);
        setFailReason(data.failReason);
        setReturnUrl(data.returnUrl || '/');

        // Только останавливаем поллинг, НИКУДА НЕ РЕДИРЕКТИМ!
        if (data.status !== 'pending') {
          clearInterval(interval);

          // При успехе обновляем auth-store (свежий баланс).
          // Это нужно, чтобы при возврате на профиль в gift-checkout-modal
          // сразу был актуальный user.balance.credits.
          if (data.status === 'success') {
            fetchUser().catch((err) =>
              console.error('Failed to refresh user balance', err),
            );
          }
        }
      } catch (error) {
        console.error('Ошибка опроса статуса:', error);
        // Сетевые сбои не считаем фатальными — пусть пытается дальше
        // (лимит attempts всё равно остановит поллинг).
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [transactionId, fetchUser]);

  // NEW: определяем, ведёт ли returnUrl к gift-checkout (возврат к подарку).
  // Парсим URL и смотрим на наличие параметров open_checkout=1 и gift=ID.
  const isGiftReturnContext = useMemo(() => {
    if (!returnUrl || returnUrl === '/') return false;
    try {
      // returnUrl может быть относительным ("/user/jane-doe?...") или абсолютным
      const url = new URL(returnUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      const openCheckout = url.searchParams.get('open_checkout');
      const giftId = url.searchParams.get('gift');
      return openCheckout === '1' && !!giftId;
    } catch {
      // Если URL невалидный — не gift-контекст
      return false;
    }
  }, [returnUrl]);

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* Экран загрузки (Pending) */}
        {status === 'pending' && (
          <div className="p-12 text-center flex flex-col items-center gap-6">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">Оплата обрабатывается банком</h1>
              <p className="text-muted-foreground text-sm">Пожалуйста, подождите. Это может занять несколько секунд.</p>
            </div>
          </div>
        )}

        {/* Экран успеха (Success) */}
        {status === 'success' && (
          <div>
            <div className="p-8 text-center flex flex-col items-center gap-4 bg-gradient-to-b from-primary/10 to-transparent">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                <div className="relative w-20 h-20 rounded-full flex items-center justify-center bg-primary/10 dark:bg-primary/20">
                  <CheckCircle2 className="w-12 h-12 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80 uppercase">Кредиты зачислены</h1>
                <p className="text-muted-foreground font-medium text-lg">Оплата прошла успешно!</p>
              </div>
            </div>
            <div className="p-6 pt-4 flex flex-col gap-6 items-center text-center">
              <p className="text-foreground/90">
                На ваш баланс начислено <strong>{creditsAmount}</strong> единиц.<br />
                <span className="text-sm text-muted-foreground">Теперь вы можете дарить подарки и использовать платные функции.</span>
              </p>

              {/* NEW: информационная плашка для gift-контекста.
                  Показывается только если returnUrl ведёт к подарку.
                  Убеждает пользователя, что его выбранный подарок и текст сохранены. */}
              {isGiftReturnContext && (
                <div className="w-full p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3 text-left">
                  <Gift className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium text-foreground">Сейчас вы вернётесь к оформлению подарка</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Выбранный подарок и ваше сообщение сохранены — останется лишь нажать «Подарить».
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full space-y-3">
                {/* ИЗМЕНЕНО: текст и иконка кнопки зависят от контекста.
                    Если returnUrl ведёт к подарку — "Вернуться к подарку" + иконка Gift.
                    Иначе — "Продолжить" как раньше. */}
                  <Button onClick={() => window.location.assign(returnUrl)} className="w-full">
                  {isGiftReturnContext ? (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Вернуться к подарку
                    </>
                  ) : (
                    'Продолжить'
                  )}
                </Button>
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    На главную
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Экран ошибки (Failed) */}
        {status === 'failed' && (
          <div className="p-12 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">Ошибка оплаты</h1>
              <p className="text-muted-foreground text-sm">{failReason || 'Платеж не прошел. Попробуйте снова.'}</p>
            </div>
            <Button onClick={() => window.history.back()} variant="outline" className="w-full max-w-xs">
              Попробовать снова
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
