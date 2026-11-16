// store/auth-store.ts
import { create } from "zustand";
import api from "@/lib/api";

// Описываем тип Юзера на основе твоей модели Laravel
export interface User {
  id: number;
  name: string;
  email: string;
  slug: string;
  balance?: { credits: number };
  email_verified_at: string | null;
  has_completed_onboarding: boolean;
  is_verified: boolean;
  role: "user" | "admin" | "moderator" | "support";
  avatar_url: string;
  has_active_vip: boolean;
  vip_expires_at: string | null; // <--- Добавили
  has_active_premium: boolean;
  premium_expires_at: string | null; // <--- Добавили
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  hydrate: (user: User | null) => void; // <--- добавить
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  // Проверка текущей сессии при старте приложения (GET /api/me).
  // Guard: если бэк вернул неожиданную форму — считаем гостем, чтобы
  // навигация не «тихо» ушла в guest-режим из-за user: undefined.
  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ user?: User }>('/me');
      const user = response.data?.user;
      set({
        user: user && typeof user === 'object' && 'id' in user ? user : null,
        isLoading: false,
      });
    } catch {
      set({ user: null, isLoading: false });
    } finally {
      set({ isInitialized: true });
    }
  },

  setUser: (user) => set({ user }),

  hydrate: (user) => set({ user, isLoading: false, isInitialized: true }),

  logout: async () => {
    try {
      await api.post("/logout"); // Роут логаута в Laravel
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      set({ user: null });
      // Осознанная жёсткая перезагрузка: после логаута нужно сбросить
      // ВСЁ клиентское состояние (zustand-сторы, кэши данных), а не только URL.
      // router.push() здесь не подходит — он не выгружает страницу.
      if (typeof window !== "undefined") {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/");
      }
    }
  },
}));
