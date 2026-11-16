// app/(web)/profile/_components/profile-header.tsx
//
// "Профиль хедер" — первый блок на странице своего профиля.
// Логика (как на LovePlanet):
//
// === КОГДА АККОРДЕОН ЗАКРЫТ (обычный вид) ===
//   Заголовок: [✓ верификация] ИМЯ [✏️ Изменить]
//   Под заголовком (серым, мелким):
//     Слева: "Парень, 43 года, Овен"   |   Справа: иконка + просмотры
//     Под этим: 📍 Город (как ссылка, tooltip "Изменить" при ховере, клик = открыть аккордеон)
//
// === ПОВЕДЕНИЕ КАРАНДАШИКА ===
//   - Свёрнуто + нет ховера → только иконка карандашика
//   - Свёрнуто + ховер → серый фон + плавно появляется слово "Изменить"
//   - Разёрнуто → серый фон + слово "Изменить" ВИДНО ВСЕГДА (фиксировано)
//                    клик по кнопке → закрывает аккордеон (дублирует "Отменить" внизу)
//
// === КОГДА АККОРДЕОН ОТКРЫТ ===
//   Вся информация под именем (пол/возраст/зодиак/просмотры/город) ИСЧЕЗАЕТ,
//   на её месте разъезжается форма inline:
//     - Имя (input)
//     - Пол (текст, не редактируется)
//     - Дата рождения (3 select)
//     - Город (CityCombobox)
//     - Кнопки "Сохранить" / "Отменить"
//
// === ВАЛИДАЦИЯ НА ФРОНТЕ (Паттерн A + B микс) ===
//   - MAX_NAME_CHARS = 16 (совпадает с бэк валидацией max:16)
//   - maxLength УБРАН с Input — юзер может ввести любой объём,
//     но видит счётчик "X / 16" под полем
//   - При длине > MAX_NAME_CHARS → счётчик краснеет, input получает красную
//     рамку, кнопка "Сохранить" блокируется
//   - hasInvalidName = !formName.trim() || hasOverflowName — кнопка disabled
//   - hasInvalidDate — если дата частично заполнена (только день без месяца),
//     ИЛИ если полностью заполнена но невалидна (31 февраля, в будущем, юзер < 18)
//   - errors prop + localErrors для ошибок с бэка (422)
//   - errorBorderClass на Input, SelectTrigger, CityCombobox
//
// === СТИЛИ ДИЗАЙН-СИСТЕМЫ ===
//   - bg-background на Input, SelectTrigger, CityCombobox — светленькие,
//     корректно работают в светлой и тёмной теме
//
// === АДАПТИВНАЯ ШИРИНА ===
//   Все строки формы имеют одинаковую ширину контейнера (sm:w-3/5 = 60%).
//
// === ВЫПАДАЮЩИЕ СПИСКИ SELECT ===
//   - align="start" — выпадают по левому краю триггера
//   - max-h-60 — компактная высота, со скроллом

'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil, Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

import { CityCombobox } from '@/components/ui/city-combobox';

// NEW: утилита для правильного склонения русских слов (год/года/лет, человек/человека)
import { pluralizeRu } from '@/lib/pluralize';
// Месяцы и парсинг даты — общие хелперы (lib/birthdate.ts),
// чтобы не расходиться с формой регистрации
import {
  BIRTH_MONTHS,
  parseBirthDate as parseBirthDateIso,
  buildBirthDate as buildIsoDate,
} from '@/lib/birthdate';

// MAX_NAME_CHARS — лимит символов для имени.
// Совпадает с валидацией на бэке: 'max:16' в EditProfileController::updateMain.
const MAX_NAME_CHARS = 16;

const MONTHS: readonly string[] = BIRTH_MONTHS;

// Список годов для редактирования: от 18 до 80 лет назад
const getYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 18; y >= currentYear - 80; y--) {
    years.push(y);
  }
  return years;
};

// Хелпер: парсит ISO-строку "1983-04-16" в { day, month, year }
const parseBirthDate = parseBirthDateIso;

// Хелпер: собирает "YYYY-MM-DD" из 3 строк
const buildBirthDate = buildIsoDate;

