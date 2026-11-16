// components/providers/app-provider.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import { Loader } from "../ui/loader";

// Публичные роуты — доступны без авторизации.
// Плюс префиксы маркетинговых страниц подписок и страниц возврата после
// оплаты: гость, вернувшийся из платёжного шлюза (или с протухшей сессией),
// должен увидеть статус платежа, а не редирект на главную с модалкой логина.
// Вход на сайт — через модалку, отдельной страницы /login нет.
const PUBLIC_ROUTES = [
  "/",
  "/register",
  "/reset-password",
  "/search",
  "/user",
  "/subscriptions",
  "/billing/success",
];
const ALLOWED_AUTH_ROUTES = ["/verify-email", "/onboarding"];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const { user, isInitialized, fetchUser } = useAuthStore();
  const { openLoginModal } = useUIStore();

  useEffect(() => {
    if (!isInitialized) {
      fetchUser();
    }
  }, [isInitialized, fetchUser]);

  // 1. СИНХРОННОЕ ВЫЧИСЛЕНИЕ РЕДИРЕКТА
  // Мы проверяем права доступа прямо во время рендера, до того как отрисуется запрещенная страница
  let redirectTo: string | null = null;

  if (isInitialized) {
    // Проверяем точное совпадение ИЛИ начало пути (для /user/slug)
    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    );
    const isAllowedAuthRoute = ALLOWED_AUTH_ROUTES.some((r) =>
      pathname.startsWith(r),
    );

    if (!user) {
      // Гость пытается зайти на закрытый роут
      if (!isPublicRoute) {
        redirectTo = "/";
      }
    } else {
      const isStaff = ["admin", "moderator", "support"].includes(user.role);

      // Приоритет 1: Онбординг
      if (!user.has_completed_onboarding && !isStaff && !isAllowedAuthRoute) {
        redirectTo = "/onboarding";
      }
      // Приоритет 2: Верификация
      else if (
        user.has_completed_onboarding &&
        !user.email_verified_at &&
        !isStaff &&
        !isAllowedAuthRoute
      ) {
        redirectTo = "/verify-email";
      }

      // Ситуация: Авторизованный юзер пытается зайти на /login или /register
      // (Проверяем строго эти два роута, чтобы не блокировать /user/slug)
      else if (pathname === "/login" || pathname === "/register") {
        if (user.has_completed_onboarding && user.email_verified_at) {
          redirectTo = "/";
        }
      }
    }
  }

  // 2. ВЫПОЛНЕНИЕ РЕДИРЕКТА (в useEffect)
  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);

      // Если гость попытался зайти на закрытую страницу — открываем модалку логина
      if (redirectTo === "/" && !user) {
        setTimeout(() => openLoginModal(), 300);
      }
    }
  }, [redirectTo, router, user, openLoginModal]);

  // 3. УСЛОВИЯ РЕНДЕРА (Блокируем мелькание)
  // Пока не инициализировались ИЛИ нужен редирект — показываем лоадер, а не children!
  if (!isInitialized || redirectTo) {
    return <Loader className="h-screen" />;
  }

  return <>{children}</>;
}
