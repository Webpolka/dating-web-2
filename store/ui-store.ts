import { create } from 'zustand';

// Тип для выбранного подарка (чтобы передать из каталога в чекаут)
interface SelectedGift {
  id: number;
  name: string;
  price: number;
  image_url: string;
}

interface BillingState {
  // NEW: URL куда вернуть пользователя после успешной оплаты
  returnUrl: string | null;
  // NEW: сколько нужно докинуть (минимальная сумма для покупки подарка)
  requiredAmount: number | null;
  // NEW: краткое описание что оплачивается ("Подарок «Цветы» для Анны")
  purposeLabel: string | null;
}

interface UIState {
  // --- Auth Modals ---
  isLoginModalOpen: boolean;
  isRegisterModalOpen: boolean;
  isForgotPasswordModalOpen: boolean;
  prefillEmail: string;
  loginPrefillEmail: string;

  // --- Gift & Billing Modals ---
  isGiftModalOpen: boolean;
  isCheckoutModalOpen: boolean;
  isBillingModalOpen: boolean;
  selectedGift: SelectedGift | null;
  giftRecipientSlug: string | null; // Слаг юзера, которому дарим

  // NEW: текст сообщения для восстановления после возврата из биллинга.
  // Заполняется, когда profile-client ловит ?open_checkout=1&gift=ID&message=...
  // и передаётся в GiftCheckoutModal как initial value для textarea.
  preselectedMessage: string | null;

  // NEW: модалки покупки подписок (VIP / Премиум).
  // Открываются:
  //  - из хедера (inapp-navigation.tsx) когда у пользователя НЕТ активной подписки
  //  - со страницы /vip или /premium при клике "Включить VIP/Премиум"
  isVipModalOpen: boolean;
  isPremiumModalOpen: boolean;

  billing: BillingState;

  // --- Auth Actions ---
  openLoginModal: (email?: string) => void;
  closeLoginModal: () => void;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
  openForgotPasswordModal: (email?: string) => void;
  closeForgotPasswordModal: () => void;

  // --- Gift & Billing Actions ---
  openGiftModal: (recipientSlug: string) => void;
  closeGiftModal: () => void;

  // Третий параметр preselectedMessage — для возврата после биллинга:
  // восстанавливает текст, который пользователь написал в textarea
  // до перехода на оплату.
  openCheckoutModal: (
    gift: SelectedGift,
    recipientSlug: string,
    preselectedMessage?: string | null,
  ) => void;
  closeCheckoutModal: () => void;

  openBillingModal: (payload?: Partial<BillingState>) => void;
  closeBillingModal: () => void;

  // Модалки покупки подписок — boolean-флаги.
  // returnUrl формируется внутри модалки (window.location.pathname) при отправке
  // платежа (см. lib/subscriptions.ts).
  openVipModal: () => void;
  closeVipModal: () => void;
  openPremiumModal: () => void;
  closePremiumModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // --- Init Auth ---
  isLoginModalOpen: false,
  isRegisterModalOpen: false,
  isForgotPasswordModalOpen: false,
  prefillEmail: '',
  loginPrefillEmail: '',

  // --- Init Gift & Billing ---
  isGiftModalOpen: false,
  isCheckoutModalOpen: false,
  isBillingModalOpen: false,
  selectedGift: null,
  giftRecipientSlug: null,

  // NEW: по умолчанию null — текста ещё нет
  preselectedMessage: null,

  // NEW: модалки подписок закрыты по умолчанию
  isVipModalOpen: false,
  isPremiumModalOpen: false,

  billing: {
    returnUrl: null,
    requiredAmount: null,
    purposeLabel: null,
  },

  // --- Auth Actions ---
  openLoginModal: (email = '') => set({ isLoginModalOpen: true, loginPrefillEmail: email }),
  closeLoginModal: () => set({ isLoginModalOpen: false, loginPrefillEmail: '' }),
  openRegisterModal: () => set({ isRegisterModalOpen: true }),
  closeRegisterModal: () => set({ isRegisterModalOpen: false }),
  openForgotPasswordModal: (email = '') =>
    set({ isForgotPasswordModalOpen: true, prefillEmail: email, isLoginModalOpen: false }),
  closeForgotPasswordModal: () =>
    set({ isForgotPasswordModalOpen: false, prefillEmail: '' }),

  // --- Gift & Billing Actions ---
  openGiftModal: (recipientSlug) =>
    set({ isGiftModalOpen: true, giftRecipientSlug: recipientSlug }),
  closeGiftModal: () => set({ isGiftModalOpen: false }),

  // Третий параметр preselectedMessage (по умолчанию null).
  // Если его передать (возврат после биллинга) — он сохранится в state
  // и GiftCheckoutModal сможет взять его как initial value для textarea.
  openCheckoutModal: (gift, recipientSlug, preselectedMessage = null) =>
    set({
      isCheckoutModalOpen: true,
      selectedGift: gift,
      giftRecipientSlug: recipientSlug,
      preselectedMessage,
      isGiftModalOpen: false, // Закрываем каталог при открытии чекаута
    }),
  closeCheckoutModal: () =>
    set({
      isCheckoutModalOpen: false,
      selectedGift: null,
      // Сбрасываем preselectedMessage — модалка закрылась, текст больше не нужен
      preselectedMessage: null,
    }),

  openBillingModal: (payload = {}) =>
    set({
      isBillingModalOpen: true,
      billing: {
        returnUrl: payload.returnUrl ?? null,
        requiredAmount: payload.requiredAmount ?? null,
        purposeLabel: payload.purposeLabel ?? null,
      },
    }),
  closeBillingModal: () =>
    set({
      isBillingModalOpen: false,
      billing: {
        returnUrl: null,
        requiredAmount: null,
        purposeLabel: null,
      },
    }),

  // Модалки подписок — просто boolean-флаги.
  // Возврат после оплаты обрабатывают success-страницы, защита от цикла —
  // в buildSubscriptionReturnUrl (lib/subscriptions.ts).
  openVipModal: () => set({ isVipModalOpen: true }),
  closeVipModal: () => set({ isVipModalOpen: false }),
  openPremiumModal: () => set({ isPremiumModalOpen: true }),
  closePremiumModal: () => set({ isPremiumModalOpen: false }),
}));
