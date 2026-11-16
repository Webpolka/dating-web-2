// components/layout/inapp-navigation.tsx
// ОБНОВЛЁННАЯ ВЕРСИЯ — умный хедер:
// 1) Кошелёк показывает реальный баланс user.balance?.credits (был захардкожен 0)
// 2) Цвета кнопок в HoverCard: Wallet=green, VIP=blue/indigo, Premium=orange/amber
// 3) На мобиле в Sheet условный рендер: если VIP/Premium активен — показываем
//    плашку "VIP активен до DD.MM.YYYY", иначе — кнопку "Включить VIP/Премиум"
// Реактивность уже работает через useAuthStore — после fetchUser() в success-content
// хедер автоматически перерисуется с новым балансом и статусами.

'use client';
import Link from 'next/link';

import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link'; // Наш новый чистый компонент
import { ThemeSwitcher } from '@/components/theme-switcher';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger
} from '@/components/ui/sheet';
import {
  Heart, Search, MessageCircle, Layers, Wallet, Gem, Star,
  User, Image as ImageIcon, Settings, CreditCard, Book, LifeBuoy, LogOut
} from 'lucide-react';

// NEW: маленький хелпер для форматирования даты окончания подписки.
// Возвращает строку "DD.MM.YYYY" или null если дата невалидна.
const formatDate = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ru-RU');
};

