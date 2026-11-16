// app/(web)/profile/_components/profile-headline.tsx
//
// "Статус (Headline)" — редактируемая плашка с текстом под именем.
//
// КОНТРОЛИРУЕМЫЙ компонент — isEditing приходит ИЗВНЕ (от родителя).
// Внутри только локальный state формы (formText, isSaving).
// Это позволяет родителю (profile-edit-client.tsx) управлять всеми блоками:
// только один блок может быть открыт одновременно (accordion pattern).
//
// Логика:
//  - Клик по плашке → onEditingChange(true) → родитель ставит activeSection='headline'
//  - Click-outside → onEditingChange(false) → родитель ставит activeSection=null
//  - Клик "Сохранить" → onSave(text), после успеха onEditingChange(false)
//
// FIX: анимация — grid-rows-[1fr]/[0fr] (как в Bio/LookingFor/SelfPortrait).
// Раньше был max-height + delay-300 — это даёт "прыжок" (один блок частично
// видим в момент перехода). grid-rows даёт плавный inline-replace без прыжка.
//
// ВАЛИДАЦИЯ НА ФРОНТЕ (Паттерн A — как в Bio):
//   - maxLength УБРАН с textarea — пользователь может ввести любой объём,
//     но видит счётчик "X / 200" справа от кнопки.
//   - При длине > MAX_CHARS → счётчик краснеет, textarea + контейнер
//     border-dashed получают красную рамку, кнопка "Сохранить" блокируется.
//   - Ошибки с бэка (422) передаются через prop.errors, показываются
//     как красная рамка + опциональный <p> под textarea.
//
// MAX_CHARS = 200 — совпадает с валидацией на бэке:
//   EditProfileController::updateHeadline → 'nullable|string|max:200'

'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// MAX_CHARS — лимит символов для headline.
// Совпадает с валидацией на бэке: 'max:200' в EditProfileController::updateHeadline.
const MAX_CHARS = 200;

interface ProfileHeadlineProps {
  // Текущий headline (статус). Если null/пустой — placeholder "О чём ты думаешь?"
  headline: string | null;

  // NEW: controlled state — открыт ли блок. Контролируется родителем.
  isEditing: boolean;

  // NEW: callback — вызывает когда пользователь хочет открыть/закрыть блок.
  onEditingChange: (open: boolean) => void;

  className?: string;

  // Коллбек при клике "Сохранить". Может быть async — кнопка покажет спиннер.
  // После успеха вызывается onEditingChange(false) — родитель закрывает блок.
  onSave?: (text: string) => Promise<void> | void;

  // NEW: errors — объект {field: message} от родителя.
  // Приходит из handleSaveHeadline (парсится через buildFieldErrors из lib/validation-messages).
  // Поле одно — headline. Так что errors будет либо
  // { headline: 'Максимум 200 символов' } либо null.
  errors?: Record<string, string> | null;
}

