// app/(web)/profile/_components/profile-preferences.tsx
//
// "Познакомлюсь" / "Я ищу" — секция preferences (кого ищу, возраст, цели).
//
// View mode: текст "Ищу девушек от 25 до 35 лет, для романтических отношений."
// Edit mode: серая плашка с формой в 2 колонки:
//   Левая: "Я ищу:" → пол (текст) + слайдер возраста (18-99, два бегунка)
//   Правая: "Цель знакомства:" → 5 чекбоксов
//   Под колонками: border-t + кнопки Сохранить / Отменить
//
// Controlled: isEditing + onEditingChange (accordion через activeSection).
// Click-outside-to-close.
//
// ВАЛИДАЦИЯ НА ФРОНТЕ (Паттерн A + B микс):
//   - hasInvalidGoals = selectedGoals.length === 0 → кнопка "Сохранить" disabled
//     (нельзя сохранить без хотя бы одной цели знакомства)
//   - Ошибки с бэка (422) парсятся в родителе, передаются через prop.errors,
//     показываются как красная рамка на чекбоксах/слайдере + текст под ними.
//   - Слайдер сам гарантирует min ≤ max (два бегунка не пересекаются).
//   - Чекбоксы — у невыбранных БЕЛЫЙ фон (data-[state=unchecked]:bg-white).

'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { DATING_GOALS } from '@/lib/profile-dating-config';

interface ProfilePreferencesProps {
  // Кого ищет (предпочитаемый пол): 'male' | 'female' | null
  preferredGender?: string | null;
  // Возраст: min / max
  preferredAgeMin?: number | null;
  preferredAgeMax?: number | null;
  // Цели знакомства (массив ключей: 'friends', 'romantic', ...)
  datingGoals?: string[] | null;
  // Пол пользователя — чтобы показать "ищу парней/девушек"
  gender?: string | null;

  isEditing: boolean;
  onEditingChange: (open: boolean) => void;

  className?: string;
  onSave?: (data: {
    preferredGender: string;
    preferredAgeMin: number;
    preferredAgeMax: number;
    datingGoals: string[];
  }) => Promise<void> | void;

  // NEW: errors — объект {field: message} от родителя.
  // Приходит из handleSavePreferences (парсится через buildFieldErrors из lib/validation-messages).
  // Ключи — preferred_gender, preferred_age_min, preferred_age_max, dating_goals.
  // Показываем как красную рамку на чекбоксах/слайдере + текст под ними.
  errors?: Record<string, string> | null;
}

