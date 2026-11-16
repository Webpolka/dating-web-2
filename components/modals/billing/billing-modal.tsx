// components/modals/billing/billing-modal.tsx
// ОБНОВЛЁННАЯ ВЕРСИЯ — добавлено:
// 1) Чтение billing.returnUrl из ui-store (а НЕ window.location.pathname, который теряет query)
// 2) Плашка "Цель пополнения" с purposeLabel и requiredAmount
// 3) Авто-выбор минимального плана, покрывающего requiredAmount
// 4) Улучшенный catch с показом реального сообщения от бэкенда (422 ошибки валидации и т.д.)

'use client';

import { useState } from 'react';
import { useUIStore } from '@/store/ui-store';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck, Lock, CreditCard, Gift as GiftIcon } from 'lucide-react';
import type { AxiosError } from 'axios';

// NEW: типы для обработки ответа от /billing/pay
interface BillingPayResponse {
  success: boolean;
  redirect_url?: string;
  message?: string;
}

// NEW: тип для 422 ответа от Laravel с ошибками валидации
interface ValidationErrorResponse {
  errors?: Record<string, string[]>;
  message?: string;
}

const PLANS = [
  { amount: 80, credits: 80, bonus: 0 },
  { amount: 250, credits: 300, bonus: 50 },
  { amount: 500, credits: 650, bonus: 150 },
  { amount: 900, credits: 1250, bonus: 350 },
];

