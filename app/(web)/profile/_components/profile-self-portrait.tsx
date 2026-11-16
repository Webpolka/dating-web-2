// app/(web)/profile/_components/profile-self-portrait.tsx
//
// "Автопортрет" — секция с множеством textarea полей.
// Карточка (bg-muted/30 rounded-lg border border-border) + inline-аккордеон.
//
// View mode: список заполненных полей (пустые → "Пока не указано")
// Edit mode: карточка с формой — все textarea
//
// 19 полей — все textarea, rows=2, max 500 символов (валидация на бэке + на фронте).
//
// ВАЛИДАЦИЯ НА ФРОНТЕ:
//   - maxLength УБРАН с textarea — пользователь может ввести любой объём,
//     но видит счётчик "245 / 500" под полем.
//   - При длине ≥ MAX_CHARS (500) → счётчик краснеет, textarea получает
//     красную рамку, кнопка "Сохранить" блокируется.
//   - Также: ошибки с бэка (422) парсятся через lib/validation-messages,
//     показываются в тосте + красная рамка + текст под полем.
//
// TODO (будущее): бэкенд должен иметь эти поля в user_profiles таблице.
// Сейчас фронт готов к приёму данных — все поля optional.

'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// === Конфиг полей автопортрета ===
// key — имя поля (совпадает с БД в будущем)
// label — подпись на русском
import { SELF_PORTRAIT_FIELDS } from '@/lib/profile-portrait-fields';

// === Тип данных автопортрета ===
export type SelfPortraitData = Record<string, string | null>;

// MAX_CHARS — лимит символов для каждого поля автопортрета.
// Совпадает с валидацией на бэке: 'max:500' в EditProfileController::updateSelfPortrait.
// Не вынес в SELF_PORTRAIT_FIELDS потому что общий для всех полей.
const MAX_CHARS = 500;

interface ProfileSelfPortraitProps {
  // Данные автопортрета — объект с ключами из SELF_PORTRAIT_FIELDS
  // На бэкенде может храниться как JSON в user_profiles.self_portrait
  selfPortrait?: SelfPortraitData | string | null;

  isEditing: boolean;
  onEditingChange: (open: boolean) => void;

  className?: string;
  onSave?: (data: SelfPortraitData) => Promise<void> | void;

  // NEW: errors — объект {field: message} от родителя.
  // Приходит из handleSaveSelfPortrait (парсится через buildFieldErrors из lib/validation-messages).
  // Ключи — имена полей из SELF_PORTRAIT_FIELDS (education, musical, ...).
  // Значения — человекочитаемые сообщения ("Максимум 500 символов").
  errors?: Record<string, string> | null;
}

// const NOT_SET = 'Пока не указано';

