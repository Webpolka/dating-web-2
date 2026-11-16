// app/(web)/profile/_components/profile-gifts.tsx
//
// "Подарки" — секция для своего профиля.
// ПРОСТАЯ СЕТКА (grid) — разделена на ДВЕ части:
//   1) Первый ряд — всегда виден (статичный grid)
//   2) Остальные ряды — аккордеон через grid-rows-[1fr]/[0fr]
//
// Контролы:
//   - Карандашик "Изменить" / "Свернуть" — toggle (как в ProfileHeader)
//   - В editing: крестик absolute в правом верхнем углу подарка
//   - AlertDialog с подтверждением удаления
//
// Accordion: через isEditing + onEditingChange (controlled из родителя).
// При открытии этого блока — другие блоки закрываются автоматически.
//
// FIX: плавное раскрытие через grid-rows-[1fr]/[0fr] (как в PersonalInfo/Bio/LookingFor).
//   - Первый ряд всегда виден (статичный grid)
//   - Остальные ряды — скрыты (grid-rows-[0fr]) пока не нажмёшь "Изменить"
//   - При "Изменить" → grid-rows-[1fr] opacity-100 → плавно разъезжается вниз
//   - При "Свернуть" → grid-rows-[0fr] opacity-0 → плавно сворачивается
//   - transition-all duration-500 ease-in-out — 500мс плавности
//   - При resize — грид автоматически перетекает по колонкам, ничего не ломается
//     (в отличие от max-height подхода, где надо пересчитывать высоту)
//
// Надёжность при resize: grid-rows-[1fr] автоматически растягивается под
// любое количество элементов в любом количестве колонок. Не зависит от
// window.innerWidth напрямую — только количество колонок в grid-cols.

'use client';

import { useState, useEffect } from 'react';
import { Pencil, X, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateHuman } from '@/lib/format';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  HoverPreviewCard, HoverPreviewCardContent, HoverPreviewCardTrigger,
} from '@/components/ui/hover-preview-card';

interface ProfileGiftsProps {
  gifts: Array<{
    id: number;
    image_url: string;
    snapshot_name: string;
    is_private: boolean;
    message?: string | null;
    created_at: string;
    sender?: {
      slug: string;
      name: string;
      avatar_url: string;
    } | null;
  }>;

  isEditing: boolean;
  onEditingChange: (open: boolean) => void;
  hasPremium?: boolean;
  className?: string;
  onDeleteGift?: (giftId: number) => Promise<void>;
}

