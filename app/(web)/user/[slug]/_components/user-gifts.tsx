// app/(web)/user/[slug]/_components/user-gifts.tsx
'use client';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Gift, Plus, Lock } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useUIStore } from '@/store/ui-store';
import { formatDateHuman } from '@/lib/format';

interface GiftItem {
  id: number;
  image_url: string;
  snapshot_name: string;
  is_private: boolean;
  message: string | null;
  created_at: string;
  sender?: {
    slug: string;
    name: string;
    avatar_url: string;
  } | null;
}

interface UserGiftsProps {
  gifts: GiftItem[];
  hasPremium: boolean;
  isAuth: boolean;
  slug: string;  
  onGuestClick: () => void;
}

export function UserGifts({ gifts, hasPremium, isAuth, slug, onGuestClick }: UserGiftsProps) {
  
  const handleGiveGift = () => {
    if (!isAuth) {
      onGuestClick();
      return;
    }
    // Открываем каталог, передаем слаг юзера, которому дарим
    useUIStore.getState().openGiftModal(slug);
  };

  // Дата подарка: «Сегодня» / «Вчера» / «12 марта 2025 г.» (общий хелпер lib/format.ts)
  const formatDate = formatDateHuman;

   // Логика: Показываем плашку, если гость ИЛИ если подарков нет    
  const showPlaceholder = gifts.length === 0;

  return (
    <div className="mb-6 border-t border-border pt-4">
      <h3 className="text-base font-medium text-accent-foreground mb-3">Подарки</h3>        

      {/* Если подарков нет — серая плашка, если есть — прозрачная */}
      <div className={`grid grid-cols-4 sm:grid-cols-7 gap-3 ${showPlaceholder ? 'p-3 bg-muted/60' : 'bg-transparent'}`}>
        
        {/* Кнопка "Подарить" */}
        <TooltipProvider delay={300}>
          <Tooltip>
            <TooltipTrigger 
              onClick={handleGiveGift}
              className="flex items-center cursor-pointer text-muted-foreground relative outline-none"
            >
              <Gift className="w-full h-full max-w-16 max-h-16" />
              <div className="absolute -bottom-0.5 -right-0 w-5 h-5 text-primary-foreground bg-blue-500 rounded-full flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Подарить подарок</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Текст "Подарков пока нет" (Виден гостям ИЛИ если список пуст) */}               
        {showPlaceholder && (
          <p className="text-sm text-center text-muted-foreground py-2 col-span-3 sm:col-span-5 md:col-span-6 self-center">
            {/* Если гость - заманиваем, если пусто - говорим правду */}
            {!isAuth 
              ? "Подарите подарок и вас заметят!" 
              : "Станьте первым, кто подарит подарок!"}
          </p>
        )}

        {/* Вывод подарков (Видят все, но поведение разное) */}
        {gifts.length > 0 && gifts.map((gift) => (
          <div key={gift.id} className="aspect-square overflow-hidden cursor-pointer">
            
            {isAuth ? (
              <HoverCard>
                <HoverCardTrigger className="flex items-center justify-center w-full h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gift.image_url} alt={gift.snapshot_name} className="w-full h-full max-w-16 max-h-16 object-contain" />
                </HoverCardTrigger>
                
                <HoverCardContent className="w-72 p-0">
                  <div className="p-4">
                    <div className="flex gap-3 relative">
                      <div className="shrink-0">
                        {gift.is_private ? (
                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-muted-foreground border border-border">
                            <Lock className="w-6 h-6" />
                          </div>
                        ) : (
                          <a href={gift.sender ? `/user/${gift.sender.slug}` : '#'} className="block hover:opacity-80 transition-opacity">
                            <div className="w-12 h-12 rounded-sm overflow-hidden bg-muted border border-border flex items-center justify-center">
                              {gift.sender?.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={gift.sender.avatar_url} alt={gift.sender.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-semibold text-primary text-lg">
                                  {gift.sender?.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                          </a>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {gift.is_private ? (
                          <h4 className="text-sm font-semibold text-foreground truncate">Приватный подарок</h4>
                        ) : (
                          <a href={gift.sender ? `/user/${gift.sender.slug}` : '#'} className="text-sm font-semibold text-blue-500 truncate hover:underline block">
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
                    {!gift.is_private && (
                      <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                        {gift.message ? (
                          hasPremium ? (
                            <p className="line-clamp-3 break-words">{gift.message}</p>
                          ) : (
                            <p className="break-words">
                              Сообщение отправлено с подарком скрыто{' '}
                              <a href="/subscriptions/premium" className="text-blue-500 hover:underline cursor-pointer inline">(Показать)</a>
                            </p>
                          )
                        ) : (
                          <p className="italic opacity-70">Без сообщения</p>
                        )}
                      </div>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            ) : (
              // Для гостей — просто кликабельная картинка, открывает логин
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={gift.image_url} 
                alt={gift.snapshot_name} 
                className="w-full h-full max-w-16 max-h-16 object-contain" 
                onClick={onGuestClick}
              />
            )}
          </div>
        ))}
      </div>      
    </div>
  );
}