export function ProfilePreferences({
  preferredGender,
  preferredAgeMin,
  preferredAgeMax,
  datingGoals,
  gender,
  isEditing,
  onEditingChange,
  className,
  onSave,
  errors,
}: ProfilePreferencesProps) {
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // NEW: localErrors — локальная копия errors из props (как в SelfPortrait/Bio/LookingFor).
  // Синхронизируется через useEffect при изменении props.errors.
  // Сбрасывается при изменении полей (toggleGoal, setAgeRange).
  // Сбрасывается при handleClose/handleOpen (через resetErrors).
  const [localErrors, setLocalErrors] = useState<Record<string, string>>(errors ?? {});
  // Синхронизация с props.errors — паттерн «adjust state during render»
  // (без эффекта, см. react.dev/learn/you-might-not-need-an-effect):
  // когда родитель передаёт новый объект errors — перезатираем локальную копию.
  const [prevErrors, setPrevErrors] = useState(errors);
  if (errors !== prevErrors) {
    setPrevErrors(errors);
    setLocalErrors(errors ?? {});
  }

  // === Локальный state формы ===
  // Пол (не редактируется — определяется полом пользователя)
  // Если user муж → ищет девушек. Если жен → ищет парней.
  const seekingLabel =
    gender === 'male' ? 'девушек'
    : gender === 'female' ? 'парней'
    : 'друзей';

  // Слайдер возраста — два бегунка [min, max]
  const [ageRange, setAgeRange] = useState<[number, number]>([
    preferredAgeMin ?? 18,
    preferredAgeMax ?? 99,
  ]);

  // Цели знакомства — массив выбранных ключей
  // Array.isArray — защита если бэкенд отдаёт строку/объект/null
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    Array.isArray(datingGoals) ? datingGoals : [],
  );

  // NEW: hasInvalidGoals — ни одна цель не выбрана.
  // Если true → кнопка "Сохранить" disabled (Паттерн A — фронтовая валидация).
  // Бэк всё равно проверит (если added required rule), но мы не даём отправить заведомо невалидный запрос.
  const hasInvalidGoals = selectedGoals.length === 0;

  const resetForm = () => {
    setAgeRange([preferredAgeMin ?? 18, preferredAgeMax ?? 99]);
    setSelectedGoals(Array.isArray(datingGoals) ? datingGoals : []);
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
    if (isEditing) handleClose();
    else handleOpen();
  };

  // Click-outside-to-close
  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
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
    // FIX: проверка hasInvalidGoals тут НЕ нужна — кнопка уже disabled.
    // Юзер не сможет кликнуть. Тост был бы мёртвым кодом.
    setIsSaving(true);
    try {
      if (onSave) {
        // Пол не редактируется — передаём обратно исходный
        await onSave({
          preferredGender: preferredGender ?? (gender === 'male' ? 'female' : 'male'),
          preferredAgeMin: ageRange[0],
          preferredAgeMax: ageRange[1],
          datingGoals: selectedGoals,
        });
      }
      onEditingChange(false);
    } catch (err) {
      console.error('Save failed in ProfilePreferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // FIX: toggleGoal — при изменении целей сбрасываем ошибку по этому полю.
  // Юзер начал выбирать → старая ошибка неактуальна → рамка сразу исчезает.
  const toggleGoal = (key: string) => {
    setSelectedGoals((prev) =>
      prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key],
    );
    setLocalErrors(prev => {
      if (!prev.dating_goals) return prev;
      const next = { ...prev };
      delete next.dating_goals;
      return next;
    });
  };

  // FIX: при изменении слайдера — сбрасываем ошибки по обоим полям возраста.
  // Слайдер меняет и min, и max одновременно, поэтому чистим оба.
  // Base UI Slider отдаёт number | readonly number[] — приводим к number[].
  const handleAgeChange = (val: number | readonly number[]) => {
    const arr = (Array.isArray(val) ? val : [val, val]) as number[];
    setAgeRange([arr[0], arr[1]]);
    setLocalErrors(prev => {
      if (!prev.preferred_age_min && !prev.preferred_age_max) return prev;
      const next = { ...prev };
      delete next.preferred_age_min;
      delete next.preferred_age_max;
      return next;
    });
  };

  // Хелпер: классы для красной рамки. Применяется к контейнеру слайдера или
  // блоку чекбоксов, когда есть ошибка по соответствующему полю.
  const errorBorderClass = (field: string): string =>
    localErrors[field] ? 'border-destructive rounded-md p-2 -mx-2' : '';

  // === View mode: текст "Ищу девушек от 25 до 35 лет, для романтических отношений." ===
  // Array.isArray — защита если бэкенд отдаёт строку/объект/null вместо массива
  const goalsArray = Array.isArray(datingGoals) ? datingGoals : [];
  const goalLabels = goalsArray
    .map((key) => DATING_GOALS.find((g) => g.key === key)?.label)
    .filter(Boolean);

  const summaryText = [
    `Ищу ${seekingLabel}`,
    `от ${preferredAgeMin ?? 18} до ${preferredAgeMax ?? 99} лет`,
    goalLabels.length > 0 ? `для ${goalLabels.join(', ').toLowerCase()}` : null,
  ].filter(Boolean).join(', ') + '.';

  return (
    <div className={cn('mb-6', className)} ref={containerRef}>

      {/* === Заголовок + карандашик === */}
      <h3 className="text-base font-medium text-accent-foreground mb-3 flex items-center gap-2.5 flex-wrap">
        Познакомлюсь
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
            title={isEditing ? 'Свернуть' : 'Изменить'}
            aria-label={isEditing ? 'Свернуть' : 'Изменить'}
          >
            <Pencil className="w-4 h-4" />
            <span
              className={cn(
                'text-sm overflow-hidden whitespace-nowrap transition-all duration-300',
                isEditing
                  ? 'opacity-100 max-w-[100px]'
                  : 'opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[100px]',
              )}
            >
              {isEditing ? 'Свернуть' : 'Изменить'}
            </span>
          </button>
        </div>
      </h3>

      {/* === View mode — текст === */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out overflow-hidden',
          isEditing ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-muted-foreground">
            {summaryText}
          </p>
        </div>
      </div>

      {/* === Edit mode — серая плашка с формой === */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isEditing
            ? 'grid-rows-[1fr] opacity-100 mt-3'
            : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="p-4 bg-muted/30 rounded-lg border border-border">

            {/* Две колонки */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* === Левая колонка: "Я ищу" + слайдер возраста === */}
              <div className="space-y-6 pr-14">
                {/* "Я ищу:" — жирный + текст пола */}
                <div>
                  <Label className="text-sm font-semibold text-foreground block mb-1">
                    Я ищу: <span className="text-sm text-muted-foreground">
                    {seekingLabel.charAt(0).toUpperCase() + seekingLabel.slice(1)}
                  </span>
                  </Label>
                </div>

                {/* Слайдер возраста (18-99, два бегунка).
                    FIX: при ошибке по preferred_age_min/max — контейнер получает
                    красную рамку (border-destructive) + отступы чтобы рамка была видна. */}
                <div className={cn('space-y-2 max-w-[16rem]', errorBorderClass('preferred_age_min') || errorBorderClass('preferred_age_max'))}>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                      Возраст
                    </Label>
                    <span className="text-sm font-medium text-muted-foreground">
                      {ageRange[0]} - {ageRange[1]}
                    </span>
                  </div>
                  <div className="pt-2">
                    <Slider
                      value={ageRange}
                      min={18}
                      max={99}
                      onValueChange={handleAgeChange}
                      disabled={isSaving}
                    />
                  </div>
                  {/* Текст ошибки по возрасту (если есть с бэка).
                      Показываем первое доступное — preferred_age_min или preferred_age_max. */}
                  {(localErrors.preferred_age_min || localErrors.preferred_age_max) && (
                    <p className="text-[0.75rem] text-destructive leading-tight">
                      {localErrors.preferred_age_min || localErrors.preferred_age_max}
                    </p>
                  )}
                </div>
              </div>

              {/* === Правая колонка: "Цель знакомства" + чекбоксы === */}
              {/* FIX: при ошибке по dating_goals — контейнер получает красную рамку. */}
              <div className={cn('space-y-3', errorBorderClass('dating_goals'))}>
                <Label className="text-sm font-semibold text-foreground">
                  Цель знакомства:
                </Label>
                <div className="space-y-2">
                  {DATING_GOALS.map((goal) => (
                    <div key={goal.key} className="flex items-center gap-2">
                      {/* FIX: у невыбранных чекбоксов — БЕЛЫЙ фон.
                          data-[state=unchecked]:bg-white → применяет bg-white к unchecked состоянию.
                          data-[state=checked]:bg-primary → стандартный checked фон (по умолчанию).
                          border-input → стандартная серая рамка (по умолчанию). */}
                      <Checkbox
                        id={`goal-${goal.key}`}
                        checked={selectedGoals.includes(goal.key)}
                        onCheckedChange={() => toggleGoal(goal.key)}
                        disabled={isSaving}
                        className="data-[state=unchecked]:bg-white data-[state=unchecked]:border-input"
                      />
                      <Label
                        htmlFor={`goal-${goal.key}`}
                        className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                      >
                        {goal.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {/* Текст ошибки по dating_goals (если есть с бэка). */}
                {localErrors.dating_goals && (
                  <p className="text-[0.75rem] text-destructive leading-tight">
                    {localErrors.dating_goals}
                  </p>
                )}
                {/* Подсказка если ничего не выбрано — что нужно выбрать хотя бы одну цель.
                    Серым, не красным — это не ошибка, а просто напоминание. */}
                {hasInvalidGoals && !localErrors.dating_goals && (
                  <p className="text-[0.75rem] text-muted-foreground leading-tight">
                    Выберите хотя бы одну цель знакомства
                  </p>
                )}
              </div>
            </div>

            {/* border-t + кнопки */}
            <div className="flex gap-2 pt-4 mt-4 border-t border-border">
              <Button
                type="button"
                onClick={handleSave}
                // FIX: disabled если есть невалидные цели ИЛИ идёт сохранение.
                disabled={isSaving || hasInvalidGoals}
                size="sm"
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
  );
}