export function ProfileHeadline({
  headline,
  isEditing,            // NEW: controlled
  onEditingChange,      // NEW: callback
  className,
  onSave,
  errors,
}: ProfileHeadlineProps) {
  // Внутренний state только для формы (не для isEditing!)
  const [isSaving, setIsSaving] = useState(false);
  const [formText, setFormText] = useState(headline ?? '');

  // NEW: localErrors — локальная копия errors из props (как в Bio/LookingFor/SelfPortrait).
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

  // Ref на контейнер — для click-outside-to-close логики
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Сброс к исходному значению
  const resetForm = () => {
    setFormText(headline ?? '');
  };
  // FIX: resetErrors — сбрасываем локальные ошибки при открытии/закрытии.
  // Без этого: пользователь жмёт "Свернуть" после ошибки → блок закрылся,
  // но localErrors остаётся → при следующем открытии красная рамка снова видна.
  const resetErrors = () => setLocalErrors({});

  // Открыть редактирование — вызывается при клике на плашку.
  const handleOpen = () => {
    resetForm();
    resetErrors();
    onEditingChange(true);
  };

  // Закрыть без сохранения (click-outside).
  const handleClose = () => {
    resetForm();
    resetErrors();
    onEditingChange(false);
  };

  // Toggle — используется в триггере.
  const toggleEdit = () => {
    if (isEditing) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  // При открытии аккордеона — фокус на textarea
  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

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

  // NEW: hasOverflow — длина текста > MAX_CHARS.
  // Если true → кнопка "Сохранить" блокируется (disabled в JSX).
  const hasOverflow = formText.length > MAX_CHARS;

  // Хелпер: классы для красной рамки textarea.
  // Применяется когда: переполнение ИЛИ есть ошибка с бэка по полю headline.
  const errorBorderClass =
    (hasOverflow || localErrors.headline)
      ? 'border-destructive focus-visible:ring-destructive'
      : '';

  // Сохранить — вызываем onSave с текстом, после успеха зовём onEditingChange(false)
  const handleSave = async () => {
    if (isSaving) return;
    // FIX: проверка hasOverflow тут НЕ нужна — кнопка уже disabled при переполнении.
    setIsSaving(true);
    try {
      // onSave бросает throw err если бэк вернул 422 или 500.
      // Тогда onEditingChange(false) НЕ вызывается → блок остаётся открытым.
      if (onSave) {
        await onSave(formText);
      }
      onEditingChange(false);
    } catch (err) {
      console.error('Save failed in ProfileHeadline:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // FIX: при изменении текста — сбрасываем ошибку по этому полю.
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormText(e.target.value);
    setLocalErrors(prev => {
      if (!prev.headline) return prev;
      const next = { ...prev };
      delete next.headline;
      return next;
    });
  };

  const displayText = headline?.trim() || 'О чём ты думаешь?';
  const isPlaceholder = !headline?.trim();

  return (
    <div className={cn('mb-6', className)}>
      <div ref={containerRef} className="w-full">

        {/* === Блок 1: Триггер (плашка с текстом) ===
            FIX: grid-rows-[1fr]/[0fr] вместо max-height + delay-300.
            Паттерн такой же как в Bio/LookingFor/SelfPortrait — плавный
            inline-replace без прыжка (один блок частично видим в момент перехода).
            - Когда не editing → grid-rows-[1fr] (полностью виден)
            - Когда editing → grid-rows-[0fr] (схлопнут в 0 пикселей) */}
        <div
          className={cn(
            'grid transition-all duration-300 ease-in-out',
            isEditing
              ? 'grid-rows-[0fr] opacity-0'
              : 'grid-rows-[1fr] opacity-100',
          )}
        >
          <div className="overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={toggleEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleEdit();
                }
              }}
              className="inline-flex items-start gap-2 w-full bg-background border border-border rounded-2xl px-4 py-4 shadow-sm cursor-pointer hover:bg-muted/20 transition-colors focus:outline-none"
              title={isEditing ? 'Закрыть' : 'Нажмите, чтобы изменить статус'}
            >
              <p
                className={cn(
                  'flex-1 text-sm italic font-light leading-relaxed line-clamp-2',
                  isPlaceholder
                    ? 'text-muted-foreground/60'
                    : 'text-foreground/80',
                )}
              >
                {displayText}
              </p>
            </div>
          </div>
        </div>

        {/* === Блок 2: Контент (textarea + кнопки) ===
            FIX: grid-rows-[1fr]/[0fr] вместо max-height.
            - Когда editing → grid-rows-[1fr] opacity-100 mt-3 (раскрыт)
            - Когда не editing → grid-rows-[0fr] opacity-0 (схлопнут) */}
        <div
          className={cn(
            'grid transition-all duration-300 ease-in-out',
            isEditing
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="bg-muted/30 border border-border rounded-2xl px-4 py-4 shadow-sm space-y-2">

              {/* Textarea в пунктирной рамке.
                  FIX: контейнер border-dashed получает border-destructive при overflow/ошибке.
                  maxLength УБРАН — валидация через счётчик + красную рамку + disabled кнопку. */}
              <div className={cn(
                'border-2 border-dashed rounded-md mb-2 bg-background',
                errorBorderClass ? 'border-destructive' : 'border-border/80',
              )}>
                <Textarea
                  ref={textareaRef}
                  value={formText}
                  onChange={handleChange}
                  placeholder="не более 200 символов"
                  className={cn(
                    'resize-none border-0 bg-transparent px-3 py-1 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm italic font-light text-foreground/80 leading-relaxed',
                    errorBorderClass,
                  )}
                  rows={3}
                  disabled={isSaving}
                />
              </div>

              {/* Текст ошибки с бэка (опционально) — появляется ТОЛЬКО когда есть localErrors.headline */}
              {localErrors.headline && (
                <p className="text-[0.75rem] text-destructive -mt-1 leading-tight">
                  {localErrors.headline}
                </p>
              )}

              {/* Кнопка Сохранить + счётчик — ВЕРСТКА КАК У БРАТАНА:
                  flex items-center justify-between gap-2
                  слева — кнопка (variant=outline)
                  справа — счётчик (text-xs text-muted-foreground) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleSave}
                  // FIX: disabled если есть переполнение ИЛИ идёт сохранение.
                  disabled={isSaving || hasOverflow}
                  size="sm"
                  variant="default"
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
                     tabular-nums — моноширинные цифры, чтобы не дёргалось. */}
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
    </div>
  );
}