export function ProfileGifts({
  gifts,
  isEditing,
  onEditingChange,
  hasPremium = false,
  className,
  onDeleteGift,
}: ProfileGiftsProps) {
  const [deletingGiftId, setDeletingGiftId] = useState<number | null>(null);

  // === Адаптивное количество подарков в ПЕРВОМ ряду ===
  //   mobile/tablet (< 768px): 6 (grid-cols-6 → 1 ряд = 6)
  //   desktop (768px+):        8 (md:grid-cols-8 → 1 ряд = 8)
  // В editing mode — ВСЕ подарки (firstRow + rest, оба контейнера видимы).
  //
  // FIX: раньше был visibleCount state + resize listener, который ВЫЧИСЛЯЛ
  // сколько показывать. Это ломалось при resize (если resize происходил в момент
  // анимации — были баги "пол ряда видно").
  // Теперь: просто берём количество колонок в первом ряду (4 или 7), а дальше
  // гриды сами перетекают. Resize только меняет количество колонок, не трогая
  // высоту/анимацию.
  const getFirstRowSize = () => {
    if (typeof window === 'undefined') return 8;
    return window.innerWidth < 768 ? 6 : 8;
  };

  const [firstRowSize, setFirstRowSize] = useState(getFirstRowSize());

  useEffect(() => {
    const check = () => setFirstRowSize(getFirstRowSize());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Делим подарки на две части:
  //   firstRow — первый ряд (всегда виден, статичный grid)
  //   rest — остальные (аккордеон, скрыт пока isEditing=false)
  const firstRow = gifts.slice(0, firstRowSize);
  const rest = gifts.slice(firstRowSize);
  // hasRest — есть ли что раскрывать. Если rest пустой → карандашик всё равно
  // показываем (можно удалять подарки), но анимация не нужна.
  const hasRest = rest.length > 0;

  // Toggle — открывает/закрывает editing
  const toggleEdit = () => onEditingChange(!isEditing);

  const handleDelete = async (giftId: number) => {
    if (!onDeleteGift) return;
    setDeletingGiftId(giftId);
    try {
      await onDeleteGift(giftId);
    } catch (err) {
      console.error('Delete gift failed:', err);
    } finally {
      setDeletingGiftId(null);
    }
  };

  // Дата подарка: «Сегодня» / «Вчера» / «12 марта 2025 г.» (общий хелпер lib/format.ts)
  const formatDate = formatDateHuman;

  const showPlaceholder = gifts.length === 0;

  // === Рендер одной карточки подарка ===
  // Вынесли в функцию чтобы не дублировать код для firstRow и rest.
  // Принимает gift + index (для key) — всё остальное из замыкания.
  const renderGift = (gift: typeof gifts[number], key: string | number) => (
    <div
      key={key}
      // relative — для absolute крестика
      className="relative aspect-square flex items-center justify-center "
    >
      {/* === View mode — HoverCard === */}
      {!isEditing ? (
        <HoverPreviewCard>
          <HoverPreviewCardTrigger className="flex items-center justify-center w-full h-full cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gift.image_url}
              alt={gift.snapshot_name}
              className="w-full h-full max-w-16 max-h-16 object-contain"
              draggable="false"
            />
          </HoverPreviewCardTrigger>

          <HoverPreviewCardContent className="w-72 p-0" side="top" align="center" sideOffset={16} arrow>
            <div className="p-4">
              <div className="flex gap-3 relative">
                {/* Avatar / Lock */}
                <div className="shrink-0">
                  {gift.is_private ? (
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-muted-foreground border border-border">
                      <Lock className="w-6 h-6" />
                    </div>
                  ) : (
                    <a
                      href={gift.sender ? `/user/${gift.sender.slug}` : '#'}
                      className="block hover:opacity-80 transition-opacity"
                    >
                      <div className="w-12 h-12 rounded-sm overflow-hidden bg-muted border border-border flex items-center justify-center">
                        {gift.sender?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={gift.sender.avatar_url}
                            alt={gift.sender.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-semibold text-primary text-lg">
                            {gift.sender?.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                    </a>
                  )}
                </div>

                {/* Имя + дата */}
                <div className="flex-1 min-w-0">
                  {gift.is_private ? (
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      Приватный подарок
                    </h4>
                  ) : (
                    <a
                      href={gift.sender ? `/user/${gift.sender.slug}` : '#'}
                      className="text-sm font-semibold text-blue-500 truncate hover:underline block"
                    >
                      {gift.sender?.name || 'Аноним'}
                    </a>
                  )}
                  <div className="text-muted-foreground flex items-center gap-1.5 pt-0.5 text-xs">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span>{formatDate(gift.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Сообщение — проверка hasPremium */}
              {!gift.is_private && (
                <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                  {gift.message ? (
                    hasPremium ? (
                      <p className="line-clamp-3 wrap-break-word">{gift.message}</p>
                    ) : (
                      <p className="wrap-break-word">
                        Сообщение отправлено с подарком скрыто{' '}
                        <a href="/subscriptions/premium" className="text-blue-500 hover:underline cursor-pointer inline">
                          (Показать)
                        </a>
                      </p>
                    )
                  ) : (
                    <p className="italic opacity-70">Без сообщения</p>
                  )}
                </div>
              )}
            </div>
          </HoverPreviewCardContent>
        </HoverPreviewCard>
      ) : (
        // === Edit mode — подарок + крестик absolute в правом верхнем углу ===
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gift.image_url}
            alt={gift.snapshot_name}
            className="w-full h-full max-w-16 max-h-16 object-contain opacity-70"
            draggable="false"
          />

          {/* Красный крестик — absolute правый верхний угол */}
          <AlertDialog>
            <AlertDialogTrigger
              className="absolute top-0 right-0 z-10 cursor-pointer text-red-500 hover:text-red-600 hover:scale-110 transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-0.5 bg-background/80"
              disabled={deletingGiftId === gift.id}
            >
              {deletingGiftId === gift.id ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
              ) : (
                <X className="w-4 h-4" strokeWidth={2.5} />
              )}
            </AlertDialogTrigger>

            <AlertDialogContent className="min-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить подарок?</AlertDialogTitle>
                <AlertDialogDescription>
                  Вы уверены, что хотите удалить подарок
                  «{gift.snapshot_name}»
                  {gift.sender && ` от ${gift.sender.name}`}?
                  <br />
                  <br />
                  Это действие нельзя отменить. Отправитель не получит
                  уведомления — удаление видно только вам.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(gift.id)}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );

  return (
    <div className={cn('mb-6', className)}>

      {/* === Заголовок + карандашик === */}
      <h3 className="text-base font-medium text-accent-foreground mb-3 flex items-center gap-2.5 flex-wrap">
        Подарки
        {gifts.length > 0 && (
          <span className="text-sm text-muted-foreground">({gifts.length})</span>
        )}
        {gifts.length > 0 && (
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
              aria-label={isEditing ? 'Свернуть редактирование подарков' : 'Изменить подарки'}
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
        )}
      </h3>

      {/* === Сетка подарков === */}
      {showPlaceholder ? (
        <div className="p-3 bg-muted/60 rounded-sm ">
          <p className="text-sm text-center text-muted-foreground py-4">
            У вас пока нет подарков.
          </p>
        </div>
      ) : (
        <>
          {/* === ПЕРВЫЙ РЯД — всегда виден (статичный grid) ===
              НЕ зависит от isEditing. Только грид-сетка с подарками.
              При resize — грид сам перетекает по колонкам. */}
          <div className="grid grid-cols-6 md:grid-cols-8 gap-3 select-none rounded-sm ">
            {firstRow.map((gift) => renderGift(gift, gift.id))}
          </div>

          {/* === ОСТАЛЬНЫЕ РЯДЫ — аккордеон через grid-rows-[1fr]/[0fr] ===
              Скрыт пока isEditing=false. Плавно разъезжается при "Изменить".

              transition-all duration-500 ease-in-out — 500мс плавности.
              overflow-hidden на внутреннем div — скрывает содержимое когда
              grid-rows-[0fr] (контейнер сжат в 0 пикселей).

              Почему grid-rows а не max-height:
                - max-height требует знать точную высоту, которая меняется при resize
                - grid-rows-[1fr] автоматически растягивается под содержимое
                - При resize — грид сам перетекает, ничего не ломается
                - Аналог alpine collapse, но на CSS grid (без зависимостей)
              */}
          {hasRest && (
            <div className={cn(
              'grid transition-all duration-500 ease-in-out',
              isEditing
                ? 'grid-rows-[1fr] opacity-100 mt-3'
                : 'grid-rows-[0fr] opacity-0',
            )}>
              <div className="overflow-hidden">
                <div className="grid grid-cols-6 md:grid-cols-8 gap-3 select-none">
                  {rest.map((gift) => renderGift(gift, gift.id))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
