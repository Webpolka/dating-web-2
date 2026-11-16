// app/(web)/user/[slug]/_components/user-header.tsx
//
// ОБНОВЛЁННАЯ ВЕРСИЯ — убран хардкод зодиаков.
// Раньше тут были массивы ZODIAC_ICONS и ZODIAC_NAMES, и фронт сам маппил
// zodiacSign (число 1-12) на символ/название.
//
// Теперь backend отдаёт ГОТОВЫЕ значения через accessor-ы в UserProfile.php:
//   - zodiac_icon — символ "♈\uFE0E" (с форсированным текстовым рендером)
//   - zodiac_name — название "Овен"
//
// Фронт просто отображает то, что пришло с бэкенда. Никаких массивов на фронте.

'use client';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface UserHeaderProps {
  name: string;
  age: number | null;
  // NEW: zodiacIcon и zodiacName приходят с бэкенда через accessor-ы
  // в UserProfile.php (getZodiacIconAttribute, getZodiacNameAttribute).
  // Старый prop zodiacSign (число 1-12) убран — фронт больше не занимается
  // маппингом числа на символ/название.
  zodiacIcon?: string | null;
  zodiacName?: string | null;
  isVerified: boolean;
  className?: string;
}

export function UserHeader({
  name,
  age,
  zodiacIcon,
  zodiacName,
  isVerified,
  className,
}: UserHeaderProps) {
  return (
    // TooltipProvider нужен для Tooltip от shadcn
    <TooltipProvider delay={300}>
      <h1 className={cn("text-2xl font-bold text-foreground flex items-center gap-2.5 flex-wrap", className)}>

        {/* Иконка верификации (синий кружок с галочкой) */}
        {isVerified && (
          <Tooltip>
            <TooltipTrigger className="shrink-0 cursor-default">
              <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Верификация по фото пройдена</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Имя и возраст */}
        <span>{name}, {age ?? '?'}</span>

        {/* Знак зодиака — icon и name приходят с бэкенда.
            Иконка использует \uFE0E (форсированный текстовый рендер),
            поэтому не будет отображаться как цветное эмодзи. */}
        {zodiacIcon && (
          <Tooltip>
            <TooltipTrigger className="shrink-0 cursor-default">
              <span className="text-xl text-muted-foreground leading-none">
                {zodiacIcon}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{zodiacName}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </h1>
    </TooltipProvider>
  );
}