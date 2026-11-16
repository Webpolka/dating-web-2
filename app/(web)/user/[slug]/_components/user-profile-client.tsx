// app/(web)/user/[slug]/_components/user-profile-client.tsx
//
// Просмотр чужого профиля: GET /api/user/{slug}.
// Также ловит возврат после биллинга (?open_checkout=1&gift=ID&message=...)
// и автоматически открывает GiftCheckoutModal с восстановленным подарком
// и текстом сообщения (один раз за сессию — ref-защита от double-render).

"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleX } from "lucide-react";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Loader } from "@/components/ui/loader";

import { UserGifts } from "./user-gifts";
import { PhotoGallery } from "../../../_components/photo-gallery";
import { ActionButtons } from "./user-action-buttons";
import { UserPersonalInfo } from "./user-personal-info";
import { UserSelfPortrait } from "./user-selfportrait";
import { SubscriptionBanner } from "../../../_components/subscription-banner";
import { UserHeader } from "./user-header";
import { UserStatusRow } from "./user-status-row";

import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";

import { toast } from "sonner";

import type { Gift, GiftReceived, UserInterest, UserPhoto } from "@/lib/api-types";

// Типы для данных профиля (только поля, которые использует эта страница)
interface UserData {
  user: {
    id: number;
    name: string;
    slug: string;
    is_verified: boolean;
    has_active_premium: boolean;
    last_seen?: string | null;
    photos: UserPhoto[];
    profile: {
      age: number | null;
      headline: string | null;
      looking_for: string | null;
      bio: string | null;
      city: { name: string } | null;
      zodiac_name?: string | null;
      zodiac_icon?: string | null;
      height?: number | null;
      body_type?: number | null;
      relationship_status?: number | null;
      children_status?: number | null;
      pets?: number | null;
      housing?: number | null;
      has_car?: number | null;
      education_level?: number | null;
      institution?: string | null;
      institution_year?: number | null;
      income?: number | null;
      activity?: string | null;
      position?: string | null;
      smoking?: number | null;
      alcohol?: number | null;
      languages?: number[] | null;
      sports?: number[] | null;
      self_portrait?: string | string[] | null; // Для автопортрета
      interests?: UserInterest[] | null;
      dating_goals?: string[] | null; // Для "Я ищу"
    };
    preferences: {
      preferred_gender: string | null;
      preferred_age_min: number | null;
      preferred_age_max: number | null;
    } | null;
    gifts_received: GiftReceived[];
  };
  is_favorited: boolean;
  is_blocked: boolean;
  is_reported: boolean;
  is_auth: boolean;
  viewers_count: number;
}

