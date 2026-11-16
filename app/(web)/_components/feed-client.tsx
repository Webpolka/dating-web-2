// app/(web)/_components/feed-client.tsx
//
// Лента анкет + панель поиска. Используется на главной (isSearchPage=false)
// и на странице /search (isSearchPage=true).
//
// Данные: GET /api/users/search (плоская пагинация: { users, current_page,
// last_page, total, per_page }). Ответ приходит из lib/api-types.SearchResponse.
// Все обращения к массивам защищены Array.isArray — если формат ответа
// изменится, лента покажет пустое состояние вместо краша.

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import api from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { SearchPanel } from "./search-panel";
import { UserCard } from "./user-card";
import { ButtonLink } from "@/components/ui/button-link";
import type { FeedUser, SearchFilters, SearchResponse } from "@/lib/api-types";

// По 9 карточек в сетке (3×3 на десктопе)
const PER_PAGE = 9;

const DEFAULT_FILTERS: SearchFilters = {
  gender: "any",
  city_id: "",
  country_id: "",
  city_label: "",
  dating_goal: "any",
  activity: "",
  age: [18, 50],
  age_from: 18,
  age_to: 50,
  is_new: false,
  verified_only: false,
  interest_ids: [],
  adv1: "none",
  adv1_values: [],
  adv2: "none",
  adv2_values: [],
  adv3: "none",
  adv3_values: [],
  weight: [45, 85],
  height: [150, 185],
};

/** Собирает payload для /users/search из текущих фильтров. */
function getPayload(currentFilters: SearchFilters): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    gender: currentFilters.gender || "any",
    city_id: currentFilters.city_id || "",
    country_id: currentFilters.country_id || "",
    dating_goal: currentFilters.dating_goal || "any",
    activity: currentFilters.activity || "",
    age_from: currentFilters.age[0],
    age_to: currentFilters.age[1],
    is_new: currentFilters.is_new,
    verified_only: currentFilters.verified_only,
  };

  if (currentFilters.interest_ids.length > 0) {
    payload.interests = currentFilters.interest_ids;
  }

  (["adv1", "adv2", "adv3"] as const).forEach((slot) => {
    const type = currentFilters[slot];
    if (type !== "none") {
      if (type === "weight" || type === "height") {
        const sliderVal = currentFilters[type] as number[];
        payload[`${type}_from`] = sliderVal[0];
        payload[`${type}_to`] = sliderVal[1];
      } else {
        payload[type] = (currentFilters[`${slot}_values`] as string[]).map((v) =>
          parseInt(v),
        );
      }
    }
  });

  return payload;
}

