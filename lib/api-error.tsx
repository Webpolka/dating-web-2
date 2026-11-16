// lib/api-error.tsx
//
// Единый разбор ошибок API (Laravel + axios + сеть).
//
// Раньше один и тот же catch-блок на ~60 строк копировался в profile-edit-client
// восемь раз (по одному на каждую секцию профиля) и ещё раз в profile-interests.
// Теперь всё поведение живёт здесь:
//
//   getValidationErrors(err) — Laravel 422 { errors: { field: [msg] } } | null
//   getErrorMessage(err)     — человекочитаемое сообщение из любого типа ошибки
//   showSaveError(err)       — показывает toast (валидация или общая ошибка)
//                              и возвращает { field: message } для подсветки полей

import { toast } from 'sonner';
import { buildFieldErrors, formatErrorsForToast } from '@/lib/profile-validation-messages';

/** Минимальная форма ошибки axios/Laravel, достаточная для разбора. */
interface ApiLikeError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
  message?: string;
}

/** Ошибки валидации Laravel (422), если они есть в ответе. */
export function getValidationErrors(err: unknown): Record<string, string[]> | null {
  const e = err as ApiLikeError;
  const errors = e?.response?.data?.errors;
  if (
    errors &&
    typeof errors === 'object' &&
    !Array.isArray(errors) &&
    Object.keys(errors).length > 0
  ) {
    return errors;
  }
  return null;
}

/** Человекочитаемое сообщение об ошибке из любого исключения. */
export function getErrorMessage(
  err: unknown,
  fallback = 'Что-то пошло не так. Попробуйте позже.',
): string {
  const e = err as ApiLikeError;
  return e?.response?.data?.message || e?.message || fallback;
}

export interface ShowSaveErrorOptions {
  /** Текст для не-валидационных ошибок (500, сеть, таймаут). */
  fallbackMessage?: string;
}

/**
 * Показывает ошибку сохранения в тосте.
 *
 * - Laravel 422: тост со списком «Поле — сообщение» (лейблы из FIELD_LABELS);
 *   возвращает объект { field: message } — вызывающий код кладёт его в state
 *   для красной рамки на конкретном инпуте.
 * - Любая другая ошибка: тост с общим сообщением; возвращает null.
 *
 * Вызывающий код по-прежнему сам пробрасывает исключение дальше (throw),
 * если по контракту блок редактирования должен остаться открытым.
 */
export function showSaveError(
  err: unknown,
  options: ShowSaveErrorOptions = {},
): Record<string, string> | null {
  const errors = getValidationErrors(err);

  if (errors) {
    const fieldErrors = buildFieldErrors(errors);
    const lines = formatErrorsForToast(errors);

    toast.error('Не удалось сохранить. Проверьте поля:', {
      description: (
        <div className="flex flex-col gap-1 mt-1.5">
          {lines.map((line, i) => (
            <span key={i} className="text-[0.8125rem] leading-tight">
              <span className="font-medium">{line.label}</span>
              <span className="text-muted-foreground"> — </span>
              <span>{line.message}</span>
            </span>
          ))}
        </div>
      ),
      // Иконка прижата к верху — не центрируется по высоте при длинном списке.
      classNames: { toast: '[&_[data-icon]]:self-start' },
    });

    return fieldErrors;
  }

  toast.error(getErrorMessage(err, options.fallbackMessage ?? 'Не удалось сохранить'));
  return null;
}
