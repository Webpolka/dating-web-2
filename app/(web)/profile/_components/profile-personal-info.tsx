// app/(web)/profile/_components/profile-personal-info.tsx
//
// "Личная информация" — секция с множеством полей.
// Карточка (bg-muted/30 rounded-lg border border-border) + inline-аккордеон.
//
// View mode: ВСЕ поля по группам (даже пустые → "Пока не указано")
// Edit mode: карточка с формой — все поля
//
// Select: null → placeholder "Пока не указано" (не "0")
// Тоглы: Toggle (кнопка с текстом) вместо Checkbox

'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
// NEW: Badge из shadcn/ui — для бейджиков Языков и Спорта в view mode.
// Стиль: variant="outline" (прозрачный с бордюром), rounded-full по умолчанию.
// Если в проекте нет @/components/ui/badge — добавь через: npx shadcn@latest add badge
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectTrigger,  SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  BODY_TYPE_OPTIONS, EYE_COLOR_OPTIONS, HAIR_COLOR_OPTIONS, BODY_DECORATIONS,
  RELATIONSHIP_STATUS_OPTIONS, CHILDREN_STATUS_OPTIONS,
  PETS_OPTIONS, HOUSING_OPTIONS, HAS_CAR_OPTIONS,
  EDUCATION_LEVEL_OPTIONS, INCOME_OPTIONS,
  SMOKING_OPTIONS, ALCOHOL_OPTIONS,
  LANGUAGES, SPORTS,
  getLabelByValue, getLabelsByValues,
} from '@/lib/profile-personal-info-config';

export interface PersonalInfoData {
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
}

interface ProfilePersonalInfoProps {
  profile: PersonalInfoData;
  isEditing: boolean;
  onEditingChange: (open: boolean) => void;
  className?: string;
  onSave?: (data: PersonalInfoData) => Promise<void> | void;
  // NEW: errors — объект {field: message} от родителя.
  // Приходит из handleSavePersonalInfo (парсится через buildFieldErrors из lib/validation-messages).
  // Ключи — технические имена полей (institution_year, height, ...).
  // Значения — человекочитаемые сообщения ("Должно быть не меньше 1950.").
  // Если null/undefined — ошибок нет (исходное состояние).
  errors?: Record<string, string> | null;
}

// Текст для пустых полей
const NOT_SET = 'Пока не указано';

// FIX: Скрываем нативные стрелки вверх/вниз у <input type="number">.
// Братан сказал — они не нужны, мешают.
// - [appearance:textfield] → Firefox
// - [&::-webkit-inner-spin-button]:appearance-none → Chrome inner
// - [&::-webkit-outer-spin-button]:appearance-none → Chrome outer
const NO_SPINNER =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [margin:0]';