// Хелпер: проверяет валидность даты рождения.
// Возвращает true если дата полностью заполнена и валидна:
//   - реальная дата (не 31 февраля)
//   - не в будущем
//   - юзер 18+ (от 18 до 80 лет)
const isValidBirthDate = (day: string, month: string, year: string): boolean => {
  if (!day || !month || !year) return false;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10) - 1; // JS months: 0-11
  const y = parseInt(year, 10);

  // Создаём дату. Если дата невалидна (например 31 февраля) — Date её
  // автоматически скорректирует (3 марта). Сравниваем с исходными значениями.
  const date = new Date(y, m, d);
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) {
    return false; // дата была скорректирована → невалидна
  }

  // Не в будущем
  const now = new Date();
  if (date > now) return false;

  // Юзер должен быть 18+
  const minBirthDate = new Date(now.getFullYear() - 80, now.getMonth(), now.getDate());
  const maxBirthDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  if (date < minBirthDate || date > maxBirthDate) return false;

  return true;
};

interface ProfileHeaderProps {
  name: string;
  isVerified: boolean;

  gender?: string | null;
  age?: number | null;

  // NEW: zodiacName приходит с бэкенда через accessor getZodiacNameAttribute().
  zodiacName?: string | null;

  viewersCount?: number;
  birthDate?: string | null;
  city?: { id: number; name: string } | null;

  className?: string;

  // NEW: controlled state — открыт ли блок. Контролируется родителем.
  isEditing: boolean;

  // NEW: callback — зовётся когда пользователь хочет открыть/закрыть блок.
  onEditingChange: (open: boolean) => void;

  onSave?: (data: {
    name: string;
    birthDate: string | null;
    cityId: number | null;
  }) => Promise<void> | void;

  // NEW: errors — объект {field: message} от родителя.
  // Приходит из handleSaveMainBlock (парсится через buildFieldErrors из lib/validation-messages).
  // Поля: name, birth_date, city_id. Показываем как красную рамку + опциональный <p>.
  errors?: Record<string, string> | null;
}

