// app/(web)/profile/_components/profile-edit-client.tsx
//
// «Мой профиль» — страница редактирования своего профиля.
// Данные грузятся через GET /api/user/{slug} с slug текущего пользователя
// (такой же endpoint, как для просмотра чужого профиля).
//
// Структура страницы:
//   - слева PhotoGallery (общая с чужим профилем)
//   - справа секции редактирования: Header, Headline, Photos, SubscriptionBanner,
//     Gifts, Interests, Preferences, Bio, LookingFor, PersonalInfo, SelfPortrait
//
// Аккордеон: activeSection — одновременно открыт только один блок.
// Каждая секция при 422 от Laravel получает {field: message} через props.errors
// (парсинг и тост — общий хелпер lib/api-error.ts:showSaveError).
// Ошибки пробрасываются дальше (throw) — тогда блок не закрывается и юзер
// может исправить поля.

"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { ProfileHeader } from "./profile-header";
import { ProfileHeadline } from "./profile-headline";
import { ProfileInterests } from "./profile-interests";
import { ProfilePhotos } from "./profile-photos";
import { ProfileGifts } from "./profile-gifts";
import { ProfilePreferences } from "./profile-preferences";
import { ProfileBio } from "./profile-bio";
import { SubscriptionBanner } from "../../_components/subscription-banner";
import { ProfileLookingFor } from "./profile-looking-for";
import { ProfilePersonalInfo, type PersonalInfoData } from "./profile-personal-info";
import { ProfileSelfPortrait, type SelfPortraitData } from "./profile-self-portrait";

import { PhotoGallery } from "../../_components/photo-gallery";

import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { showSaveError, getErrorMessage } from "@/lib/api-error";
import type { GiftReceived, UserInterest, UserPhoto } from "@/lib/api-types";