export function ProfileSelfPortrait({
  selfPortrait,
  isEditing,
  onEditingChange,
  className,
  onSave,
  errors,
}: ProfileSelfPortraitProps) {
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // NEW: localErrors — локальная копия errors из props (как в PersonalInfo).
  // Синхронизируется через useEffect при изменении props.errors.
  // Сбрасывается при изменении поля пользователем (через updateField).
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

  // Нормализуем входящие данные в объект (могут быть строкой JSON или null)
  const normalizedData = (): SelfPortraitData => {
    if (!selfPortrait) return {};
    if (typeof selfPortrait === 'string') {
      try { return JSON.parse(selfPortrait); } catch { return {}; }
    }
    if (typeof selfPortrait === 'object') return selfPortrait;
    return {};
  };

  const [form, setForm] = useState<SelfPortraitData>(normalizedData());

  const resetForm = () => setForm(normalizedData());
  // FIX: resetErrors — сбрасываем локальные ошибки при открытии/закрытии.
  // Без этого: пользователь жмёт "Свернуть" после ошибки валидации → блок закрылся,
  // но localErrors остаётся → при следующем открытии красные рамки и тексты снова видны,
  // хотя форма сброшена.
  const resetErrors = () => setLocalErrors({});

  const handleOpen = () => { resetForm(); resetErrors(); onEditingChange(true); };
  const handleClose = () => { resetForm(); resetErrors(); onEditingChange(false); };
  const toggleEdit = () => { if (isEditing) handleClose(); else handleOpen(); };

  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) handleClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClickOutside); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // NEW: hasOverflow — проверяем, есть ли поля с длиной > MAX_CHARS.
  // Если есть → кнопка "Сохранить" блокируется (disabled в JSX).
  // Это фронтовая валидация ДО отправки на бэк — бэк всё равно проверит
  // через 'max:500', но мы не даём юзеру даже отправить заведомо невалидный запрос.
  //
  // ВАЖНО: тост "Слишком длинный текст" тут НЕ НУЖЕН — он был мёртвым кодом.
  // Если кнопка disabled → клик не сработает → тост никогда не покажется.
  // Юзер и так видит: красную рамку + красный счётчик "523 / 500" + серую кнопку.
  // Этого достаточно для понимания, что не так.
  const hasOverflow = SELF_PORTRAIT_FIELDS.some(f => (form[f.key]?.length ?? 0) > MAX_CHARS);

  const handleSave = async () => {
    if (isSaving) return;
    // FIX: проверка hasOverflow тут НЕ нужна — кнопка уже disabled при переполнении.
    // Раньше был блок с toast.error("Слишком длинный текст") + return —
    // но он недостижим (клик по disabled-кнопке не сработает).
    // Убрал за ненадобностью. Визуальный отклик (рамка + счётчик + disabled кнопка)
    // полностью покрывает UX.
    setIsSaving(true);
    try {
      // onSave бросает throw err если бэк вернул 422 (валидация) или 500.
      // Тогда onEditingChange(false) ВООБЩЕ НЕ ВЫЗЫВАЕТСЯ → блок остаётся открытым,
      // пользователь видит тост (показывается в родителе в handleSaveSelfPortrait)
      // и может исправить поля, нажать "Сохранить" снова.
      if (onSave) await onSave(form);
      onEditingChange(false);  // закрываем блок ТОЛЬКО если onSave успешно
    } catch (err) {
      // Toast уже показан в родителе (handleSaveSelfPortrait) — здесь только лог.
      console.error('Save failed:', err);
    } finally {
      // isSaving сбрасывается ВСЕГДА — даже при ошибке, чтобы кнопка не зависла.
      setIsSaving(false);
    }
  };

  // FIX: updateField — при изменении поля сбрасываем ошибку по этому полю
  // (как в PersonalInfo). Пользователь начал исправлять → старая ошибка неактуальна.
  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value || null }));
    setLocalErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Данные для view mode
  const data = normalizedData();

  // Хелпер: вернуть классы для красной рамки, если поле переполнено ИЛИ есть
  // ошибка с бэка по этому полю. Применяется к Textarea className (через cn).
  const errorBorderClass = (key: string): string => {
    const overflow = (form[key]?.length ?? 0) > MAX_CHARS;
    const hasError = !!localErrors[key];
    return (overflow || hasError) ? 'border-destructive focus-visible:ring-destructive' : '';
  };

  // Переиспользуемая строка формы — 2 колонки (label слева, textarea справа)
  // Десктоп: label w-2/5 (40%) + textarea w-3/5 (60%), выровнены по линии
  // Мобилка: стек — label сверху, textarea снизу
  //
  // FIX: убрал maxLength={500} с Textarea. Вместо этого:
  //   - под полем счётчик "245 / 500"
  //   - при length > MAX_CHARS → textarea красная рамка + счётчик красный
  //   - текст ошибки с бэка (если есть) под полем
  const renderField = (label: string, key: string) => {
    const value = form[key] ?? '';
    const length = value.length;
    const isOverflow = length > MAX_CHARS;
    const errorMsg = localErrors[key];

    return (
      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6">
        <Label className="sm:w-1/3 font-bold text-[0.8125rem] text-muted-foreground shrink-0 sm:pt-1.5 leading-tight">
          {label}:
        </Label>
        <div className="sm:w-2/3 w-full">
          <Textarea
            value={value}
            onChange={(e) => updateField(key, e.target.value)}
            // maxLength УБРАН — даём юзеру ввести любой объём.
            // Валидация через счётчик + красную рамку + блокировку кнопки "Сохранить".
            rows={2}
            disabled={isSaving}
            className={cn(
              'resize-none text-[0.8125rem] bg-background',
              errorBorderClass(key),
            )}
            placeholder="Напишите..."
          />
          {/* Счётчик символов под textarea — справа, мелким серым.
              При length > MAX_CHARS → текст становится красным (text-destructive). */}
          <div className="flex justify-between items-start mt-1 gap-2">
            {/* Текст ошибки с бэка (если есть) — слева, красным, мелким.
                Если ошибки нет — пустое место (чтобы счётчик был справа). */}
            <span className="text-[0.75rem] text-destructive leading-tight flex-1">
              {errorMsg}
            </span>
            {/* Счётчик символов — справа. */}
            <span className={cn(
              'text-[0.75rem] leading-tight shrink-0 tabular-nums',
              isOverflow ? 'text-destructive font-medium' : 'text-muted-foreground/70'
            )}>
              {length} / {MAX_CHARS}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('mb-6', className)} ref={containerRef}>

      {/* === Заголовок + карандашик === */}
      <h3 className="text-base font-medium text-accent-foreground mb-3 flex items-center gap-2.5 flex-wrap">
        Автопортрет
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
              isEditing ? 'opacity-100 max-w-25' : 'opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-25',
            )}>
              {isEditing ? 'Свернуть' : 'Изменить'}
            </span>
          </button>
        </div>
      </h3>

      {/* === View mode — 2 колонки (label слева, значение справа) === */}
      <div className={cn(
        'grid transition-all duration-300 ease-in-out overflow-hidden',
        isEditing ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
      )}>
        <div className="overflow-hidden">
          {SELF_PORTRAIT_FIELDS.some(f => data[f.key]) ? (
            <div className="space-y-4 text-[0.8125rem]">
              {SELF_PORTRAIT_FIELDS.map((field) => {
                const value = data[field.key];
                if (!value) return null;
                return (
                  <div key={field.key} className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-8">
                    <span className="sm:w-1/3 text-muted-foreground font-medium shrink-0 leading-tight">
                      {field.label}:
                    </span>
                    <span className="sm:w-2/3 text-foreground/90 whitespace-pre-wrap">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic">
              Заполните автопортрет — расскажите о себе подробнее.
            </p>
          )}
        </div>
      </div>

      {/* === Edit mode — карточка с формой === */}
      <div className={cn(
        'grid transition-all duration-300 ease-in-out',
        isEditing ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0',
      )}>
        <div className="overflow-hidden">
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">

            {/* Все 19 полей */}
            {SELF_PORTRAIT_FIELDS.map((field) => (
              <div key={field.key}>
                {renderField(field.label, field.key)}
              </div>
            ))}

            {/* Кнопки */}
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                onClick={handleSave}
                // FIX: disabled если есть переполнение ИЛИ идёт сохранение.
                // Если юзер ввёл > 500 символов — нельзя отправить на бэк.
                disabled={isSaving || hasOverflow}
                size="sm"
              >
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