export function ProfileHeader({
  name,
  isVerified,
  gender,
  age,
  zodiacName,
  viewersCount,
  birthDate,
  city,
  className,
  // NEW: controlled state
  isEditing,
  onEditingChange,
  onSave,
  errors,
}: ProfileHeaderProps) {
  // Внутренний state только для формы (не для isEditing!)
  const [isSaving, setIsSaving] = useState(false);

  // NEW: localErrors — локальная копия errors из props (как в Bio/Headline/etc.).
  // Синхронизируется через useEffect при изменении props.errors.
  // Сбрасывается при изменении полей (handleChange + delete error).
  // Сбрасывается при handleClose/handleOpen (через resetErrors).
  const [localErrors, setLocalErrors] = useState<Record<string, string>>(errors ?? {});
  // Синхронизация с props.errors — паттерн «adjust state during render» (без эффекта)
  const [prevErrors, setPrevErrors] = useState(errors);
  if (errors !== prevErrors) {
    setPrevErrors(errors);
    setLocalErrors(errors ?? {});
  }

  // Ref на контейнер — для click-outside-to-close логики
  const containerRef = useRef<HTMLDivElement>(null);

  const initialParsed = parseBirthDate(birthDate);

  const [formName, setFormName] = useState(name);
  const [formDay, setFormDay] = useState(initialParsed?.day ?? '');
  const [formMonth, setFormMonth] = useState(initialParsed?.month ?? '');
  const [formYear, setFormYear] = useState(initialParsed?.year ?? '');

  const [formCity, setFormCity] = useState<
    { id: string; type: string; label: string } | null
  >(
    city?.id
      ? { id: String(city.id), type: 'city', label: city.name }
      : null,
  );

  // === Валидация на фронте ===
  // hasOverflowName — имя длиннее MAX_NAME_CHARS
  const hasOverflowName = formName.length > MAX_NAME_CHARS;
  // hasInvalidName — имя пустое ИЛИ переполнено → кнопка disabled
  const hasInvalidName = !formName.trim() || hasOverflowName;

  // Дата — частично заполнена (одно из 3 полей без другого)
  const anyDateField = !!formDay || !!formMonth || !!formYear;
  const allDateFields = !!formDay && !!formMonth && !!formYear;
  // hasInvalidDate — частично заполнена (нельзя только день без месяца)
  // ИЛИ полностью заполнена но невалидна (31 февраля, в будущем, < 18)
  const hasInvalidDate = (anyDateField && !allDateFields)
    || (allDateFields && !isValidBirthDate(formDay, formMonth, formYear));

  // Есть ли ВООБЩЕ ошибки (фронтовые или с бэка) — для disabled кнопки
  const hasErrors = hasInvalidName || hasInvalidDate;

  const resetForm = () => {
    setFormName(name);
    const parsed = parseBirthDate(birthDate);
    setFormDay(parsed?.day ?? '');
    setFormMonth(parsed?.month ?? '');
    setFormYear(parsed?.year ?? '');
    setFormCity(
      city?.id
        ? { id: String(city.id), type: 'city', label: city.name }
        : null,
    );
  };
  // FIX: resetErrors — сбрасываем локальные ошибки при открытии/закрытии.
  const resetErrors = () => setLocalErrors({});

  const handleOpen = () => {
    resetForm();
    resetErrors();
    onEditingChange(true);
  };

  const handleClose = () => {
    resetForm();
    resetErrors();
    onEditingChange(false);
  };

  const toggleEdit = () => {
    if (isEditing) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  // Click-outside-to-close
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Клик внутри компонента — игнорируем
      if (containerRef.current && containerRef.current.contains(target)) return;
      // FIX: Select/CityCombobox/Popover/AlertDialog рендерятся через Portal в body.
      // Проверяем, находится ли клик внутри любого popup — если да, не закрываем аккордеон.
      // Иначе: юзер кликает на пункт в dropdown'е → click-outside срабатывает →
      // аккордеон схлопывается (а dropdown остаётся висеть в body). Это баг.
      if (target.closest('[data-slot="select-content"]') ||
          target.closest('[data-slot="popover-content"]') ||
          target.closest('[role="listbox"]') ||
          target.closest('[role="dialog"]')) return;
      handleClose();
    };

    // setTimeout(0) — чтобы НЕ сработал mousedown клика, который ОТКРЫЛ аккордеон
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const handleSave = async () => {
    if (isSaving) return;
    // FIX: проверка hasErrors тут НЕ нужна — кнопка уже disabled.
    setIsSaving(true);
    try {
      // onSave бросает throw err если бэк вернул 422 или 500.
      // Тогда onEditingChange(false) НЕ вызывается → блок остаётся открытым.
      if (onSave) {
        await onSave({
          name: formName,
          birthDate: buildBirthDate(formDay, formMonth, formYear),
          cityId: formCity?.id ? Number(formCity.id) : null,
        });
      }
      // Успех — просим родителя закрыть аккордеон
      onEditingChange(false);
    } catch (err) {
      console.error('Save failed in ProfileHeader:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // FIX: при изменении имени — сбрасываем ошибку по этому полю.
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormName(e.target.value);
    setLocalErrors(prev => {
      if (!prev.name) return prev;
      const next = { ...prev };
      delete next.name;
      return next;
    });
  };

  // FIX: при изменении любого из 3 select даты — сбрасываем ошибку по birth_date.
  const handleDayChange = (v: string | null) => {
    setFormDay(v ?? '');
    setLocalErrors(prev => {
      if (!prev.birth_date) return prev;
      const next = { ...prev };
      delete next.birth_date;
      return next;
    });
  };
  const handleMonthChange = (v: string | null) => {
    setFormMonth(v ?? '');
    setLocalErrors(prev => {
      if (!prev.birth_date) return prev;
      const next = { ...prev };
      delete next.birth_date;
      return next;
    });
  };
  const handleYearChange = (v: string | null) => {
    setFormYear(v ?? '');
    setLocalErrors(prev => {
      if (!prev.birth_date) return prev;
      const next = { ...prev };
      delete next.birth_date;
      return next;
    });
  };

  // FIX: при изменении города — сбрасываем ошибку по city_id.
  const handleCityChange = (newCity: { id: string; type: string; label: string } | null) => {
    setFormCity(newCity && newCity.id ? newCity : null);
    setLocalErrors(prev => {
      if (!prev.city_id) return prev;
      const next = { ...prev };
      delete next.city_id;
      return next;
    });
  };

  // Хелпер: классы для красной рамки. Применяется к Input/SelectTrigger/CityCombobox.
  const errorBorderClass = (field: string): string =>
    localErrors[field]
      ? 'border-destructive focus-visible:ring-destructive'
      : '';

  const genderLabel =
    gender === 'male' ? 'Парень'
    : gender === 'female' ? 'Девушка'
    : (gender ? 'Не указан' : '');

  // Строка под именем: "Парень, 43 года, Овен"
  const ageWord = age !== null && age !== undefined
    ? `${age} ${pluralizeRu(age, ['год', 'года', 'лет'])}`
    : null;

  const subInfoLine = [
    genderLabel,
    ageWord,
    zodiacName,
  ].filter(Boolean).join(', ');

  return (
    <TooltipProvider delay={300}>
      <div ref={containerRef} className={className}>

        {/* === Заголовок: Иконка верификации + ИМЯ + Карандашик === */}
        <div className="flex items-center gap-2.5 flex-wrap">

          {isVerified && (
            <Tooltip>
              <TooltipTrigger className="shrink-0 cursor-default">
                <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Верификация по фото пройдена</p>
              </TooltipContent>
            </Tooltip>
          )}

          <h1 className="text-2xl font-bold text-foreground">
            {name}
          </h1>

          {/* Карандашик — переключатель */}
          <div className="group inline-flex">
            <button
              type="button"
              onClick={toggleEdit}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isEditing
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              title={isEditing ? 'Закрыть' : 'Изменить'}
              aria-label={isEditing ? 'Закрыть редактирование' : 'Изменить имя и основные данные'}
            >
              <Pencil className="w-4 h-4" />
              <span
                className={cn(
                  'text-sm overflow-hidden whitespace-nowrap transition-all duration-300',
                  isEditing
                    ? 'opacity-100 max-w-25'
                    : 'opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-25',
                )}
              >
                Изменить
              </span>
            </button>
          </div>
        </div>

        {/* === Под-имя — ПОКАЗАНО ТОЛЬКО КОГДА АККОРДЕОН ЗАКРЫТ === */}
        <div
          className={cn(
            'grid transition-all duration-300 ease-in-out overflow-hidden',
            isEditing
              ? 'grid-rows-[0fr] opacity-0'
              : 'grid-rows-[1fr] opacity-100 mt-2',
          )}
        >
          <div className="overflow-hidden">
            {/* Ряд 1: Пол/возраст/зодиак (слева) + Просмотры (справа) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {subInfoLine || 'Заполните профиль'}
              </p>
              {viewersCount !== undefined && (
                <TooltipProvider delay={300}>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 text-xs text-muted-foreground cursor-default">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                      <span>{viewersCount}</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Сейчас эту анкету просматривает {viewersCount} {pluralizeRu(viewersCount, ['человек', 'человека', 'человек'])}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Ряд 2: Город как ссылка */}
            <div className="mt-2">
              <Tooltip>
                <TooltipTrigger onClick={handleOpen}
                  className="inline-flex items-center gap-1 text-sm text-blue-500 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                  <MapPin className="w-3.5 h-3.5" />
                  {city?.name || 'Город не указан'}
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Изменить</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* === Inline-форма — ПОКАЗАНА ТОЛЬКО КОГДА АККОРДЕОН ОТКРЫТ === */}
        <div
          className={cn(
            'grid transition-all duration-300 ease-in-out',
            isEditing
              ? 'grid-rows-[1fr] opacity-100 mt-4'
              : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">

              {/* === Поле: Имя === */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label htmlFor="profile-name" className="sm:w-1/4 text-sm text-muted-foreground shrink-0">
                  Имя:
                </Label>
                <div className="sm:w-3/5 w-full">
                  {/* FIX: bg-background — светленький, корректно работает в светлой/тёмной теме.
                      maxLength УБРАН — валидация через счётчик + красную рамку + disabled кнопку.
                      errorBorderClass('name') → красная рамка при overflow ИЛИ ошибке с бэка. */}
                  <Input
                    id="profile-name"
                    value={formName}
                    onChange={handleNameChange}
                    className={cn(
                      'w-full bg-background text-[0.8125rem]',
                      hasOverflowName && 'border-destructive focus-visible:ring-destructive',
                      errorBorderClass('name'),
                    )}
                    placeholder="Ваше имя"
                    disabled={isSaving}
                  />
                  {/* Строка: слева текст ошибки (если есть), справа счётчик */}
                  <div className="flex items-start justify-between gap-2 mt-1">
                    <span className="text-[0.75rem] text-destructive leading-tight flex-1">
                      {localErrors.name}
                    </span>
                    <span className={cn(
                      'text-[0.75rem] tabular-nums shrink-0',
                      hasOverflowName ? 'text-destructive font-medium' : 'text-muted-foreground'
                    )}>
                      {formName.length}/{MAX_NAME_CHARS}
                    </span>
                  </div>
                </div>
              </div>

              {/* === Поле: Пол (текст) — тот же sm:w-3/5 контейнер === */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label className="sm:w-1/4 text-sm text-muted-foreground shrink-0">
                  Пол:
                </Label>
                <div className="sm:w-3/5 w-full">
                  <span className="text-sm text-foreground">
                    {genderLabel || 'Не указан'}
                  </span>
                </div>
              </div>

              {/* === Поле: Дата рождения (3 Select) === */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label className="sm:w-1/4 text-sm text-muted-foreground shrink-0">
                  Дата рождения:
                </Label>
                <div className="sm:w-3/5 w-full">
                  <div className="flex gap-2">
                    {/* День */}
                    <Select
                      value={formDay || null}
                      onValueChange={handleDayChange}
                      disabled={isSaving}
                    >
                      {/* FIX: bg-background на SelectTrigger — светленький.
                          Красная рамка при hasInvalidDate ИЛИ ошибке с бэка по birth_date. */}
                      <SelectTrigger className={cn(
                        'flex-1 min-w-0 bg-background',
                        (hasInvalidDate || localErrors.birth_date) && 'border-destructive focus-visible:ring-destructive',
                      )}>
                        <SelectValue placeholder="день" />
                      </SelectTrigger>
                      <SelectContent align="start" className="max-h-60">
                        {Array.from({ length: 31 }, (_, i) => {
                          const d = String(i + 1).padStart(2, '0');
                          return (
                            <SelectItem key={d} value={d}>
                              {i + 1}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {/* Месяц */}
                    <Select
                      value={formMonth || null}
                      onValueChange={handleMonthChange}
                      disabled={isSaving}
                    >
                      <SelectTrigger className={cn(
                        'flex-1 min-w-0 bg-background',
                        (hasInvalidDate || localErrors.birth_date) && 'border-destructive focus-visible:ring-destructive',
                      )}>
                        <SelectValue placeholder="месяц" />
                      </SelectTrigger>
                      <SelectContent align="start" className="max-h-60">
                        {MONTHS.map((m, i) => {
                          const mm = String(i + 1).padStart(2, '0');
                          return (
                            <SelectItem key={mm} value={mm}>
                              {m}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {/* Год */}
                    <Select
                      value={formYear || null}
                      onValueChange={handleYearChange}
                      disabled={isSaving}
                    >
                      <SelectTrigger className={cn(
                        'flex-1 min-w-0 bg-background',
                        (hasInvalidDate || localErrors.birth_date) && 'border-destructive focus-visible:ring-destructive',
                      )}>
                        <SelectValue placeholder="год" />
                      </SelectTrigger>
                      <SelectContent align="start" className="max-h-60">
                        {getYears().map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Текст ошибки по дате (фронтовая или с бэка) */}
                  {(localErrors.birth_date || hasInvalidDate) && (
                    <p className="text-[0.75rem] text-destructive mt-1 leading-tight">
                      {localErrors.birth_date || (anyDateField && !allDateFields
                        ? 'Заполните дату полностью'
                        : 'Неверная дата (должно быть 18+, не в будущем)')}
                    </p>
                  )}
                </div>
              </div>

              {/* === Поле: Город (CityCombobox) === */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label className="sm:w-1/4 text-sm text-muted-foreground shrink-0">
                  Город:
                </Label>
                <div className="sm:w-3/5 w-full">
                  {/* FIX: оборачиваем CityCombobox в div с bg-background — на случай
                      если CityCombobox не принимает className. Если принимает —
                      можно убрать div и передать className напрямую.
                      Красная рамка при ошибке с бэка по city_id. */}
                  <div className={cn(
                    'rounded-md',
                    localErrors.city_id && 'border border-destructive',
                  )}>
                    <CityCombobox
                      value={formCity ?? { id: '', type: '', label: '' }}
                      onChange={handleCityChange}
                    />
                  </div>
                  {localErrors.city_id && (
                    <p className="text-[0.75rem] text-destructive mt-1 leading-tight">
                      {localErrors.city_id}
                    </p>
                  )}
                </div>
              </div>

              {/* === Кнопки Сохранить / Отменить === */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleSave}
                  // FIX: disabled если есть ошибки валидации ИЛИ идёт сохранение.
                  disabled={isSaving || hasErrors}
                  size="sm"
                  variant="default"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="outline"
                  disabled={isSaving}
                  size="sm"
                >
                  Отменить
                </Button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
}