// Ответ GET /api/user/{slug} — только поля, которые реально использует эта страница.
interface ProfileData {
  user: {
    id: number;
    name: string;
    slug: string;
    is_verified: boolean;
    has_active_premium: boolean;
    gender?: string | null;
    last_seen?: string | null;
    photos: UserPhoto[];
    profile: {
      age: number | null;
      headline: string | null;
      looking_for: string | null;
      bio: string | null;
      city: { id: number; name: string } | null;
      zodiac_name?: string | null;
      zodiac_icon?: string | null;
      birth_date?: string | null;
      gender?: string | null;
      height?: number | null;
      weight?: number | null;
      body_type?: number | null;
      eye_color?: number | null;
      hair_color?: number | null;
      body_decorations?: number[] | null;
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
      self_portrait?: Record<string, string | null> | string | null;
      interests?: UserInterest[] | null;
      dating_goals?: string[] | null;
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

/** Частичное обновление поля profile в data (иммутабельно). */
function updateProfileField<K extends keyof ProfileData["user"]["profile"]>(
  prev: ProfileData,
  field: K,
  value: ProfileData["user"]["profile"][K],
): ProfileData {
  return {
    ...prev,
    user: { ...prev.user, profile: { ...prev.user.profile, [field]: value } },
  };
}

export function ProfileEditClient() {
  const { user: authUser } = useAuthStore();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState("");

  // Ошибки валидации по секциям: {field: message} → props.errors → красная рамка.
  // null = ошибок нет. При закрытии секции и при успехе — сбрасываем в null.
  const [personalInfoErrors, setPersonalInfoErrors] = useState<Record<string, string> | null>(null);
  const [selfPortraitErrors, setSelfPortraitErrors] = useState<Record<string, string> | null>(null);
  const [lookingForErrors, setLookingForErrors] = useState<Record<string, string> | null>(null);
  const [bioErrors, setBioErrors] = useState<Record<string, string> | null>(null);
  const [preferencesErrors, setPreferencesErrors] = useState<Record<string, string> | null>(null);
  const [headlineErrors, setHeadlineErrors] = useState<Record<string, string> | null>(null);
  const [headerErrors, setHeaderErrors] = useState<Record<string, string> | null>(null);

  // Какой блок сейчас открыт (аккордеон). null = все закрыты.
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Блок вызывает onEditingChange(true/false):
  //   true  → открыть этот блок (остальные закроются автоматически)
  //   false → закрыть блок + очистить его ошибки валидации,
  //           чтобы при повторном открытии не показывать старые
  const handleEditingChange = (section: string) => (open: boolean) => {
    setActiveSection(open ? section : null);
    if (!open) {
      if (section === 'personalInfo') setPersonalInfoErrors(null);
      if (section === 'selfPortrait') setSelfPortraitErrors(null);
      if (section === 'lookingFor') setLookingForErrors(null);
      if (section === 'bio') setBioErrors(null);
      if (section === 'headline') setHeadlineErrors(null);
      if (section === 'header') setHeaderErrors(null);
      if (section === 'preferences') setPreferencesErrors(null);
      // Интересы сами управляют своими ошибками внутри компонента
    }
  };

  // ============================================================
  // ЗАГРУЗКА ПРОФИЛЯ
  // ============================================================
  useEffect(() => {
    if (!authUser?.slug) return;

    let isMounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<ProfileData>(`/user/${authUser.slug}`);
        if (isMounted) {
          setData(res.data);
          // URL страницы профиля (для блока «Адрес вашей страницы»)
          if (typeof window !== "undefined") {
            setPageUrl(`${window.location.origin}/user/${res.data.user.slug}`);
          }
        }
      } catch (err: unknown) {
        const error = err as { response?: { status?: number } };
        if (isMounted) {
          setError(
            error.response?.status === 404
              ? "Профиль не найден"
              : "Ошибка загрузки",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [authUser?.slug]);

  // ============================================================
  // ОБРАБОТЧИКИ СОХРАНЕНИЯ СЕКЦИЙ
  //
  // Общий сценарий: PATCH → toast.success → обновить локальный state →
  // в catch: showSaveError(err) (тост + {field: message}) → throw,
  // чтобы блок редактирования остался открытым.
  // ============================================================

  // PATCH /profile/self-portrait — 19 полей автопортрета
  const handleSaveSelfPortrait = async (data: SelfPortraitData) => {
    try {
      await api.patch('/profile/self-portrait', data);
      toast.success('Автопортрет обновлён.');
      setSelfPortraitErrors(null);
      // Бэк перезаписывает self_portrait целиком — заменяем объект
      setData(prev => prev ? updateProfileField(prev, 'self_portrait', data) : prev);
    } catch (err) {
      setSelfPortraitErrors(showSaveError(err));
      throw err;
    }
  };

  // PATCH /profile/looking-for — «Кого я хочу найти»
  const handleSaveLookingFor = async (text: string) => {
    try {
      await api.patch('/profile/looking-for', { looking_for: text });
      toast.success('Раздел «Кого я хочу найти» обновлён.');
      setLookingForErrors(null);
      setData(prev => prev ? updateProfileField(prev, 'looking_for', text || null) : prev);
    } catch (err) {
      setLookingForErrors(showSaveError(err));
      throw err;
    }
  };

  // PATCH /profile/bio — «Свободно о себе»
  const handleSaveBio = async (text: string) => {
    try {
      await api.patch('/profile/bio', { bio: text });
      toast.success('Раздел «О себе» обновлён.');
      setBioErrors(null);
      setData(prev => prev ? updateProfileField(prev, 'bio', text || null) : prev);
    } catch (err) {
      setBioErrors(showSaveError(err));
      throw err;
    }
  };

  // PATCH /profile/headline — статус
  const handleSaveHeadline = async (text: string) => {
    try {
      await api.patch('/profile/headline', { headline: text });
      toast.success('Статус изменён.');
      setHeadlineErrors(null);
      setData(prev => prev ? updateProfileField(prev, 'headline', text || null) : prev);
    } catch (err) {
      setHeadlineErrors(showSaveError(err));
      throw err;
    }
  };

  // PATCH /profile/preferences — «Познакомлюсь» (пол, возраст, цели)
  const handleSavePreferences = async (data: {
    preferredGender: string;
    preferredAgeMin: number;
    preferredAgeMax: number;
    datingGoals: string[];
  }) => {
    try {
      // На бэк отправляем snake_case (Laravel-конвенция)
      await api.patch('/profile/preferences', {
        preferred_gender: data.preferredGender,
        preferred_age_min: data.preferredAgeMin,
        preferred_age_max: data.preferredAgeMax,
        dating_goals: data.datingGoals,
      });
      toast.success('Параметры поиска обновлены.');
      setPreferencesErrors(null);
      setData(prev => prev ? {
        ...prev,
        user: {
          ...prev.user,
          preferences: {
            preferred_gender: data.preferredGender,
            preferred_age_min: data.preferredAgeMin,
            preferred_age_max: data.preferredAgeMax,
          },
          profile: { ...prev.user.profile, dating_goals: data.datingGoals },
        },
      } : prev);
    } catch (err) {
      setPreferencesErrors(showSaveError(err));
      throw err;
    }
  };

  // PATCH /profile/personal-info — личная информация (внешность, быт, работа, привычки)
  const handleSavePersonalInfo = async (data: PersonalInfoData) => {
    try {
      await api.patch('/profile/personal-info', data);
      toast.success('Личная информация обновлена.');
      setPersonalInfoErrors(null);
      if (data) {
        setData(prev => prev ? {
          ...prev,
          user: {
            ...prev.user,
            profile: { ...prev.user.profile, ...data },
          },
        } : prev);
      }
    } catch (err) {
      setPersonalInfoErrors(showSaveError(err));
      throw err;
    }
  };

  // PATCH /profile/main — имя, дата рождения, город.
  // Бэк возвращает свежий user (с пересчитанными accessor-ами age/zodiac и
  // relations city) — заменяем user целиком, сохраняя photos и gifts_received.
  const handleSaveMainBlock = async (saveData: {
    name: string;
    birthDate: string | null;
    cityId: number | null;
  }) => {
    try {
      const response = await api.patch<{ user?: ProfileData['user'] }>('/profile/main', {
        name: saveData.name,
        birth_date: saveData.birthDate,
        city_id: saveData.cityId,
      });

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setData(prev => prev ? {
          ...prev,
          user: {
            ...updatedUser,
            gifts_received: prev.user.gifts_received, // не возвращаются этим endpoint
            photos: prev.user.photos,                  // не возвращаются этим endpoint
          },
        } : prev);
      }

      setHeaderErrors(null);
      toast.success('Основные данные обновлены.');
    } catch (err) {
      setHeaderErrors(showSaveError(err));
      throw err;
    }
  };

  // DELETE /gifts/{giftId} — удаление подарка из своей коллекции.
  // Личное действие: никто не получает уведомлений.
  const handleDeleteGift = async (giftId: number) => {
    try {
      await api.delete(`/gifts/${giftId}`);
      if (data) {
        setData({
          ...data,
          user: {
            ...data.user,
            gifts_received: data.user.gifts_received.filter(
              (g) => g.id !== giftId,
            ),
          },
        });
      }
      toast.success('Подарок удалён из вашей коллекции.');
    } catch (err) {
      // 404 — подарок уже удалён; 403 — не ваш подарок; 500 — сервер
      toast.error(getErrorMessage(err, 'Не удалось удалить подарок'));
      // Пробрасываем → child в finally сбросит deletingGiftId
      throw err;
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!authUser) {
    return null; // роут-гард сделает redirect
  }

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

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row gap-8 p-6">

        {/* ЛЕВАЯ ЧАСТЬ: фото-галерея */}
        <div className="w-full md:w-[33%] shrink-0">
          <PhotoGallery
            photos={user.photos || []}
            isPremium={user.has_active_premium}
            name={user.name}
            isAuth={data.is_auth}
            onGuestClick={() => {}}  // свой профиль — уже залогинен
          />
        </div>

        {/* ПРАВАЯ ЧАСТЬ: секции профиля */}
        <div className="flex-1 py-2 flex flex-col">

          {/* Имя + верификация + возраст/зодиак/город (редактируется) */}
          <ProfileHeader
            className="mb-2"
            name={user.name}
            isVerified={user.is_verified}
            gender={user.gender ?? user.profile?.gender ?? null}
            age={user.profile?.age ?? null}
            zodiacName={user.profile?.zodiac_name ?? null}
            viewersCount={data.viewers_count}
            birthDate={user.profile?.birth_date ?? null}
            city={
              user.profile?.city
                ? {
                    id: user.profile.city.id,
                    name: user.profile.city.name,
                  }
                : null
            }
            isEditing={activeSection === 'header'}
            onEditingChange={handleEditingChange('header')}
            onSave={handleSaveMainBlock}
            errors={headerErrors}
          />

          {/* Статус (headline) */}
          <ProfileHeadline
            headline={user.profile.headline}
            isEditing={activeSection === 'headline'}
            onEditingChange={handleEditingChange('headline')}
            onSave={handleSaveHeadline}
            errors={headlineErrors}
          />

          {/* Мои фото (мини-сетка + ссылка на управление) */}
          <ProfilePhotos
            photos={user.photos}
            className="mb-6"
          />

          {/* Премиум доступ */}
          <SubscriptionBanner className="mb-0" />

          {/* Подарки (удаление своих полученных подарков) */}
          <ProfileGifts
            className="mb-8"
            gifts={user.gifts_received || []}
            isEditing={activeSection === 'gifts'}
            onEditingChange={handleEditingChange('gifts')}
            hasPremium={authUser?.has_active_premium ?? false}
            onDeleteGift={handleDeleteGift}
          />

          {/* Интересы (multi-select; сохраняет сам через PATCH /profile/interests) */}
          <ProfileInterests
            interests={user.profile.interests}
            isEditing={activeSection === 'interests'}
            onEditingChange={handleEditingChange('interests')}
            onSaved={(newInterests) => {
              setData(prev => prev ? updateProfileField(prev, 'interests', newInterests) : prev);
            }}
          />

          {/* Познакомлюсь (пол, возраст, цели) */}
          <ProfilePreferences
            preferredGender={user.preferences?.preferred_gender ?? null}
            preferredAgeMin={user.preferences?.preferred_age_min ?? null}
            preferredAgeMax={user.preferences?.preferred_age_max ?? null}
            datingGoals={user.profile?.dating_goals ?? null}
            gender={user.gender ?? user.profile?.gender ?? null}
            isEditing={activeSection === 'preferences'}
            onEditingChange={handleEditingChange('preferences')}
            onSave={handleSavePreferences}
            errors={preferencesErrors}
          />

          {/* Свободно о себе */}
          <ProfileBio
            bio={user.profile.bio}
            isEditing={activeSection === 'bio'}
            onEditingChange={handleEditingChange('bio')}
            onSave={handleSaveBio}
            errors={bioErrors}
          />

          {/* Кого я хочу найти */}
          <ProfileLookingFor
            lookingFor={user.profile.looking_for}
            isEditing={activeSection === 'lookingFor'}
            onEditingChange={handleEditingChange('lookingFor')}
            onSave={handleSaveLookingFor}
            errors={lookingForErrors}
          />

          {/* Личная информация */}
          <ProfilePersonalInfo
            profile={user.profile}
            isEditing={activeSection === 'personalInfo'}
            onEditingChange={handleEditingChange('personalInfo')}
            onSave={handleSavePersonalInfo}
            errors={personalInfoErrors}
          />

          {/* Автопортрет (19 полей) */}
          <ProfileSelfPortrait
            selfPortrait={user.profile.self_portrait}
            isEditing={activeSection === 'selfPortrait'}
            onEditingChange={handleEditingChange('selfPortrait')}
            onSave={handleSaveSelfPortrait}
            errors={selfPortraitErrors}
          />

          {/* Адрес страницы профиля */}
          <div className='flex w-full overflow-hidden flex-col sm:flex-row gap-3 sm:gap-8 text-base sm:text-[0.8125rem]'>
            <div className="font-medium text-accent-foreground sm:text-muted-foreground sm:w-1/3">
              Адрес вашей страницы
            </div>
            <a
              href={pageUrl}
              className="sm:pl-3 inline-block text-blue-500 dark:text-blue-400 text-[0.8125rem] hover:underline truncate sm:w-2/3"
              target="_blank"
              rel="noopener noreferrer"
            >
              {pageUrl || "Загрузка..."}
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
