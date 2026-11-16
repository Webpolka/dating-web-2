// app/(web)/profile/_components/profile-looking-for.tsx
//
// "Кого я хочу найти" — секция с textarea для looking_for.
// Полная копия ProfileBio, только другой заголовок и подсказка.
//
// View mode: текст looking_for (если есть) или placeholder.
// Edit mode: карточка с подсказкой + textarea + кнопки.
//
// ВАЛИДАЦИЯ НА ФРОНТЕ (Паттерн A — как в SelfPortrait):
//   - maxLength УБРАН с textarea — пользователь может ввести любой объём,
//     но видит счётчик "245 / 1000" справа от кнопок.
//   - При длине ≥ MAX_CHARS (1000) → счётчик краснеет, textarea + контейнер
//     border-dashed получают красную рамку, кнопка "Сохранить" блокируется.
//   - Также: ошибки с бэка (422) парсятся в родителе, передаются через prop.errors,
//     показываются как красная рамка + текст под textarea (опциональный <p>).
//   - Тост "слишком длинный текст" НЕ показываем — кнопка disabled, тост мёртвый код.
//
// MAX_CHARS = 1000 — должен совпадать с валидацией на бэке:
//   EditProfileController::updateLookingFor → 'nullable|string|max:1000'
//   (метод TODO — добавим в контроллер вместе с остальными текстовыми методами)

'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// MAX_CHARS — лимит символов для looking_for.
// Совпадает с валидацией на бэке: 'max:1000' в EditProfileController::updateLookingFor.
const MAX_CHARS = 1000;

interface ProfileLookingForProps {
  lookingFor: string | null;

  isEditing: boolean;
  onEditingChange: (open: boolean) => void;

  className?: string;
  onSave?: (text: string) => Promise<void> | void;

  // NEW: errors — объект {field: message} от родителя.
  // Приходит из handleSaveLookingFor (парсится через buildFieldErrors из lib/validation-messages).
  // Для этой секции поле одно — looking_for. Так что errors будет либо
  // { looking_for: 'Максимум 1000 символов' } либо null.
  // Показываем как красную рамку на textarea + текст под textarea (опциональный <p>).
  errors?: Record<string, string> | null;
}

