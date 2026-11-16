// components/modals/billing/gift-checkout-modal.tsx
// ОБНОВЛЁННАЯ ВЕРСИЯ — добавлена логика возврата после биллинга:
// 1) preselectedMessage как initial value для textarea
// 2) формирование return_url с параметрами gift + message
// 3) openBillingModal({ returnUrl, requiredAmount, purposeLabel })

'use client';

import { useState } from 'react';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2 } from 'lucide-react';
// NEW: типизация ошибок axios (заменяет catch (err: any))
import type { AxiosError } from 'axios';

// NEW: типы для обработки ответа от /users/{slug}/gift
interface GiftSendResponse {
  success: boolean;
  message?: string;
}

interface GiftErrorResponse {
  message?: string;
}

export function GiftCheckoutModal() {
  const {
    isCheckoutModalOpen,
    closeCheckoutModal,
    selectedGift,
    giftRecipientSlug,
    openGiftModal,
    openBillingModal,
    // NEW: текст сообщения для восстановления после биллинга
    preselectedMessage,
  } = useUIStore();
  const { user } = useAuthStore();

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // При открытии чекаута берём preselectedMessage как initial value
  // (возврат после биллинга — восстановит текст; открытие из каталога — пустая строка).
  // Паттерн «adjust state during render» — без эффекта.
  const [prevCheckoutOpen, setPrevCheckoutOpen] = useState(false);
  if (isCheckoutModalOpen && !prevCheckoutOpen) {
    setPrevCheckoutOpen(true);
    setMessage(preselectedMessage ?? '');
  } else if (!isCheckoutModalOpen && prevCheckoutOpen) {
    setPrevCheckoutOpen(false);
  }

  // Если подарок или получатель не выбраны - не рендерим
  if (!selectedGift || !giftRecipientSlug) return null;

  const userBalance = user?.balance?.credits ?? 0;
  const enoughCredits = userBalance >= selectedGift.price;
  // NEW: сколько кредитов не хватает для покупки
  const shortage = selectedGift.price - userBalance;

  // NEW: формирует URL для возврата после успешной оплаты.
  // Пример: /user/jane-doe?open_checkout=1&gift=42&message=Привет
  // На profile-client.tsx этот URL будет прочитан, подарок 42 загружен по API,
  // и openCheckoutModal(gift, slug, "Привет") откроет эту же модалку с восстановленным текстом.
  const buildReturnUrl = () => {
    const currentUrl = window.location.href.split('?')[0]; // чистим query
    const params = new URLSearchParams({
      open_checkout: '1',
      gift: String(selectedGift.id),
    });
    if (message.trim()) {
      params.set('message', message.trim());
    }
    return `${currentUrl}?${params.toString()}`;
  };

  // NEW: действие при нехватке кредитов — открыть биллинг с preselected данными
  const handleInsufficientBalance = () => {
    const returnUrl = buildReturnUrl();
    const purposeLabel = `Подарок «${selectedGift.name}»`;

    closeCheckoutModal();
    openBillingModal({
      returnUrl,
      requiredAmount: shortage,
      purposeLabel,
    });
  };

  const handleSendGift = async () => {
    if (!enoughCredits) return;
    setLoading(true);
   try {
      const res = await api.post<GiftSendResponse>(`/users/${giftRecipientSlug}/gift`, {
        gift_id: selectedGift.id,
        message: message,
      });

      // Бэкенд возвращает 200 только при успехе (success: true).
      if (res.data.success) {
        toast.success(res.data.message || 'Подарок успешно отправлен!');
        closeCheckoutModal();
        // В идеале тут нужно обновить стейт юзера (списать кредиты) и перезагрузить профиль
        window.location.reload();
        return;
      }

      // Defensive: гипотетический случай, если бэкенд когда-то начнёт
      // возвращать 200 + success:false. На текущем бэкенде не случается,
      // потому что при ошибке возвращается 402/400/403 и мы уходим в catch.
      toast.error(res.data.message || 'Ошибка отправки');
    } catch (err) {
      // ИСПОЛЬЗУЕМ catch (err) без типа — он автоматически unknown.
      // Типизируем через AxiosError для доступа к response.status и response.data.message.
      const axiosErr = err as AxiosError<GiftErrorResponse>;

      // 402 Payment Required — бэкенд вернул "Недостаточно кредитов для совершения покупки."
      // Открываем биллинг с тем же подарком + сообщением, чтобы пользователь
      // мог пополнить и вернуться сюда.
      if (axiosErr.response?.status === 402) {
        toast.error(axiosErr.response?.data?.message || 'Недостаточно кредитов на балансе');
        handleInsufficientBalance();
        return;
      }

      // 400 (дарить себе) / 403 (нет счёта) / 500 — показываем сообщение от бэкенда
      const detail = axiosErr.response?.data?.message;
      toast.error(detail || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };
  

  const handleBackToCatalog = () => {
    closeCheckoutModal();
    openGiftModal(giftRecipientSlug);
  };

  return (
    <Dialog open={isCheckoutModalOpen} onOpenChange={(open) => !open && closeCheckoutModal()}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-4 border-b border-border space-y-0">
          <DialogTitle>Оформление подарка</DialogTitle>
        </DialogHeader>

        <div className="p-6 flex flex-col items-center text-center gap-5">
          <button
            onClick={handleBackToCatalog}
            className="self-start text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 -mt-2"
          >
            <ArrowLeft className="w-3 h-3" />
            Назад в каталог
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedGift.image_url} alt={selectedGift.name} className="w-28 h-28 object-contain drop-shadow-lg" />

          <div>
            <h4 className="font-semibold text-foreground text-lg">{selectedGift.name}</h4>
            <p className="text-sm text-yellow-500 font-medium mt-1">{selectedGift.price} ед.</p>
          </div>

          <div className="w-full flex items-center justify-center gap-2 text-sm py-2 px-4 bg-muted/50 rounded-lg">
            <span className="text-muted-foreground">Ваш баланс:</span>
            <span className={`font-semibold ${enoughCredits ? 'text-green-500' : 'text-destructive'}`}>
              {userBalance} ед.
            </span>
          </div>

          <div className="w-full">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Добавить сообщение (необязательно)..."
              maxLength={150}
              className="resize-none"
            />
            <p className="text-right text-xs text-muted-foreground mt-1">{message.length}/150</p>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/20 flex justify-center">
          {enoughCredits ? (
            <Button
              onClick={handleSendGift}
              disabled={loading}
              className="w-full max-w-[16rem] bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Подарить за ${selectedGift.price} ед.`}
            </Button>
          ) : (
            <Button
              // ИЗМЕНЕНО: вместо closeCheckoutModal + openBillingModal()
              // вызываем handleInsufficientBalance — он формирует return_url
              // и передаёт в биллинг { returnUrl, requiredAmount, purposeLabel }
              onClick={handleInsufficientBalance}
              variant="destructive"
              className="w-full max-w-[16rem]"
            >
              Недостаточно кредитов. Пополнить на {shortage}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
