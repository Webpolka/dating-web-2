// app/(web)/_components/interest-multi-select.tsx
//
// Мультиселект интересов: chips выбранных + Popover с поиском и группировкой
// по категориям. Используется в SearchPanel (расширенный поиск) и в секции
// «Интересы» редактирования профиля.
//
// Данные: GET /api/interests через lib/interests.ts — там же нормализация
// ответа (любой формат → категории с интересами) и кэш на страницу.
// Типы: lib/api-types.ts (InterestCategory, Interest).

"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check, Plus, X,
  Palette, Dumbbell, Music, Film, Plane, Utensils, BookOpen, Gamepad2,
  Theater, Laptop, PawPrint, Car, Footprints, Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InterestCategory } from "@/lib/api-types";
import { fetchInterestCategories } from "@/lib/interests";

// Маппинг slug категории → иконка lucide (под 14 категорий из сидера API)
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hobbi: Palette,
  sport: Dumbbell,
  music: Music,
  kino: Film,
  travel: Plane,
  food: Utensils,
  books: BookOpen,
  games: Gamepad2,
  art: Theater,
  tech: Laptop,
  animals: PawPrint,
  auto: Car,
  dance: Footprints,
  health: Heart,
};

interface InterestMultiSelectProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export function InterestMultiSelect({
  selectedIds,
  onChange,
}: InterestMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<InterestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchInterestCategories()
      .then((groups) => {
        if (cancelled) return;
        setCategories(groups);
        setError(groups.length === 0 ? "Справочник интересов пуст" : null);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Не удалось загрузить интересы");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Словарь ID → имя (для отображения chips без поиска по категориям)
  const interestMap = useMemo(() => {
    const map = new Map<number, { name: string; category: string }>();
    for (const cat of categories) {
      for (const interest of cat.interests) {
        map.set(interest.id, { name: interest.name, category: cat.name });
      }
    }
    return map;
  }, [categories]);

  const removeInterest = (id: number) => {
    onChange(selectedIds.filter((i) => i !== id));
  };

  const label = loading
    ? "Загрузка..."
    : selectedIds.length > 0
      ? `Выбрано: ${selectedIds.length}`
      : "Выбрать интересы";

  return (
    <div>
      <Label className="text-sm font-medium text-muted-foreground block mb-1.5">
        Интересы
      </Label>

      {/* Выбранные интересы — chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto">
          {selectedIds.map((id) => {
            const info = interestMap.get(id);
            return (
              <Badge
                key={id}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                {info?.name || `#${id}`}
                <button
                  type="button"
                  onClick={() => removeInterest(id)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label="Убрать"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
              disabled={loading}
            />
          }
        >
          {label}
          <Plus className="w-4 h-4 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[440px] p-0" align="start">
          <Command shouldFilter={true}>
            <CommandInput placeholder="Поиск интереса..." />
            <CommandList>
              <CommandEmpty>
                {error || "Ничего не найдено. Попробуйте изменить запрос."}
              </CommandEmpty>
              <ScrollArea className="h-[340px]">
                {/* Группы по категориям — заголовки секций с иконкой */}
                {categories.map((cat) => {
                  if (cat.interests.length === 0) return null;
                  const Icon = CATEGORY_ICONS[cat.slug] || Plus;
                  return (
                    <CommandGroup
                      key={cat.id}
                      heading={
                        <span className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                          {cat.name}
                        </span>
                      }
                    >
                      {cat.interests.map((interest) => (
                        <CommandItem
                          key={interest.id}
                          value={`${interest.name} ${cat.name}`}
                          onSelect={() => {
                            if (selectedIds.includes(interest.id)) {
                              onChange(selectedIds.filter((i) => i !== interest.id));
                            } else {
                              onChange([...selectedIds, interest.id]);
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedIds.includes(interest.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span className="flex-1">{interest.name}</span>
                          {interest.users_count !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {interest.users_count}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