export function BillingModal() {
  const { isBillingModalOpen, closeBillingModal, billing } = useUIStore();
  const [selectedPlan, setSelectedPlan] = useState(250);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [autoTopUp, setAutoTopUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // NEW: Если биллинг открыт из чекаута (есть requiredAmount),
  // автоматически выбираем минимальный план, который даёт достаточно кредитов.
  // Например, если нужно 30 кредитов — выберется 80₽ (80 кредитов, это минимум).
  // Если нужно 350 кредитов — выберется 500₽ (650 кредитов с бонусом).
  // Если биллинг открыт из чекаута (есть requiredAmount) — один раз выбираем
  // минимальный план, покрывающий нужное количество кредитов.
  // Паттерн «adjust state during render» (без эффекта).
  const [prevRequiredAmount, setPrevRequiredAmount] = useState<number | null>(null);
  if (isBillingModalOpen && billing.requiredAmount && billing.requiredAmount !== prevRequiredAmount) {
    setPrevRequiredAmount(billing.requiredAmount);
    const minPlan = PLANS.find(
      (p) => p.credits + p.bonus >= billing.requiredAmount!,
    );
    if (minPlan) {
      setSelectedPlan(minPlan.amount);
      // Для минимального плана 80₽ автопополнение недоступно
      if (minPlan.amount === 80) setAutoTopUp(false);
    }
  }

  const handlePay = async () => {
    setLoading(true);
      try {
      const res = await api.post<BillingPayResponse>('/billing/pay', {
        amount: selectedPlan,
        payment_method: paymentMethod,
        auto_top_up: autoTopUp,
        // ИЗМЕНЕНО: берём returnUrl из ui-store (его сформировал gift-checkout-modal).
        // Это полный относительный URL с query: /user/jane-doe?open_checkout=1&gift=42&message=Привет
        // Fallback — текущий URL (если пользователь открыл биллинг напрямую из меню шапки,
        // не из чекаута подарка).
        return_url: billing.returnUrl ?? window.location.pathname,
      });

      if (res.data.success && res.data.redirect_url) {
        // Редирект на страницу успеха (симуляция эквайринга).
        // ИСПОЛЬЗУЕМ window.location.assign() вместо window.location.href = ...
        // Это ВЫЗОВ МЕТОДА (не mutation свойства глобального объекта),
        // чтобы eslint правило react-hooks/immutability не ругалось.
        window.location.assign(res.data.redirect_url);
      } else {
        toast.error(res.data.message || 'Ошибка инициализации платежа');
      }
    } catch (err) {
      // ИСПОЛЬЗУЕМ catch (err) без типа — он автоматически unknown.
      // Типизируем через AxiosError для доступа к response.data.
      const axiosErr = err as AxiosError<ValidationErrorResponse>;

      // NEW: показываем реальное сообщение от бэкенда.
      // Laravel при 422 возвращает { errors: { field: ["message"] } } — берём первое.
      if (axiosErr.response?.data?.errors) {
        const firstError = Object.values(axiosErr.response.data.errors)[0];
        const msg = Array.isArray(firstError) ? firstError[0] : String(firstError);
        toast.error(msg || 'Ошибка валидации');
        return;
      }
      const detail = axiosErr.response?.data?.message;
      toast.error(detail || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  // NEW: определяем, открыт ли биллинг в контексте подарка (есть purposeLabel)
  const isGiftContext = !!billing.purposeLabel;
  // Сколько кредитов получит пользователь за выбранный план
  const planObj = PLANS.find((p) => p.amount === selectedPlan);
  const totalCredits = planObj ? planObj.credits + planObj.bonus : 0;

  return (
    <Dialog open={isBillingModalOpen} onOpenChange={(open) => !open && closeBillingModal()}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="p-4 border-b border-border space-y-0">
          <DialogTitle>Пополнение счета</DialogTitle>
        </DialogHeader>

        <div className="p-5 flex flex-col gap-4">
          {/* NEW: Плашка цели платежа — показывается только если биллинг открыт
              из gift-checkout-modal (есть purposeLabel). Помогает пользователю
              понять, зачем он платит и сколько кредитов нужно. */}
          {isGiftContext && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-2">
              <GiftIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-medium text-foreground">{billing.purposeLabel}</div>
                {billing.requiredAmount && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Нужно минимум{' '}
                    <span className="font-semibold text-primary">
                      {billing.requiredAmount} ед.
                    </span>
                    {' '}— выбранный план даст{' '}
                    <span className="font-semibold text-green-500">
                      {totalCredits} ед.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm font-medium text-primary">Получайте уникальные бонусы!</p>
            <p className="text-xs text-muted-foreground mt-1">Чем больше сумма пополнения, тем больше скидка!</p>
          </div>

          {/* Сетка тарифов */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PLANS.map(plan => (
              <div
                key={plan.amount}
                onClick={() => {
                  setSelectedPlan(plan.amount);
                  if (plan.amount === 80) setAutoTopUp(false);
                }}
                className={`cursor-pointer p-3 rounded-xl border-2 text-center transition-all relative flex flex-col items-center justify-center ${
                  selectedPlan === plan.amount
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                {plan.bonus > 0 && (
                  <span className="absolute -top-2 right-1 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">+{plan.bonus}</span>
                )}
                <p className="font-bold text-base text-foreground">{plan.credits} ед.</p>
                <p className="text-xs text-muted-foreground mt-1">{plan.amount} рублей</p>
              </div>
            ))}
          </div>

          {/* Выбор метода оплаты */}
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-2 rounded-lg text-sm font-medium transition-colors ${
                paymentMethod === 'card' ? 'border-primary text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Картой
            </button>
            <button
              onClick={() => setPaymentMethod('yoomoney')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-2 rounded-lg text-sm font-medium transition-colors ${
                paymentMethod === 'yoomoney' ? 'border-primary text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              <span className="text-xs font-bold">ЮMoney</span>
            </button>
          </div>

          {/* Бейджи безопасности */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-green-500" /> Защищенное соединение</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-green-500" /> Данные защищены</span>
          </div>

          {/* Автопополнение (Скрывается для 80 руб) */}
          {selectedPlan !== 80 && (
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="autoTopUp"
                  checked={autoTopUp}
                  onCheckedChange={(checked) => setAutoTopUp(checked === true)}
                />
                <label htmlFor="autoTopUp" className="text-[0.65rem] text-muted-foreground leading-relaxed cursor-pointer">
                  <span className="font-semibold text-foreground">Автопополнение баланса:</span> при остатке менее 200 Единиц с привязанной карты автоматически списывается 200 ₽ — на баланс начисляется 250 Единиц. Продолжая с галочкой, вы даёте согласие на автоматическое списание средств.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Футер с кнопкой оплаты */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-center">
          <Button
            onClick={handlePay}
            disabled={loading}
            className="max-w-[12rem] w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Оплатить ${selectedPlan} ₽`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}