export function ProfilePersonalInfo({
  profile,
  isEditing,
  onEditingChange,
  className,
  onSave,
  errors,
}: ProfilePersonalInfoProps) {
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // NEW: localErrors — локальная копия errors из props.
  // Зачем локальная: при изменении поля пользователем — мы хотим сразу убрать красную рамку,
  // не дожидаясь перерендера родителя (который не знает об изменении до нового save).
  // Синхронизация: useEffect срабатывает когда меняется props.errors (родитель передал новый объект).
  const [localErrors, setLocalErrors] = useState<Record<string, string>>(errors ?? {});
  // Синхронизация с props.errors — паттерн «adjust state during render»
  // (без эффекта, см. react.dev/learn/you-might-not-need-an-effect):
  // когда родитель передаёт новый объект errors — перезатираем локальную копию.
  const [prevErrors, setPrevErrors] = useState(errors);
  if (errors !== prevErrors) {
    setPrevErrors(errors);
    setLocalErrors(errors ?? {});
  }

  // Хелпер: вернуть классы для красной рамки, если поле в ошибке.
  // Применяется к Input className (через cn).
  const errorBorderClass = (field: keyof PersonalInfoData | string): string =>
    localErrors[field as string]
      ? 'border-destructive focus-visible:ring-destructive'
      : '';

  // === Локальный state формы ===
  const [form, setForm] = useState<PersonalInfoData>({
    height: profile.height ?? null,
    weight: profile.weight ?? null,
    body_type: profile.body_type ?? null,
    eye_color: profile.eye_color ?? null,
    hair_color: profile.hair_color ?? null,
    body_decorations: Array.isArray(profile.body_decorations) ? profile.body_decorations : [],
    relationship_status: profile.relationship_status ?? null,
    children_status: profile.children_status ?? null,
    pets: profile.pets ?? null,
    housing: profile.housing ?? null,
    has_car: profile.has_car ?? null,
    education_level: profile.education_level ?? null,
    institution: profile.institution ?? null,
    institution_year: profile.institution_year ?? null,
    income: profile.income ?? null,
    activity: profile.activity ?? null,
    position: profile.position ?? null,
    smoking: profile.smoking ?? null,
    alcohol: profile.alcohol ?? null,
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    sports: Array.isArray(profile.sports) ? profile.sports : [],
  });

  // FIX: resetForm копирует из profile (оригинал), НЕ из form (грязное состояние).
  // Раньше было setForm({ ...form }) — это копировало текущую грязную форму,
  // и кнопка "Отменить" не сбрасывала изменения.
  const resetForm = () => setForm({
    height: profile.height ?? null,
    weight: profile.weight ?? null,
    body_type: profile.body_type ?? null,
    eye_color: profile.eye_color ?? null,
    hair_color: profile.hair_color ?? null,
    body_decorations: Array.isArray(profile.body_decorations) ? profile.body_decorations : [],
    relationship_status: profile.relationship_status ?? null,
    children_status: profile.children_status ?? null,
    pets: profile.pets ?? null,
    housing: profile.housing ?? null,
    has_car: profile.has_car ?? null,
    education_level: profile.education_level ?? null,
    institution: profile.institution ?? null,
    institution_year: profile.institution_year ?? null,
    income: profile.income ?? null,
    activity: profile.activity ?? null,
    position: profile.position ?? null,
    smoking: profile.smoking ?? null,
    alcohol: profile.alcohol ?? null,
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    sports: Array.isArray(profile.sports) ? profile.sports : [],
  });
  // FIX: resetErrors — сбрасываем локальные ошибки.
  // Зачем: когда пользователь жмёт "Свернуть" или "Изменить" (открыть) —
  // красные рамки и тексты должны исчезнуть.
  // Раньше localErrors не чистился при resetForm → блок открывался со старыми ошибками,
  // даже если данные из БД уже подтянулись корректные.
  //
  // Также: при handleClose мы зовём onEditingChange(false) — родитель в handleEditingChange
  // тоже почистит personalInfoErrors в state (см. profile-edit-client.tsx),
  // но localErrors у нас локальный — его чистим сами.
  const resetErrors = () => setLocalErrors({});
  const handleOpen = () => { resetForm(); resetErrors(); onEditingChange(true); };
  const handleClose = () => { resetForm(); resetErrors(); onEditingChange(false); };
  const toggleEdit = () => { if (isEditing) handleClose(); else handleOpen(); };

  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Клик внутри компонента — игнорируем
      if (containerRef.current && containerRef.current.contains(target)) return;
      // FIX: Select/Popover/AlertDialog рендерятся через Portal в body.
      // Проверяем, находится ли клик внутри любого popup — если да, не закрываем.
      if (target.closest('[data-slot="select-content"]') ||
          target.closest('[data-slot="popover-content"]') ||
          target.closest('[role="listbox"]') ||
          target.closest('[role="dialog"]')) return;
      handleClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClickOutside); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // onSave бросает throw err если бэк вернул 422 (валидация) или 500.
      // Тогда onEditingChange(false) ВООБЩЕ НЕ ВЫЗЫВАЕТСЯ → блок остаётся открытым,
      // пользователь видит тост (показывается в родителе в handleSavePersonalInfo)
      // и может исправить поля, нажать "Сохранить" снова.
      if (onSave) await onSave(form);
      onEditingChange(false);  // закрываем блок ТОЛЬКО если onSave успешно
    } catch (err) {
      // Toast уже показан в родителе (handleSavePersonalInfo) — здесь только лог.
      console.error('Save failed:', err);
    } finally {
      // isSaving сбрасывается ВСЕГДА — даже при ошибке, чтобы кнопка не зависла.
      setIsSaving(false);
    }
  };

  // FIX: updateField сбрасывает ошибку по этому полю — пользователь начал исправлять,
  // значит старая ошибка уже не актуальна. Красная рамка исчезнет сразу же.
  const updateField = <K extends keyof PersonalInfoData>(key: K, value: PersonalInfoData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setLocalErrors(prev => {
      if (!prev[key as string]) return prev; // ошибки по этому полю нет — не трогаем
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  // FIX: toggleArrayValue — то же самое: при изменении массива сбрасываем ошибку.
  const toggleArrayValue = (key: 'body_decorations' | 'languages' | 'sports', value: number) => {
    setForm(prev => {
      const arr = Array.isArray(prev[key]) ? prev[key] as number[] : [];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
    setLocalErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // === View mode — ПЛОСКИЙ список полей без заголовков групп ===
  //
  // Раньше было 7 групп с заголовками (Внешность, Отношения, Быт, Работа, ...).
  // Братан сказал — упрощаем: "Внешность" и "Отношения" теперь это просто
  // лейблы полей (не заголовки групп), а остальные группы исчезают совсем —
  // их поля выводятся как обычные строки в общем списке.
  //
  // Особые поля (с составным значением):
  //   - "Внешность" → "183 см, Стройное телосложение" (Рост + Телосложение).
  //     Слово "телосложение" добавляется НЕ ко всем лейблам — см. BODY_TYPE_WITHOUT_WORD ниже.
  //     Вес, Цвет глаз, Цвет волос, "На теле есть" — в view mode НЕ показываем.
  //   - "Отношения" → только Статус (без Дети — Дети выводим отдельным полем)
  //
  // Логика сборки "Внешность":
  //   - оба есть:     "183 см, Стройное телосложение"
  //   - только рост:  "183 см"
  //   - только type:  "Стройное телосложение"
  //   - оба null:     "Пока не указано"
  //
  // FIX: слово "телосложение" добавляется НЕ ко всем лейблам, а только к тем,
  // которые по-русски сочетаются с этим словом:
  //   - value=1 "Стройное"            → "Стройное телосложение"   ✓
  //   - value=3 "Спортивное"         → "Спортивное телосложение" ✓
  //   - value=6 "Полное"              → "Полное телосложение"     ✓
  //   - value=0 "Нет ответа"          → "Нет ответа"              ✗ (без слова)
  //   - value=5 "Есть пара лишних кило" → "Есть пара лишних кило" ✗ (без слова)
  //
  // Исключения — value, для которых слово "телосложение" НЕ добавляется:
  const BODY_TYPE_WITHOUT_WORD = new Set([0, 5]);

  const appearanceParts: string[] = [];
  if (profile.height) appearanceParts.push(`${profile.height} см`);
  const bodyTypeLabel = getLabelByValue(BODY_TYPE_OPTIONS, profile.body_type);
  if (bodyTypeLabel) {
    // Если body_type в исключениях → выводим лейбл как есть, БЕЗ слова "телосложение".
    // Иначе → добавляем " телосложение" в конец (для прилагательных: Стройное/Спортивное/Полное).
    const withWord = profile.body_type != null
      && !BODY_TYPE_WITHOUT_WORD.has(profile.body_type);
    appearanceParts.push(withWord ? `${bodyTypeLabel} телосложение` : bodyTypeLabel);
  }
  const appearanceValue = appearanceParts.length > 0 ? appearanceParts.join(', ') : NOT_SET;

  // "Отношения" — только Статус (Дети — отдельное поле ниже)
  const relationshipValue = getLabelByValue(RELATIONSHIP_STATUS_OPTIONS, profile.relationship_status) ?? NOT_SET;

  // viewFields — массив полей для view mode.
  //   - label: текст лейбла (слева, 1/3 ширины)
  //   - value: строка-значение (справа, 2/3 ширины)
  //   - badges?: массив строк → рендерим как бейджики (Badge из shadcn/ui),
  //     вместо обычной строки. Используется для Языков и Спорта.
  //     Если badges пустой массив — показываем "Пока не указано".
  const viewFields: { label: string; value?: string; badges?: string[] }[] = [
    // Внешность (составное: Рост + Телосложение)
    { label: 'Внешность', value: appearanceValue },
    // Отношения (только Статус)
    { label: 'Отношения', value: relationshipValue },
    // Дети — отдельное поле (раньше было под группой "Отношения")
    { label: 'Дети', value: getLabelByValue(CHILDREN_STATUS_OPTIONS, profile.children_status) ?? NOT_SET },
    // Быт — без заголовка группы
    { label: 'Домашние животные', value: getLabelByValue(PETS_OPTIONS, profile.pets) ?? NOT_SET },
    { label: 'Жилищные условия', value: getLabelByValue(HOUSING_OPTIONS, profile.housing) ?? NOT_SET },
    { label: 'Наличие автомобиля', value: getLabelByValue(HAS_CAR_OPTIONS, profile.has_car) ?? NOT_SET },
    // Работа — без заголовка группы
    { label: 'Образование', value: getLabelByValue(EDUCATION_LEVEL_OPTIONS, profile.education_level) ?? NOT_SET },
    { label: 'Учебное заведение', value: profile.institution || NOT_SET },
    { label: 'Год выпуска', value: profile.institution_year ? String(profile.institution_year) : NOT_SET },
    { label: 'Доход', value: getLabelByValue(INCOME_OPTIONS, profile.income) ?? NOT_SET },
    { label: 'Сфера деятельности', value: profile.activity || NOT_SET },
    { label: 'Должность', value: profile.position || NOT_SET },
    // Привычки — без заголовка группы
    { label: 'Курение', value: getLabelByValue(SMOKING_OPTIONS, profile.smoking) ?? NOT_SET },
    { label: 'Алкоголь', value: getLabelByValue(ALCOHOL_OPTIONS, profile.alcohol) ?? NOT_SET },
    // Языки и Спорт — бейджики (Badge), а не строка через запятую.
    // badges — массив лейблов выбранных значений.
    { label: 'Знание языков', badges: getLabelsByValues(LANGUAGES, profile.languages) },
    { label: 'Спорт', badges: getLabelsByValues(SPORTS, profile.sports) },
  ];

  // === Переиспользуемые элементы ===
  // FIX: renderSelect принимает error?: string — если есть, SelectTrigger получает
  // красную рамку (border-destructive focus-visible:ring-destructive).
  const renderSelect = (
    options: { value: number; label: string }[],
    value: number | null,
    onChange: (v: number | null) => void,
    error?: string,
  ) => {
    const stringValue = value && value > 0 ? String(value) : null;
    const selectedLabel = stringValue
      ? options.find(o => String(o.value) === stringValue)?.label
      : null;
    return (
      <Select
        value={stringValue}
        onValueChange={(v) => onChange(v ? Number(v) : null)}
        disabled={isSaving}
      >
        <SelectTrigger className={cn(
          'w-full bg-background text-[0.8125rem]',
          error && 'border-destructive focus-visible:ring-destructive',
        )}>
          {/* FIX: base-ui SelectValue показывает raw value ("1") вместо label.
              Ручками рендерим label вместо SelectValue. */}
          {selectedLabel ? (
            <span className="truncate">{selectedLabel}</span>
          ) : (
            <span className={cn('truncate', !selectedLabel && error && 'text-destructive')}>{NOT_SET}</span>
          )}
        </SelectTrigger>
        <SelectContent align="start" className="max-h-60">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  // FIX: renderField принимает error?: string — если есть, под инпутом появляется
  // красный текст ошибки. Сами children (Input/Select) должны получать красную рамку
  // отдельно — через errorBorderClass(field) или error параметр renderSelect.
  const renderField = (label: string, children: React.ReactNode, error?: string) => (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6">
      <Label className="sm:w-1/3 font-bold text-[0.8125rem] text-muted-foreground shrink-0 sm:pt-1.5 leading-tight">
        {label}:
      </Label>
      <div className="sm:w-2/3 w-full">
        {children}
        {error && (
          <p className="text-[0.75rem] text-destructive mt-1 leading-tight">{error}</p>
        )}
      </div>
    </div>
  );

  // NEW: renderVerticalField — вертикальный layout (лейбл сверху, инпут снизу).
  // Используется для Рост/Вес в сетке grid-cols-[1fr_2fr] (братан добавил).
  // Принимает className для дополнительных стилей (например "ml-2" для второго поля).
  // Принимает error?: string — текст ошибки под инпутом (как у renderField).
  const renderVerticalField = (label: string, children: React.ReactNode, error?: string, className?: string) => (
    <div className={cn("flex flex-col gap-1",className)}>
      <Label className="font-bold text-[0.8125rem] text-muted-foreground shrink-0 leading-tight">
        {label}:
      </Label>
      <div className="w-full">
        {children}
        {error && (
          <p className="text-[0.65rem] text-destructive mt-1 leading-tight">{error}</p>
        )}
      </div>
    </div>
  );

  const renderToggles = (
    options: { value: number; label: string }[],
    selected: number[],
    onToggle: (v: number) => void,
  ) => (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Toggle
          key={opt.value}
          pressed={selected.includes(opt.value)}
          onPressedChange={() => onToggle(opt.value)}
          disabled={isSaving}
          size="sm"
          variant="outline"
          className={cn(
            "rounded-full transition-colors bg-muted",
            selected.includes(opt.value)
              ? "text-foregroud border-blue-400 hover:bg-blue-500"
              : "text-muted-foreground hover:bg-muted/80"
          )}
        >
          {opt.label}
        </Toggle>
      ))}
    </div>
  );

  return (
    <div className={cn('mb-6', className)} ref={containerRef}>

      {/* === Заголовок + карандашик === */}
      <h3 className="text-base font-medium text-accent-foreground mb-3 flex items-center gap-2.5 flex-wrap">
        Личная информация
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
            aria-label={isEditing ? 'Свернуть' : 'Изменить'}
          >
            <Pencil className="w-4 h-4" />
            <span className={cn(
              'text-sm overflow-hidden whitespace-nowrap transition-all duration-300',
              isEditing ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[100px]',
            )}>
              {isEditing ? 'Свернуть' : 'Изменить'}
            </span>
          </button>
        </div>
      </h3>

      {/* === View mode — плоский список полей, 2 колонки (label слева, value справа) === */}
      <div className={cn(
        'grid transition-all duration-300 ease-in-out overflow-hidden',
        isEditing ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
      )}>
        {/* space-y-4 — между строками полей. text-[0.8125rem] — размер текста. */}
        <div className="overflow-hidden space-y-4">
          <div className="space-y-4 text-[0.8125rem]">
            {viewFields.map((item, ii) => {
              // Для полей с badges (Языки, Спорт) — рендерим бейджики вместо строки.
              // isBadgesField — это поле, у которого задан ключ badges (Языки/Спорт).
              //   - если массив пустой → показываем "Пока не указано" (как у обычных полей)
              //   - если есть элементы → рендерим бейджики
              const isBadgesField = Array.isArray(item.badges);
              const hasBadges = isBadgesField && (item.badges?.length ?? 0) > 0;
              return (
                <div key={ii} className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-8">
                  <span className="sm:w-1/3 text-muted-foreground font-medium shrink-0 leading-tight">
                    {item.label}:
                  </span>
                  <div className="sm:w-2/3 w-full">
                    {isBadgesField && hasBadges ? (
                      // Бейджики (Языки, Спорт) — Badge из shadcn/ui.
                      // variant="outline" → прозрачный фон + border-border.
                      // rounded-full уже стоит в стилях shadcn Badge по умолчанию.
                      // bg-transparent → на всякий случай делаем фон полностью прозрачным
                      //   (по умолчанию outline variant имеет bg-background, что в dark mode
                      //   может отличаться от фона контейнера).
                      // font-normal → лейблы бейджей обычным весом, не жирным.
                      // px-2.5 py-0.5 → стандартные паддинги shadcn Badge, можно тюнить.
                      <div className="flex flex-wrap gap-1 ">
                        {item.badges!.map((badge, bi) => (
                          <Badge
                            key={bi}
                            variant="outline"
                            className="text-foregroud border-blue-400 bg-muted font-normal text-[0.8125rem] p-3"
                          >
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    ) : isBadgesField && !hasBadges ? (
                      // Поле badges есть, но массив пустой → "Пока не указано" italic серым.
                      <span className="text-muted-foreground/50 italic whitespace-pre-wrap">
                        {NOT_SET}
                      </span>
                    ) : (
                      // Обычная строка-значение (все остальные поля).
                      <span className={cn(
                        'whitespace-pre-wrap',
                        item.value === NOT_SET
                          ? 'text-muted-foreground/50 italic'
                          : 'text-foreground/90'
                      )}>
                        {item.value}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* === Edit mode — карточка === */}
      <div className={cn(
        'grid transition-all duration-300 ease-in-out',
        isEditing ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0',
      )}>
        <div className="overflow-hidden">
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">

            {/* Внешность */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Внешность</p>
              <div className="grid grid-cols-[1fr_2fr] gap-6">
                {renderVerticalField('Рост',
                  <div className="flex items-center gap-3">
                    <Input type="number" value={form.height ?? ''} onChange={e => updateField('height', e.target.value ? Number(e.target.value) : null)} maxLength={3} disabled={isSaving} className={cn('w-20 bg-background text-[0.8125rem]', NO_SPINNER, errorBorderClass('height'))} />
                    <span className="text-xs text-muted-foreground">см</span>
                  </div>,
                  localErrors.height,
                  ""
                )}
                {renderVerticalField('Вес',
                  <div className="flex items-center gap-3">
                    <Input type="number" value={form.weight ?? ''} onChange={e => updateField('weight', e.target.value ? Number(e.target.value) : null)} maxLength={3} disabled={isSaving} className={cn('w-20 bg-background text-[0.8125rem]', NO_SPINNER, errorBorderClass('weight'))} />
                    <span className="text-xs text-muted-foreground">кг</span>
                  </div>,
                  localErrors.weight,
                  "ml-2"
                )}
              </div>
              {renderField('Телосложение', renderSelect(BODY_TYPE_OPTIONS, form.body_type ?? null, v => updateField('body_type', v), localErrors.body_type), localErrors.body_type)}
              {renderField('Цвет глаз', renderSelect(EYE_COLOR_OPTIONS, form.eye_color ?? null, v => updateField('eye_color', v), localErrors.eye_color), localErrors.eye_color)}
              {renderField('Цвет волос', renderSelect(HAIR_COLOR_OPTIONS, form.hair_color ?? null, v => updateField('hair_color', v), localErrors.hair_color), localErrors.hair_color)}
              {renderField('На теле есть', renderToggles(BODY_DECORATIONS, form.body_decorations ?? [], v => toggleArrayValue('body_decorations', v)), localErrors.body_decorations)}
            </div>

            <div className="border-t border-border" />

            {/* Отношения */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Отношения</p>
              {renderField('Статус', renderSelect(RELATIONSHIP_STATUS_OPTIONS, form.relationship_status ?? null, v => updateField('relationship_status', v), localErrors.relationship_status), localErrors.relationship_status)}
              {renderField('Дети', renderSelect(CHILDREN_STATUS_OPTIONS, form.children_status ?? null, v => updateField('children_status', v), localErrors.children_status), localErrors.children_status)}
            </div>

            <div className="border-t border-border" />

            {/* Быт */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Быт</p>
              {renderField('Животные', renderSelect(PETS_OPTIONS, form.pets ?? null, v => updateField('pets', v), localErrors.pets), localErrors.pets)}
              {renderField('Жильё', renderSelect(HOUSING_OPTIONS, form.housing ?? null, v => updateField('housing', v), localErrors.housing), localErrors.housing)}
              {renderField('Автомобиль', renderSelect(HAS_CAR_OPTIONS, form.has_car ?? null, v => updateField('has_car', v), localErrors.has_car), localErrors.has_car)}
            </div>

            <div className="border-t border-border" />

            {/* Работа */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Работа</p>
              {renderField('Образование', renderSelect(EDUCATION_LEVEL_OPTIONS, form.education_level ?? null, v => updateField('education_level', v), localErrors.education_level), localErrors.education_level)}
              {renderField('Учеб. заведение', <Input value={form.institution ?? ''} onChange={e => updateField('institution', e.target.value || null)} disabled={isSaving} className={cn('bg-background text-[0.8125rem]', errorBorderClass('institution'))} />, localErrors.institution)}
              {renderField('Год выпуска', <Input type="number" value={form.institution_year ?? ''} onChange={e => updateField('institution_year', e.target.value ? Number(e.target.value) : null)} maxLength={4} disabled={isSaving} className={cn('w-24 bg-background text-[0.8125rem]', NO_SPINNER, errorBorderClass('institution_year'))} />, localErrors.institution_year)}
              {renderField('Доход', renderSelect(INCOME_OPTIONS, form.income ?? null, v => updateField('income', v), localErrors.income), localErrors.income)}
              {renderField('Сфера деятельности', <Input value={form.activity ?? ''} onChange={e => updateField('activity', e.target.value || null)} disabled={isSaving} className={cn('bg-background text-[0.8125rem]', errorBorderClass('activity'))} />, localErrors.activity)}
              {renderField('Должность', <Input value={form.position ?? ''} onChange={e => updateField('position', e.target.value || null)} disabled={isSaving} className={cn('bg-background text-[0.8125rem]', errorBorderClass('position'))} />, localErrors.position)}
            </div>

            <div className="border-t border-border" />

            {/* Привычки */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Привычки</p>
              {renderField('Курение', renderSelect(SMOKING_OPTIONS, form.smoking ?? null, v => updateField('smoking', v), localErrors.smoking), localErrors.smoking)}
              {renderField('Алкоголь', renderSelect(ALCOHOL_OPTIONS, form.alcohol ?? null, v => updateField('alcohol', v), localErrors.alcohol), localErrors.alcohol)}
            </div>

            <div className="border-t border-border" />

            {/* Языки */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Знание языков</p>
              {renderToggles(LANGUAGES, form.languages ?? [], v => toggleArrayValue('languages', v))}
              {localErrors.languages && (
                <p className="text-[0.75rem] text-destructive mt-1 leading-tight">{localErrors.languages}</p>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Спорт */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Спорт</p>
              {renderToggles(SPORTS, form.sports ?? [], v => toggleArrayValue('sports', v))}
              {localErrors.sports && (
                <p className="text-[0.75rem] text-destructive mt-1 leading-tight">{localErrors.sports}</p>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button type="button" onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" />Сохранение...</>) : 'Сохранить'}
              </Button>
              <Button type="button" onClick={handleClose} variant="outline" disabled={isSaving} size="sm">
                Отменить
              </Button>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
