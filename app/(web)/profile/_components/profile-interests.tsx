// app/(web)/profile/_components/profile-interests.tsx
//
// «Интересы» — секция профиля с multi-select.
//
// View mode: chips с интересами (или placeholder-подсказка).
// Edit mode: карточка с InterestMultiSelect + кнопки Сохранить/Отменить.
//
// Controlled: isEditing + onEditingChange (аккордеон через activeSection).
// API: компонент сам делает PATCH /api/profile/interests {interests: [ids]}
// (selectedIds живёт в локальном state) и после успеха зовёт onSaved,
// чтобы родитель обновил свой state. Ошибки — общий хелпер lib/api-error.ts.

'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { InterestMultiSelect } from '../../_components/interest-multi-select';
import { showSaveError } from '@/lib/api-error';
import type { UserInterest } from '@/lib/api-types';

interface ProfileInterestsProps {
  interests?: UserInterest[] | null;

  isEditing: boolean;
  onEditingChange: (open: boolean) => void;

  className?: string;

  // Callback после успешного сохранения — передаёт обновлённый массив интересов наверх.
  onSaved?: (interests: UserInterest[]) => void;
}

export function ProfileInterests({
  interests,
  isEditing,
  onEditingChange,
  className,
  onSaved,
}: ProfileInterestsProps) {
  // Локальный state выбранных ID (для multi-select)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Сброс к текущим интересам профиля (вызывается при открытии блока)
  const resetForm = () => {
    const ids = (interests || []).map((i) => i.id).filter((id) => id > 0);
    setSelectedIds(ids);
  };
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

  // Click-outside-to-close — как в остальных секциях профиля.
  // Base UI рендерит попапы через Portal в body, поэтому проверяем
  // реальные data-slot обёртки попапов (popover-content из ui/popover.tsx,
  // select-content из ui/select.tsx) — иначе клик по опции дропдауна
  // схлопывал бы блок вместе с открытым списком.
  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement;
        if (
          target.closest('[data-slot="popover-content"]') ||
          target.closest('[data-slot="select-content"]') ||
          target.closest('[role="listbox"]') ||
          target.closest('[cmdk-root]')
        ) {
          return; // клик внутри попапа — не закрываем блок
        }
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

  // Защита: нельзя сохранить 0 интересов (минимум 1 по валидации бэка)
  const hasEmpty = selectedIds.length === 0;

  const handleSave = async () => {
    if (isSaving || hasEmpty) return;
    setIsSaving(true);
    resetErrors();

    try {
      const response = await api.patch('/profile/interests', {
        interests: selectedIds,
      });

      const data = response.data as {
        success?: boolean;
        message?: string;
        interests?: UserInterest[];
      };

      if (data.success) {
        if (onSaved && data.interests) {
          onSaved(data.interests);
        }
        onEditingChange(false);
      } else {
        throw new Error(data.message || 'Не удалось сохранить');
      }
    } catch (err) {
      // Тост + {field: message}; при 422 — «Интересы: …» в localErrors
      const fieldErrors = showSaveError(err, { fallbackMessage: 'Не удалось сохранить интересы' });
      if (fieldErrors) setLocalErrors(fieldErrors);
      // Блок остаётся открытым
    } finally {
      setIsSaving(false);
    }
  };

  // При изменении выбора — сбрасываем ошибку
  const handleChange = (ids: number[]) => {
    setSelectedIds(ids);
    setLocalErrors((prev) => {
      if (!prev.interests) return prev;
      const next = { ...prev };
      delete next.interests;
      return next;
    });
  };

  return (
    <div className={cn('mb-6', className)} ref={containerRef}>

      {/* === Заголовок + карандашик === */}
      <h3 className="text-base font-medium text-accent-foreground mb-3 flex items-center gap-2.5 flex-wrap">
        Интересы
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
                  ? 'opacity-100 max-w-[100px]'
                  : 'opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[100px]',
              )}
            >
              {isEditing ? 'Свернуть' : 'Изменить'}
            </span>
          </button>
        </div>
      </h3>

      {/* === View mode — chips с интересами === */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out overflow-hidden',
          isEditing ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
        )}
      >
        <div className="overflow-hidden">
          {interests && interests.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {interests.map((interest, idx) => (
                <Badge
                  key={interest.id || idx}
                  variant="default"
                  className="bg-muted rounded-full text-foreground border-blue-400 text-xs p-3"
                >
                  {interest.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic">
              Выберите интересы — это поможет найти единомышленников.
            </p>
          )}
        </div>
      </div>

      {/* === Edit mode — карточка с multi-select === */}
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

            <p className="text-[0.825rem] text-muted-foreground leading-relaxed">
              Выберите интересы и увлечения. Чем больше пунктов отметите — тем
              точнее будет поиск единомышленников.
            </p>

            <InterestMultiSelect
              selectedIds={selectedIds}
              onChange={handleChange}
            />

            {localErrors.interests && (
              <p className="text-[0.75rem] text-destructive -mt-2 leading-tight">
                {localErrors.interests}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || hasEmpty}
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
          </div>
        </div>
      </div>

    </div>
  );
}