export function ProfileLookingFor({
  lookingFor,
  isEditing,
  onEditingChange,
  className,
  onSave,
  errors,
}: ProfileLookingForProps) {
  const [formText, setFormText] = useState(lookingFor ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // NEW: localErrors — локальная копия errors из props (как в SelfPortrait/PersonalInfo).
  // Синхронизируется через useEffect при изменении props.errors.
  // Сбрасывается при изменении текста пользователем (через handleChange + delete error).
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

  const resetForm = () => setFormText(lookingFor ?? '');
  // FIX: resetErrors — сбрасываем локальные ошибки при открытии/закрытии.
  // Без этого: пользователь жмёт "Свернуть" после ошибки → блок закрылся,
  // но localErrors остаётся → при следующем открытии красная рамка снова видна,
  // хотя форма сброшена.
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

  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  // NEW: hasOverflow — длина текста > MAX_CHARS.
  // Если true → кнопка "Сохранить" блокируется (disabled в JSX).
  // Тост НЕ показываем — кнопка disabled, тост мёртвый код (как в SelfPortrait).
  const hasOverflow = formText.length > MAX_CHARS;

  // Хелпер: классы для красной рамки textarea.
  // Применяется когда: переполнение ИЛИ есть ошибка с бэка по полю looking_for.
  const errorBorderClass =
    (hasOverflow || localErrors.looking_for)
      ? 'border-destructive focus-visible:ring-destructive'
      : '';

  const handleSave = async () => {
    if (isSaving) return;
    // FIX: проверка hasOverflow тут НЕ нужна — кнопка уже disabled при переполнении.
    // Юзер не сможет кликнуть. Визуальный отклик (рамка + счётчик + disabled кнопка)
    // полностью покрывает UX.
    setIsSaving(true);
    try {
      // onSave бросает throw err если бэк вернул 422 или 500.
      // Тогда onEditingChange(false) НЕ вызывается → блок остаётся открытым,
      // пользователь видит тост (в родителе) и может исправить.
      if (onSave) {
        await onSave(formText);
      }
      onEditingChange(false);
    } catch (err) {
      // Toast уже показан в родителе — здесь только лог.
      console.error('Save failed in ProfileLookingFor:', err);
    } finally {
      // isSaving сбрасывается ВСЕГДА — даже при ошибке.
      setIsSaving(false);
    }
  };

  // FIX: при изменении текста — сбрасываем ошибку по этому полю.
  // Юзер начал исправлять → старая ошибка неактуальна → рамка сразу исчезает.
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormText(e.target.value);
    setLocalErrors(prev => {
      if (!prev.looking_for) return prev;
      const next = { ...prev };
      delete next.looking_for;
      return next;
    });
  };

  return (
    <div className={cn('mb-6', className)} ref={containerRef}>

      {/* === Заголовок + карандашик === */}
      <h3 className="text-base font-medium text-accent-foreground mb-3 flex items-center gap-2.5 flex-wrap">
        Кого я хочу найти
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
            <span
              className={cn(
                'text-sm overflow-hidden whitespace-nowrap transition-all duration-300',
                isEditing
                  ? 'opacity-100 max-w-25'
                  : 'opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-25',
              )}
            >
              {isEditing ? 'Свернуть' : 'Изменить'}
            </span>
          </button>
        </div>
      </h3>

      {/* === View mode === */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out overflow-hidden',
          isEditing ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
        )}
      >
        <div className="overflow-hidden">
          {lookingFor ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {lookingFor}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic">
              Расскажите, кого вы хотите найти.
            </p>
          )}
        </div>
      </div>

      {/* === Edit mode — карточка === */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isEditing
            ? 'grid-rows-[1fr] opacity-100 mt-3'
            : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">

            {/* Подсказка */}
            <p className="text-[0.825rem] text-muted-foreground leading-relaxed">
              Расскажите, с кем бы вы хотели познакомиться и для чего. Укажите свои
              пожелания к будущему партнеру. Это поможет вам быстрее найти
              подходящего человека.
            </p>

            {/* FIX: контейнер с border-dashed — добавляем border-destructive при overflow
                ИЛИ ошибке с бэка. Рамка становится красной.
                ВАЖНО: верстку не трогаем, только cn для border цвета. */}
            <div className={cn(
              'border-2 border-dashed rounded-md mb-4 bg-background',
              errorBorderClass ? 'border-destructive' : 'border-border/80',
            )}>
            {/* Textarea — maxLength УБРАН.
                Валидация через счётчик + красную рамку + disabled кнопку.
                errorBorderClass добавляет красную рамку при overflow или ошибке с бэка.
                ВАЖНО: верстку textarea не трогаем — только cn для border. */}
            <Textarea
              ref={textareaRef}
              value={formText}
              onChange={handleChange}
              placeholder="Опишите, кого вы хотите найти..."
              className={cn(
                'resize-none border-0 px-3 py-1 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-foreground/90 leading-relaxed min-h-[120px]',
                errorBorderClass,
              )}
              rows={5}
              disabled={isSaving}
            />
            </div>

            {/* NEW: текст ошибки с бэка (опционально).
                Появляется ТОЛЬКО когда есть localErrors.looking_for.
                Если ошибки нет — этого блока нет в DOM, верстка не меняется. */}
            {localErrors.looking_for && (
              <p className="text-[0.75rem] text-destructive -mt-2 leading-tight">
                {localErrors.looking_for}
              </p>
            )}

            {/* Счётчик + кнопки — ВЕРСТКА КАК У БРАТАНА:
                flex items-center justify-between gap-2
                слева — кнопки (flex gap-2)
                справа — счётчик (text-xs text-muted-foreground) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleSave}
                  // FIX: disabled если есть переполнение ИЛИ идёт сохранение.
                  disabled={isSaving || hasOverflow}
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить'
                  )}
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
              {/* FIX: счётчик краснеет при overflow.
                   tabular-nums — моноширинные цифры, чтобы не дёргалось при изменении длины.
                   ВАЖНО: верстку не трогаем (text-xs), только добавляем цвет через cn. */}
              <span
                className={cn(
                  'text-xs tabular-nums',
                  hasOverflow ? 'text-destructive font-medium' : 'text-muted-foreground'
                )}
              >
                {formText.length}/{MAX_CHARS}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
