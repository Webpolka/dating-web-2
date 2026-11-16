// components/modals/billing/premium-modal.tsx
// Модалка покупки Premium-доступа. Отличия от vip-modal.tsx:
//  - Сетка 2x2 (вместо вертикального списка как в VIP)
//  - Цвета orange→amber (вместо blue→indigo)
//  - Бейджи "Акция" / "Лучшая цена" по slug
//
// Загружает тарифы через GET /api/subscriptions/plans?tier=premium
// (общая логика — lib/subscriptions.ts), отправляет POST /api/subscriptions/pay

'use client';

import { useState } from 'react';
import { useUIStore } from '@/store/ui-store';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck, Lock, CreditCard, Star } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { getErrorMessage, getValidationErrors } from '@/lib/api-error';
import {
  useSubscriptionPlans,
  buildSubscriptionReturnUrl,
} from '@/lib/subscriptions';
import type { SubscriptionPlan } from '@/lib/api-types';

// Тип ответа от POST /subscriptions/pay
interface PayResponse {
  success: boolean;
  redirect_url?: string;
  message?: string;
}

export function PremiumModal() {
  const { isPremiumModalOpen, closePremiumModal } = useUIStore();

  // Тарифы грузятся общей логикой (с защитой от неожиданного формата ответа)
  const { plans, loading } = useSubscriptionPlans('premium', isPremiumModalOpen);

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'yoomoney'>('card');
  const [autoRenew, setAutoRenew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Получить выбранный план (для отображения цены и текста автопродления).
  // Если пользователь ещё ничего не выбирал — по умолчанию первый тариф
  // (как в Blade: selectedPlanId: $premiumPlans->first()->id ?? null).
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? plans[0] ?? null;

  // При закрытии модалки — сбрасываем выбор (чтобы при следующем открытии
  // был чистый стейт, без остатков от прошлой сессии)
  const handleClose = () => {
    closePremiumModal();
    setSelectedPlanId(null);
    setAutoRenew(false);
    setPaymentMethod('card');
  };

  // Скрыть чекбокс автопродления для коротких тарифов (< 7 дней).
  // Это та же логика, что в VIP-модалке.
  const showAutoRenew = selectedPlan ? selectedPlan.duration_days >= 7 : false;

  // Хелпер для определения бейджа по slug тарифа.
  // Соответствует Blade-модалке Premium:
  //   slug === 'premium-2-days'    → "Акция" (red badge)
  //   slug === 'premium-3-months'  → "Лучшая цена" (green badge)
  const getBadge = (plan: SubscriptionPlan): { label: string; className: string } | null => {
    if (plan.slug === 'premium-2-days') {
      return {
        label: 'Акция',
        className: 'bg-red-500 text-white',
      };
    }
    if (plan.slug === 'premium-3-months') {
      return {
        label: 'Лучшая цена',
        className: 'bg-green-500 text-white',
      };
    }
    return null;
  };

  const handlePay = async () => {
    if (!selectedPlan) {
      toast.error('Выберите тариф');
      return;
    }

    setSubmitting(true);
    try {
      // return_url — куда вернуть пользователя после оплаты.
      // Общая логика в lib/subscriptions.ts (промо-страницы, referrer, защита от циклов).
      const returnUrl = buildSubscriptionReturnUrl();

      const { data } = await api.post<PayResponse>('/subscriptions/pay', {
        plan_id: selectedPlan.id,
        payment_method: paymentMethod,
        auto_renew: autoRenew,
        return_url: returnUrl,
      });

      if (data.success && data.redirect_url) {
        // Редирект на страницу оплаты/success — там будет polling статуса.
        window.location.assign(data.redirect_url);
      } else {
        toast.error(data.message || 'Ошибка инициализации платежа');
      }
    } catch (err) {
      // Laravel при 422 возвращает { errors: { field: ["message"] } } — берём первое
      const validation = getValidationErrors(err);
      if (validation) {
        const firstError = Object.values(validation)[0];
        const msg = Array.isArray(firstError) ? firstError[0] : String(firstError);
        toast.error(msg || 'Ошибка валидации');
        return;
      }
      toast.error(getErrorMessage(err, 'Ошибка сети'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isPremiumModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl p-0">
        {/* ШАПКА — без иконки (как в Blade-модалке Premium) */}
        <DialogHeader className="p-4 border-b border-border space-y-0">
          <DialogTitle>Подключение Премиум</DialogTitle>
        </DialogHeader>

        <div className="p-4 flex flex-col gap-3">
          {loading ? (
            // Экран загрузки тарифов
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Загружаем тарифы...</p>
            </div>
          ) : plans.length === 0 ? (
            // Нет тарифов в БД
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                Сейчас нет доступных тарифов Premium.
                <br />
                Попробуйте позже.
              </p>
            </div>
          ) : (
            <>
              {/* Плашка с информацией о бонусах (как в Blade-модалке) */}
              <div className="text-center">
                <p className="text-sm font-medium text-orange-500">
                  Получайте бонусы при подключении!
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Чем длиннее период, тем больше скидка!
                </p>
              </div>

              {/* СЕТКА ТАРИФОВ — grid 2x2 (как в Blade-модалке Premium) */}
              <div className="grid grid-cols-2 gap-3">
                {plans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const badge = getBadge(plan);
                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        // Логика автопродления: если короткий тариф — снимаем галку
                        if (plan.duration_days < 7) setAutoRenew(false);
                      }}
                      className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex flex-col ${
                        isSelected
                          ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-500/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-foreground">
                          {plan.name}
                        </span>
                        {/* Бейдж "Акция" / "Лучшая цена" по slug */}
                        {badge && (
                          <span
                            className={`${badge.className} text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap`}
                          >
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        {/* Старая цена (зачёркнутая) */}
                        {plan.old_price !== null && (
                          <span className="text-yellow-500 line-through text-sm font-medium">
                            {formatPrice(plan.old_price)}
                          </span>
                        )}
                        {/* Текущая цена (orange) */}
                        <span className="font-bold text-xl text-orange-500">
                          {formatPrice(plan.price)}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1">
                        Общая сумма: {plan.price.toLocaleString('ru-RU')} р.
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Выбор метода оплаты */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 border-2 rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === 'card'
                      ? 'border-orange-500 text-orange-500'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  Картой
                </button>
                <button
                  onClick={() => setPaymentMethod('yoomoney')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 border-2 rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === 'yoomoney'
                      ? 'border-orange-500 text-orange-500'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <span className="text-xs font-bold">ЮMoney</span>
                </button>
              </div>

              {/* Бейджи безопасности */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-green-500" /> Защищенное соединение
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-green-500" /> Данные защищены
                </span>
              </div>

              {/* АВТОПРОДЛЕНИЕ — динамический текст со ссылкой на выбранный тариф.
                  Скрывается для тарифов короче 7 дней (логика из Blade-модалки).
                  Текст немного другой чем у VIP: "со скидкой" — соответствует Blade. */}
              {showAutoRenew && (
                <div className="p-2.5 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="autoRenewPremium"
                      checked={autoRenew}
                      onCheckedChange={(checked) => setAutoRenew(checked === true)}
                    />
                    <label
                      htmlFor="autoRenewPremium"
                      className="text-[0.65rem] text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      <span>
                        Полная стоимость сервиса со скидкой{' '}
                        <strong className="text-foreground">
                          {selectedPlan?.price.toLocaleString('ru-RU')} рублей
                        </strong>{' '}
                        за {selectedPlan?.name}, в случае вашего бездействия платёж за
                        использование сервиса{' '}
                        {selectedPlan?.price.toLocaleString('ru-RU')} рублей будет
                        списываться автоматически до момента отписки держателем карты,
                        раз в {selectedPlan?.name}.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Ссылка на правила использования */}
              <p className="text-center text-[11px] text-muted-foreground">
                Оплачивая сервис, вы соглашаетесь с{' '}
                <a href="#" className="text-orange-500 hover:underline">
                  правилами использования
                </a>
                .
              </p>
            </>
          )}
        </div>

        {/* ФУТЕР с кнопкой оплаты — orange→amber gradient как в Blade */}
        {!loading && plans.length > 0 && (
          <div className="p-4 border-t border-border bg-muted/20 rounded-b-2xl flex justify-center">
            <Button
              onClick={handlePay}
              disabled={submitting || !selectedPlan}
              className="max-w-[14rem] w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Оплатить{' '}
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {selectedPlan ? formatPrice(selectedPlan.price) : ''}
                  </span>
                </span>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
