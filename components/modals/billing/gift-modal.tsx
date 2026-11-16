// components/modals/billing/gift-modal.tsx
'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/ui-store';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

interface Gift {
  id: number;
  name: string;
  price: number;
  image_url: string;
  type: string;
}

export function GiftModal() {
  const { isGiftModalOpen, closeGiftModal, giftRecipientSlug, openCheckoutModal } = useUIStore();
  const [gifts, setGifts] = useState<Record<string, Gift[]>>({});
  const [loading, setLoading] = useState(true);

  // Загружаем каталог при открытии
useEffect(() => {
  if (!isGiftModalOpen) return;
  let cancelled = false;
  (async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ gifts?: Record<string, Gift[]> }>('/gifts');
      // Guard: каталог приходит словарём «категория → массив» — проверяем и форму,
      // и каждый массив внутри, чтобы дропдаун не падал при неожиданном ответе
      const catalog =
        data?.gifts && typeof data.gifts === 'object' && !Array.isArray(data.gifts)
          ? Object.fromEntries(
              Object.entries(data.gifts).map(([key, list]) => [
                key,
                Array.isArray(list) ? list : [],
              ]),
            )
          : {};
      if (!cancelled) setGifts(catalog);
    } catch (e) {
      console.error('Failed to load gifts', e);
      if (!cancelled) setGifts({});
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();
  return () => { cancelled = true; };
}, [isGiftModalOpen]);

  const handleSelectGift = (gift: Gift) => {
    if (!giftRecipientSlug) return;
    // Открываем чекаут, передаем данные подарка и слаг получателя
    openCheckoutModal({
      id: gift.id,
      name: gift.name,
      price: gift.price,
      image_url: gift.image_url
    }, giftRecipientSlug);
  };

  const renderGiftGrid = (items: Gift[] = []) => (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {items.length === 0 && (
        <p className="col-span-full text-center text-muted-foreground text-sm py-10">В этой категории пока нет подарков.</p>
      )}
      {items.map(gift => (
        <div 
          key={gift.id} 
          onClick={() => handleSelectGift(gift)}
          className="group cursor-pointer flex flex-col overflow-hidden rounded-lg border border-transparent hover:border-border transition-colors"
        >
          <div className="relative w-full aspect-square flex items-center justify-center transition-colors group-hover:bg-blue-50/80 dark:group-hover:bg-blue-950/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gift.image_url} alt={gift.name} className="w-full h-full object-contain p-2" />
          </div>
          <div className="w-full text-center text-[0.75rem] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-950/40">
            {gift.price} ед.
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={isGiftModalOpen} onOpenChange={(open) => !open && closeGiftModal()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border space-y-0">
          <DialogTitle>Магазин подарков</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="main" className="flex-1 flex flex-col">
          <TabsList className="flex border-b border-border px-4 gap-4 justify-start rounded-none h-auto">
            <TabsTrigger value="main" className="py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">Основные</TabsTrigger>
            <TabsTrigger value="premium" className="py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">Премиум</TabsTrigger>
            <TabsTrigger value="services" className="py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">Сервисы</TabsTrigger>
          </TabsList>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-4 flex-1 overflow-y-auto max-h-[60vh]">
              <TabsContent value="main" className="mt-0">
                {renderGiftGrid(gifts['main'])}
              </TabsContent>
              
              <TabsContent value="premium" className="mt-0">
                <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-center text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Премиум подарок</span> невозможно пропустить из-за особого способа доставки.
                </div>
                {renderGiftGrid(gifts['premium'])}
              </TabsContent>
              
              <TabsContent value="services" className="mt-0">
                {renderGiftGrid(gifts['services'])}
              </TabsContent>
            </div>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}