export function UserClient({ slug }: { slug: string }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [data, setData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: добавлен openCheckoutModal — нужен чтобы открыть чекаут с восстановленным
  // подарком + сообщением после возврата из биллинга.
  const { openLoginModal, openCheckoutModal } = useUIStore();

  // Внутри компонента UserClient:
  const { user: authUser } = useAuthStore();
  const [pageUrl, setPageUrl] = useState("");

  // NEW: ref чтобы открыть чекаут только один раз (защита от StrictMode double-render
  // и от повторных срабатываний useEffect при обновлении зависимостей).
  const autoOpenHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPageUrl(window.location.href);
    }
  }, []);

  // Загрузка профиля — БЕЗ ИЗМЕНЕНИЙ
  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<UserData>(`/user/${slug}`);
        if (isMounted) {
          setData(res.data);
          setIsBlocked(res.data.is_blocked);
        }
      } catch (err: unknown) {
        // Безопасно проверяем тип
        const error = err as { response?: { status?: number } };
        if (isMounted)
          setError(
            error.response?.status === 404
              ? "Профиль не найден"
              : "Ошибка загрузки",
          );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // NEW: обработка возврата после биллинга.
  // Срабатывает один раз, когда профиль загрузился и в URL есть ?open_checkout=1&gift=ID.
  // Загружает подарок по ID и открывает чекаут-модалку с восстановленным сообщением.
  useEffect(() => {
    // Если уже открыли — выходим (защита от StrictMode double-render)
    if (autoOpenHandledRef.current) return;
    // Ждём, пока профиль загрузится
    if (!data) return;
    // Пользователь должен быть залогинен — иначе чекаут не имеет смысла
    if (!data.is_auth) return;

    // Читаем URL параметры напрямую через window.location.search.
    // НЕ используем useSearchParams, чтобы не требовать Suspense wrapper в родительском layout.
    const search = window.location.search;
    if (!search) return;

    const params = new URLSearchParams(search);
    const openCheckout = params.get("open_checkout");
    const giftIdRaw = params.get("gift");
    const message = params.get("message") ?? "";

    if (openCheckout !== "1" || !giftIdRaw) return;

    const giftId = Number(giftIdRaw);
    if (!Number.isFinite(giftId) || giftId <= 0) return;

    // Помечаем как обработанный — больше не откроем
    autoOpenHandledRef.current = true;

    // Чистим URL сразу, чтобы при F5 или копировании ссылки модалка не открылась снова.
    // Это также убирает параметры из адресной строки (более чистый UX).
    window.history.replaceState({}, "", window.location.pathname);

    // Загружаем каталог подарков и находим нужный по ID.
    // Используем существующий endpoint GET /gifts, который возвращает { gifts: Record<type, Gift[]> }.
    // Если в будущем появится GET /gifts/{id} — можно заменить на один запрос.
    (async () => {
      try {
        const res = await api.get<{ gifts?: Record<string, Gift[]> }>("/gifts");
        // Каталог — это объект { main: [...], premium: [...], services: [...] }.
        // Guard: проверяем форму и каждый массив — при неожиданном ответе
        // просто покажем «не удалось загрузить».
        const catalog = res.data?.gifts && typeof res.data.gifts === 'object'
          ? res.data.gifts
          : {};
        const allGifts: Gift[] = Object.values(catalog)
          .flatMap((list) => (Array.isArray(list) ? list : []));
        const gift = allGifts.find((g) => g.id === giftId);

        if (!gift) {
          toast.error("Подарок больше не доступен в каталоге");
          return;
        }

        // Открываем чекаут с восстановленным подарком + текстом сообщения.
        // ui-store.openCheckoutModal(gift, slug, preselectedMessage?)
        // — preselectedMessage попадёт в textarea как initial value
        //   (см. gift-checkout-modal.tsx useEffect)
        openCheckoutModal(
          {
            id: gift.id,
            name: gift.name,
            price: gift.price,
            image_url: gift.image_url,
          },
          slug,
          message || null,
        );

        toast.success("Баланс пополнен! Завершите отправку подарка.");
      } catch (err) {
        console.error("Failed to load gift for return-after-billing", err);
        toast.error("Не удалось загрузить подарок");
      }
    })();
  }, [data, slug, openCheckoutModal]);

  if (isLoading) {
    return <Loader className="min-h-[calc(100dvh-4rem)]" />;
  }

  if (error || !data) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center text-destructive">
        {error || "Ошибка загрузки профиля"}
      </div>
    );
  }

  const { user } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
      {/* Алерт о блокировке */}
      {isBlocked && (
        <Alert className="bg-destructive/10 text-destructive border-destructive/50 border-l-4 rounded-md">
          <CircleX className="h-4 w-4" />
          <AlertTitle>Вы заблокировали этого пользователя.</AlertTitle>
          <AlertDescription>Вы не можете писать друг другу.</AlertDescription>
        </Alert>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row gap-8 p-6">
        <div className="w-full md:w-[33%] shrink-0">
          <PhotoGallery
            photos={user.photos || []}
            isPremium={user.has_active_premium}
            name={user.name}
            isAuth={data.is_auth}
            onGuestClick={openLoginModal}
          />
        </div>

        {/* ПРАВАЯ ЧАСТЬ: Информация */}
        <div className="flex-1 py-2 flex flex-col">
          {/*Верификация, имя, возраст, знак зодиака */}
          <UserHeader
            className="mb-2"
            name={user.name}
            age={user.profile.age}
            zodiacIcon={user.profile?.zodiac_icon ?? null} // ← NEW
            zodiacName={user.profile?.zodiac_name ?? null} // ← NEW
            isVerified={user.is_verified}
          />

          {/* Город, Статус, Лайки */}
          <UserStatusRow
            className="mb-6"
            slug={user.slug}
            city={user.profile.city?.name}
            lastSeen={user.last_seen}
            isAuth={data.is_auth}
            viewersCount={data.viewers_count}
          />

          {/* Статус (Headline) */}
          {user.profile.headline && (
            <div className="mb-6 inline-block bg-background border border-border rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-sm text-foreground/80 italic font-light leading-relaxed">
                {user.profile.headline}
              </p>
            </div>
          )}

          {/*  Действия = Написать, в избранное, пожаловаться, заблокировать */}
          <ActionButtons
            className="mb-6"
            slug={user.slug}
            isAuth={data.is_auth}
            isFavorited={data.is_favorited}
            isBlocked={isBlocked} // <--- Передаем локальный стейт
            isReported={data.is_reported}
            onGuestClick={openLoginModal}
            onBlockChange={(newStatus) => setIsBlocked(newStatus)}
          />

          {/*  Премиум доступ */}
          <SubscriptionBanner className="mb-0" />

          {/* Я ищу (Фильтры) */}
          {user.preferences && (
            <div className="mb-6 space-y-2">
              <h3 className="text-base font-medium text-accent-foreground">
                Я ищу
              </h3>
              <p className="text-sm text-muted-foreground">
                Ищу{" "}
                {user.preferences.preferred_gender === "male"
                  ? "парней"
                  : user.preferences.preferred_gender === "female"
                    ? "девушек"
                    : ""}{" "}
                от {user.preferences.preferred_age_min ?? 18} до{" "}
                {user.preferences.preferred_age_max ?? 99} лет
              </p>
            </div>
          )}

          {/* Свободно о себе */}
          {user.profile.bio && (
            <div className="mb-6 space-y-2">
              <h3 className="text-base font-medium text-accent-foreground">
                Свободно о себе
              </h3>
              <p className="text-sm text-muted-foreground">
                {user.profile.bio}
              </p>
            </div>
          )}

          {/* Кого ищу */}
          {user.profile.looking_for && (
            <div className="mb-6 space-y-2">
              <h3 className="text-base font-medium text-accent-foreground">
                Кого я хочу найти
              </h3>
              <p className="text-sm text-muted-foreground">
                {user.profile.looking_for}
              </p>
            </div>
          )}

          {/* Подарки юзера */}
          <UserGifts
            gifts={user.gifts_received || []}
            slug={slug}
            hasPremium={authUser?.has_active_premium || false}
            isAuth={data.is_auth}
            onGuestClick={openLoginModal}
          />

          {/* Интересы (guard: показываем только при реальном массиве) */}
          {Array.isArray(user.profile.interests) && user.profile.interests.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-medium text-accent-foreground mb-2">
                Интересы
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.profile.interests.map((interest) => (
                  <span
                    key={interest.id}
                    className="inline-flex items-center rounded-full border px-3 py-1 text-sm"
                  >
                    {interest.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Личная информация */}
          <UserPersonalInfo className="mb-6" profile={user.profile} />

          {/* Автопортрет */}
          <UserSelfPortrait text={user.profile.self_portrait} />

          {/* Адрес страницы */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
              <span className="text-muted-foreground text-sm font-light sm:w-2/5">
                Адрес страницы
              </span>
              <a
                href={pageUrl}
                className="text-blue-500 dark:text-blue-400 text-sm hover:underline sm:w-3/5 truncate"
                target="_blank"
                rel="noopener noreferrer"
              >
                {pageUrl || "Загрузка..."}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