export function InAppNavigation() {
  const { user, logout } = useAuthStore();
  const { openBillingModal } = useUIStore();

  if (!user) return null;

  // NEW: читаем баланс реактивно. Если user обновится в auth-store (например
  // после оплаты в success-content.tsx через fetchUser()), эта переменная
  // автоматически обновится, и хедер перерисуется с новой цифрой.
  const creditsBalance = user.balance?.credits ?? 0;
  // Форматируем с разделителями тысяч (1 000 вместо 1000) для читаемости
  const formattedBalance = creditsBalance.toLocaleString('ru-RU');

  // NEW: даты окончания подписок
  const vipExpires = formatDate(user.vip_expires_at);
  const premiumExpires = formatDate(user.premium_expires_at);

  return (
    <header className="sticky z-50 top-0 w-full border-b border-border/30 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ЛЕВАЯ ЧАСТЬ: Лого + Навигация */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <svg className="w-8 h-8 fill-current text-foreground group-hover:text-primary transition-colors" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              <span className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors inline hidden sm:inline">
                Dating App
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-2">
              <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                <Heart className="w-5 h-5" /> Знакомства
              </a>
              <a href="/search" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                <Search className="w-5 h-5" /> Поиск
              </a>
              <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                <MessageCircle className="w-5 h-5" /> Сообщения
              </a>
              <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                <Layers className="w-5 h-5" /> Подписки
              </a>
            </nav>
          </div>

          {/* ПРАВАЯ ЧАСТЬ */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />

            {/* ДЕСКТОПНЫЕ HOVER-КАРТОЧКИ (скрыты на мобилках) */}
            <div className="hidden lg:flex items-center gap-2 sm:gap-3">

              {/* 1. КОШЕЛЕК */}
              <HoverCard>
                <HoverCardTrigger className="w-9 h-9 rounded-full bg-muted/50 text-foreground hover:bg-muted flex items-center justify-center transition-colors border border-border/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
                  <Wallet className="w-5 h-5" />
                </HoverCardTrigger>
                <HoverCardContent className="w-72 p-0">
                  <div className="p-4 flex items-start gap-3">
                    <div className="mt-1 w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-foreground">В вашем кошельке:</h4>
                      {/* ИЗМЕНЕНО: реальный баланс из auth-store вместо захардкоженного 0 */}
                      <p className="text-xl font-bold text-foreground mt-1">{formattedBalance} ед.</p>
                    </div>
                  </div>
                  <div className="p-4 pt-0">
                    {/* Кнопка "Пополнить кошелек" — green (деньги), как было.
                        Открывает billing-modal (уже реализован в billing-modal.tsx). */}
                    <Button
                      onClick={() => openBillingModal()}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Пополнить кошелек
                    </Button>
                  </div>
                </HoverCardContent>
              </HoverCard>

              {/* 2. VIP СТАТУС */}
              <HoverCard>
                <HoverCardTrigger className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 flex items-center justify-center transition-colors border border-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
                  <Gem className="w-5 h-5" />
                </HoverCardTrigger>
                <HoverCardContent className="w-72 p-0">
                  {user.has_active_vip ? (
                    <div className="p-4 flex items-start gap-3">
                      <div className="mt-1 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Gem className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">VIP активен</h4>
                        {/* ИЗМЕНЕНО: используем отформатированную дату, не new Date().toLocaleDateString() inline */}
                        {vipExpires && <p className="text-xs text-muted-foreground mt-1">Действует до: {vipExpires}</p>}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 flex items-start gap-3">
                        <div className="mt-1 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Gem className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">Включить VIP статус</h4>
                          <p className="text-xs text-muted-foreground mt-1">Встань первым</p>
                        </div>
                      </div>
                      <div className="p-4 pt-0">
                        {/* ИЗМЕНЕНО: blue→indigo gradient вместо green.
                            Соответствует цветовой гамме VIP на твоих Blade-страницах. */}
                        <ButtonLink
                          href="/subscriptions/vip"
                          variant="default"
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                        >
                          <Gem className="w-4 h-4 mr-2" /> Включить VIP статус
                        </ButtonLink>
                      </div>
                    </>
                  )}
                </HoverCardContent>
              </HoverCard>

              {/* 3. ПРЕМИУМ ДОСТУП */}
              <HoverCard>
                <HoverCardTrigger className="w-9 h-9 rounded-full bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 flex items-center justify-center transition-colors border border-orange-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
                  <Star className="w-5 h-5" />
                </HoverCardTrigger>
                <HoverCardContent className="w-72 p-0">
                  {user.has_active_premium ? (
                    <div className="p-4 flex items-start gap-3">
                      <div className="mt-1 w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">Премиум активен</h4>
                        {/* ИЗМЕНЕНО: отформатированная дата */}
                        {premiumExpires && <p className="text-xs text-muted-foreground mt-1">Действует до: {premiumExpires}</p>}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 flex items-start gap-3">
                        <div className="mt-1 w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                          <Star className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">Включить Премиум доступ</h4>
                          <p className="text-xs text-muted-foreground mt-1">Знакомься без ограничений</p>
                        </div>
                      </div>
                      <div className="p-4 pt-0">
                        {/* ИЗМЕНЕНО: orange→amber gradient вместо green.
                            Соответствует цветовой гамме Premium на твоих Blade-страницах. */}
                        <ButtonLink
                          href="/subscriptions/premium"
                          variant="default"
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                        >
                          <Star className="w-4 h-4 mr-2" /> Включить Премиум
                        </ButtonLink>
                      </div>
                    </>
                  )}
                </HoverCardContent>
              </HoverCard>

              {/* 4. ПРОФИЛЬ (Десктоп) */}
              <HoverCard>
                <HoverCardTrigger className="flex items-center gap-2 border border-border rounded-full py-1 pl-1 pr-3 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-foreground">Профиль</span>
                </HoverCardTrigger>
                <HoverCardContent className="w-60 p-1.5">
                  <a href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground transition-colors"><User className="w-4 h-4 text-muted-foreground" /> Мой профиль</a>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground transition-colors"><ImageIcon className="w-4 h-4 text-muted-foreground" /> Загрузить фото</a>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground transition-colors"><Settings className="w-4 h-4 text-muted-foreground" /> Настройки сайта</a>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground transition-colors"><CreditCard className="w-4 h-4 text-muted-foreground" /> Подписки</a>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground transition-colors"><Book className="w-4 h-4 text-muted-foreground" /> Дневник</a>

                  <div className="border-t border-border/50 my-1"></div>

                  <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm text-foreground transition-colors"><LifeBuoy className="w-4 h-4 text-muted-foreground" /> Помощь</a>

                  <div className="border-t border-border/50 my-1"></div>

                  <button onClick={logout} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive/10 text-sm text-destructive transition-colors w-full">
                    <LogOut className="w-4 h-4" /> Выход
                  </button>
                </HoverCardContent>
              </HoverCard>
            </div>

            {/* БУРГЕР ДЛЯ МОБИЛОК И ПЛАНШЕТОВ (Скрывается на lg и выше) - Иконка Аватар */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger className="rounded-full border border-border transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="w-8 h-8 rounded-full">
                    <AvatarImage src={user.avatar_url} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </SheetTrigger>

                <SheetContent side="right" className="w-full sm:max-w-sm p-0">
                  <div className="flex flex-col h-full">

                    <SheetHeader className="flex-shrink-0 border-b border-border pb-4">
                      <SheetTitle className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url} alt={user.name} />
                          <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-semibold text-foreground truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto scrollbar-hidden">

                      <div className="space-y-1">
                        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"><Heart className="w-5 h-5 text-muted-foreground" /> Знакомства</a>
                        <a href="/search" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"><Search className="w-5 h-5 text-muted-foreground" /> Поиск</a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"><MessageCircle className="w-5 h-5 text-muted-foreground" /> Сообщения</a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"><Layers className="w-5 h-5 text-muted-foreground" /> Подписки</a>
                      </div>

                      <div className="border-t border-border"></div>

                      <div className="space-y-1">
                        {/* ИЗМЕНЕНО: Кошелёк на мобиле показываем с реальным балансом,
                            кликабельно — открывает billing-modal через openBillingModal. */}
                        <button
                          onClick={() => openBillingModal()}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
                        >
                          <span className="flex items-center gap-3">
                            <Wallet className="w-5 h-5 text-muted-foreground" /> Кошелек
                          </span>
                          <span className="text-sm font-bold text-green-600">{formattedBalance} ед.</span>
                        </button>

                        {/* ИЗМЕНЕНО: VIP на мобиле — условный рендер.
                            Если активен — показываем плашку с датой.
                            Если нет — кнопку "Включить VIP" (blue gradient, как в Blade). */}
                        {user.has_active_vip ? (
                          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium">
                            <span className="flex items-center gap-3 text-blue-500">
                              <Gem className="w-5 h-5" /> VIP активен
                            </span>
                            {vipExpires && (
                              <span className="text-xs text-muted-foreground">до {vipExpires}</span>
                            )}
                          </div>
                        ) : (
                          <ButtonLink
                            href="/subscriptions/vip"
                            variant="link"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-blue-500 hover:bg-blue-500/10 transition-colors w-full justify-start"
                          >
                            <Gem className="w-5 h-5" /> Включить VIP статус
                          </ButtonLink>
                        )}

                        {/* ИЗМЕНЕНО: Premium на мобиле — условный рендер, как VIP. */}
                        {user.has_active_premium ? (
                          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium">
                            <span className="flex items-center gap-3 text-orange-500">
                              <Star className="w-5 h-5" /> Премиум активен
                            </span>
                            {premiumExpires && (
                              <span className="text-xs text-muted-foreground">до {premiumExpires}</span>
                            )}
                          </div>
                        ) : (
                          <ButtonLink
                            href="/subscriptions/premium"
                            variant="link"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-orange-500 hover:bg-orange-500/10 transition-colors w-full justify-start"
                          >
                            <Star className="w-5 h-5" /> Включить Премиум
                          </ButtonLink>
                        )}
                      </div>

                      <div className="border-t border-border"></div>

                      <div className="space-y-1">
                        <a href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"><User className="w-5 h-5 text-muted-foreground" /> Мой профиль</a>
                        {/* TODO(фичи): страницы загрузки фото и настроек ещё не реализованы —
                            ссылки-заглушки, обновить при появлении роутов */}
                        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"><ImageIcon className="w-5 h-5 text-muted-foreground" /> Загрузить фото</a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"><Settings className="w-4 h-4 text-muted-foreground" /> Настройки сайта</a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"><Book className="w-5 h-5 text-muted-foreground" /> Дневник</a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"><LifeBuoy className="w-5 h-5 text-muted-foreground" /> Помощь</a>
                      </div>
                    </div>

                    <SheetFooter className="flex-shrink-0 border-t border-border pt-4 px-4 pb-8">
                      <Button onClick={logout} variant="outline" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                        <LogOut className="w-5 h-5" /> Выход
                      </Button>
                    </SheetFooter>

                  </div>
                </SheetContent>
              </Sheet>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}