export function FeedClient({ isSearchPage = false }: { isSearchPage?: boolean }) {
  const { user } = useAuthStore();
  const { openLoginModal } = useUIStore();
  const isAuth = !!user;

  const [showSearchPanel, setShowSearchPanel] = useState(
    !isAuth ? true : !isSearchPage,
  );
  const [showAdvanced, setShowAdvanced] = useState(isAuth && !isSearchPage);

  const [users, setUsers] = useState<FeedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(!isSearchPage);

  const [filters, setFilters] = useState<SearchFilters>({ ...DEFAULT_FILTERS });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ============================================================
  // ЗАГРУЗКА — принимает override-фильтры (для сброса)
  // ============================================================
  const fetchUsers = useCallback(
    async (
      pageToFetch: number,
      isLoadMore: boolean = false,
      overrideFilters?: SearchFilters,
    ) => {
      const currentFilters = overrideFilters || filters;

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        const payload = getPayload(currentFilters);
        payload.page = pageToFetch;
        payload.per_page = PER_PAGE;

        Object.keys(payload).forEach((key) => {
          const val = payload[key];
          if (Array.isArray(val)) {
            if (val.length > 0) {
              val.forEach((v) => params.append(`${key}[]`, String(v)));
            }
          } else if (val !== "" && val !== null && val !== undefined) {
            params.append(key, String(val));
          }
        });

        const response = await api.get<SearchResponse>(
          `/users/search?${params.toString()}`,
        );
        const data = response.data;

        if (data.error) {
          throw new Error(data.message || "Ошибка поиска");
        }

        // Guard: любое отклонение от ожидаемого формата не должно ронять рендер.
        const pageUsers: FeedUser[] = Array.isArray(data.users) ? data.users : [];

        // Атомарная замена или добавление — без прыжков
        if (pageToFetch === 1) {
          setUsers(pageUsers);
        } else {
          setUsers((prev) => [...prev, ...pageUsers]);
        }
        setCurrentPage(Number(data.current_page) || pageToFetch);
        setLastPage(Number(data.last_page) || 1);
      } catch (error) {
        console.error("[FeedClient] Ошибка загрузки анкет:", error);
      } finally {
        if (isLoadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [filters],
  );

  // Первичная загрузка (async-лаунчер — setState внутри fetchUsers
  // выполняется в асинхронном контексте, а не синхронно в теле эффекта)
  useEffect(() => {
    (async () => {
      fetchUsers(1, false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // ОБРАБОТЧИКИ
  // ============================================================

  // Кнопка «Искать» — атомарная замена результата.
  const applyFilters = useCallback(() => {
    fetchUsers(1, false);
  }, [fetchUsers]);

  // Сброс фильтров — грузим с дефолтными фильтрами (не с текущими).
  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    fetchUsers(1, false, { ...DEFAULT_FILTERS });
  }, [fetchUsers]);

  // Кнопка «Найти еще людей»: подгружаем следующую страницу сразу
  // и включаем бесконечный скролл дальше.
  const handleLoadMore = useCallback(() => {
    setShowLoadMoreButton(false);
    if (currentPage < lastPage) {
      fetchUsers(currentPage + 1, true);
    }
  }, [currentPage, lastPage, fetchUsers]);

  // ============================================================
  // БЕСКОНЕЧНЫЙ СКРОЛЛ (после включения кнопкой)
  // ============================================================
  useEffect(() => {
    if (showLoadMoreButton) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingMore &&
          currentPage < lastPage
        ) {
          fetchUsers(currentPage + 1, true);
        }
      },
      { rootMargin: "200px" },
    );
    observerRef.current.observe(sentinel);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [showLoadMoreButton, loadingMore, currentPage, lastPage, fetchUsers]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* 1. Панель поиска */}
      <SearchPanel
        isAuth={isAuth}
        isSearchPage={isSearchPage}
        showSearchPanel={showSearchPanel}
        setShowSearchPanel={setShowSearchPanel}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        filters={filters}
        setFilters={setFilters}
        applyFilters={applyFilters}
        resetFilters={resetFilters}
        loading={loading}
      />

      {/* 2. Сетка анкет */}
      <div>
        {/* Крупный спиннер ТОЛЬКО при первой загрузке (когда списка ещё нет) */}
        {loading && users.length === 0 && (
          <div className="flex justify-center items-center py-[33dvh]">
            <Loader className="w-10 h-10" />
          </div>
        )}

        {/* Сетка карточек */}
        {users.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user, index) => (
              <UserCard
                key={user.id}
                user={user}
                index={index}
                isAuth={isAuth}
                onWriteClick={!isAuth ? openLoginModal : undefined}
              />
            ))}
          </div>
        )}

        {/* Пустой результат */}
        {!loading && users.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <p className="mb-4">
              По вашим критериям никого не найдено. Попробуйте изменить фильтры.
            </p>
            <Button variant="outline" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </div>
        )}
      </div>

      {/* 3. «Показать еще» и бесконечный скролл */}
      <div className="pt-4 flex flex-col items-center justify-center gap-4">
        {!isSearchPage &&
          showLoadMoreButton &&
          currentPage < lastPage &&
          users.length > 0 && (
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loading || loadingMore}
              className="border-primary text-primary px-6 py-2 rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {loading || loadingMore ? "Ищем..." : "Найти еще людей"}
            </Button>
          )}
        {!showLoadMoreButton && currentPage < lastPage && (
          <Loader className="w-8 h-8" />
        )}
        {/* Скрытый сенсор для IntersectionObserver */}
        <div ref={sentinelRef} className="h-1"></div>
      </div>

      {/* 4. БЛОК ИНФОРМАЦИИ ТОЛЬКО ДЛЯ ГОСТЯ */}
      {!isAuth && (
        <div className="mt-8 bg-card border border-border rounded-xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold">
            Добро пожаловать на Dating App!
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Наш сайт знакомств поможет вам найти серьезные отношения, друзей или
            просто интересных собеседников. Регистрируйтесь бесплатно, чтобы
            получить доступ к чатам, лайкам и полному просмотру анкет.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <ButtonLink href="/register">Создать аккаунт</ButtonLink>
            <Button variant="outline" onClick={() => openLoginModal()}>
              Войти
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-primary">
              Правила сайта
            </a>
            <a href="#" className="hover:text-primary">
              Политика конфиденциальности
            </a>
            <a href="#" className="hover:text-primary">
              Поддержка
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
