// app/(web)/user/[slug]/_components/action-buttons.tsx
'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { REPORT_REASONS, BLOCK_REASONS } from '@/lib/enums';

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { MessageCircle, Bookmark, MoreVertical, Ban, Flag, CheckCircle2, Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  slug: string;
  isAuth: boolean;
  isFavorited: boolean;
  isBlocked: boolean;
  isReported: boolean;
  className?: string;
  onGuestClick: () => void;
  onBlockChange: (isBlocked: boolean) => void; // <--- Добавили коллбек
}

export function ActionButtons({ className, slug, isAuth, isFavorited, isBlocked, isReported, onGuestClick, onBlockChange }: ActionButtonsProps) {  
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(isFavorited);  
  const [reported, setReported] = useState(isReported);
  
  const [confirmAction, setConfirmAction] = useState<'block' | 'report' | null>(null);
  const [reason, setReason] = useState('');

  const sendAction = async (action: string, body?: unknown) => {
    if (!isAuth) {
      onGuestClick();
      return;
    }
    setLoadingAction(action);
    try {
      const res = await api.post(`/users/${slug}/${action}`, body);
      if (res.data.success) {
        if (action === 'favorite') setFavorited(res.data.isFavorited);
        if (action === 'block') {
          onBlockChange(res.data.isBlocked); // <--- Вызываем коллбек родителя
          if (res.data.isBlocked && favorited) setFavorited(false);
        }
        if (action === 'report') setReported(true);
        if (res.data.message) toast.success(res.data.message);
      } else if (res.data.message) {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setLoadingAction(null);
      setConfirmAction(null);
      setReason('');
    }
  };

  const handleChat = () => {
    if (!isAuth) return onGuestClick();
    toast.info('Чат скоро будет доступен!');
  };

  const openDialog = (action: 'block' | 'report') => {
    setReason(''); // Сбрасываем причину
    setConfirmAction(action);
  };

  const handleConfirm = () => {
    if (!reason) {
      toast.error('Выберите причину');
      return;
    }
    if (confirmAction === 'block') sendAction('block', { reason });
    if (confirmAction === 'report') sendAction('report', { reason });
  };

  const reasons = confirmAction === 'report' ? REPORT_REASONS : BLOCK_REASONS;

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-3 mb-6", className)}>
        <Button size="xl" variant="default" className="flex-1 max-w-[16rem]" disabled={loadingAction === 'chat'} onClick={handleChat}>
          {loadingAction === 'chat' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
          Написать
        </Button>

        {isAuth && (
          <>
            <Button 
              size="xl"
              variant="outline" 
              className="flex-1 max-w-[16rem]" 
              disabled={loadingAction === 'favorite' || isBlocked}
              onClick={() => sendAction('favorite')}
            >
              {loadingAction === 'favorite' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 
                <Bookmark className={`w-4 h-4 mr-2 ${favorited ? 'fill-primary text-primary' : ''}`} />
              }
              {favorited ? 'В избранном' : 'В избранное'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "icon" }), "w-10 h-10 disabled:opacity-50")} disabled={loadingAction !== null}>
                <MoreVertical className="w-4 h-4" />
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuItem 
                  disabled={reported} 
                  onClick={() => { if (!reported) openDialog('report'); }}
                >
                  {reported ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
                  {reported ? 'Жалоба отправлена' : 'Пожаловаться'}
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => openDialog('block')}
                  className={isBlocked ? 'text-green-600' : 'text-destructive'}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  {isBlocked ? 'Разблокировать' : 'Заблокировать'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Диалог подтверждения */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'block' ? (isBlocked ? 'Разблокировать пользователя?' : 'Заблокировать пользователя?') : 'Пожаловаться на пользователя?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'block' 
                ? (isBlocked ? 'Вы снова сможете писать друг другу.' : 'Выберите причину блокировки. После блокировки вы не сможете писать друг другу.') 
                : 'Выберите причину жалобы. Модераторы рассмотрят её в ближайшее время.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Селект выбора причины (скрыт при разблокировке) */}                   
          {!(confirmAction === 'block' && isBlocked) && (
            <Select value={reason} onValueChange={(val) => setReason(val ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите причину...">
                  {/* Динамически ищем русский лейбл по выбранному value */}
                  {reason ? reasons.find(r => r.value === reason)?.label : 'Выберите причину...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger = {false}>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmAction === 'block' && isBlocked) {
                  sendAction('block');
                } else {
                  handleConfirm();
                }
              }}
              // Добавлено !! чтобы привести к строгому boolean
              disabled={!!loadingAction || (!(confirmAction === 'block' && isBlocked) && !reason)}
              className={cn(
                "text-white",
                confirmAction === 'block' && !isBlocked ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
              )}
            >
              {loadingAction ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Подтвердить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}