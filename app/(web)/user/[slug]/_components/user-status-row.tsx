// app/(web)/user/[slug]/_components/user-status-row.tsx
'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { MapPin, X, Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pluralizeRu } from '@/lib/pluralize';

interface UserStatusRowProps {
  className?:string;
  slug: string;
  city?: string | null;
  lastSeen?: string | null;
  isAuth: boolean;
  viewersCount: number;
}

export function UserStatusRow({className, slug, city, lastSeen, isAuth, viewersCount}: UserStatusRowProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentSwipe, setCurrentSwipe] = useState<string | null>(null);

  // Логика вычисления статуса    
  const getStatusInfo = () => {
    if (!lastSeen) return null;
    const now = new Date();
    const seen = new Date(lastSeen);
    const diffMin = (now.getTime() - seen.getTime()) / (1000 * 60);

    if (diffMin < 5) {
      return { text: 'Онлайн', dot: 'bg-green-500', textClass: 'text-green-600' };
    }
    if (diffMin < 60) { // В течение часа — "Часто активный"
      return { text: 'Часто активный', dot: 'bg-green-500', textClass: 'text-green-600' };
    }
    if (diffMin < 1440) { // В течение суток — "Был недавно"
      return { text: 'Был недавно', dot: 'bg-gray-400', textClass: 'text-muted-foreground' };
    }
    return { text: 'Был давно', dot: 'bg-gray-400', textClass: 'text-muted-foreground' };
  };

  const status = getStatusInfo();

  const handleSwipe = async (type: 'like' | 'dislike') => {
    if (!isAuth) return;
    if (loading || currentSwipe === type) return;
    setLoading(type);
    try {
      const res = await api.post(`/users/${slug}/swipe`, { type });
      if (res.data.success) {
        setCurrentSwipe(res.data.current_swipe);
        if (res.data.is_match) {
          toast.success('Поздравляем! У вас мэтч!');
        } else if (type === 'like') {
          toast.success('Лайк отправлен');
        } else {
          toast.info('Вы отклонили анкету');
        }
      }
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={cn("flex items-center justify-between gap-3 mb-4 mt-2", className)}>
      {/* Левая часть: Город + Статус + Просмотры */}
      <div className="flex flex-col gap-2">
        <p className="text-blue-500 text-sm flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {city ?? "Город не указан"}
        </p>

        <div className="flex items-center justify-between gap-3">
          {status && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full ${status.dot}`}></span>
              <span className={`font-medium ${status.textClass}`}>{status.text}</span>
            </div>
          )}

          {/* Счетчик просмотров (Пока заглушка 1, с тултипом) */}                   
          <TooltipProvider delay={300}>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1 text-xs text-muted-foreground cursor-default">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                {/* Выводим реальный счетчик */}
                <span>{viewersCount}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Сейчас эту анкету просматривает {viewersCount} {pluralizeRu(viewersCount, ['человек', 'человека', 'человек'])}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Правая часть: Кнопки Лайк/Дизлайк (Только для авторизованных) */}
      {isAuth && (
        <div className="flex gap-4 items-center">
          {/* Дизлайк */}
          <TooltipProvider delay={300}>
            <Tooltip>
              <TooltipTrigger 
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm disabled:opacity-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  currentSwipe === 'dislike' 
                    ? 'bg-red-500/10 text-red-500 scale-105' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105'
                }`}
                onClick={() => handleSwipe('dislike')} 
                disabled={loading !== null}
              >
                {loading === 'dislike' ? <Loader2 className="w-7 h-7 animate-spin" /> : <X className="w-7 h-7" strokeWidth={2.5} />}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Не нравится</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Лайк */}
          <TooltipProvider delay={300}>
            <Tooltip>
              <TooltipTrigger 
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm disabled:opacity-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  currentSwipe === 'like' 
                    ? 'bg-red-500/10 text-red-500 scale-105' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105'
                }`}
                onClick={() => handleSwipe('like')} 
                disabled={loading !== null}
              >
                {loading === 'like' ? <Loader2 className="w-8 h-8 animate-spin" /> : 
                  <Heart className={`w-8 h-8 ${currentSwipe === 'like' ? 'fill-red-500' : ''}`} strokeWidth={2.5} />
                }
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Нравится</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}