// app/(web)/user/[slug]/_components/self-portrait.tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function UserSelfPortrait({ text }: { text?: string | string[] | null }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!text) return null;

  const textStr = Array.isArray(text) ? text.join('\n') : text;
  const trimmedText = textStr.trim();
  if (!trimmedText) return null;

  // Если текст короткий, не показываем кнопку "Читать далее"
  const isLong = trimmedText.length > 150;

  return (
    <div className="mb-6">
      <h3 className="text-base font-medium text-accent-foreground mb-2">Автопортрет</h3>
      
      {isLong ? (
        <div>
          <p className={`text-sm text-muted-foreground italic whitespace-pre-line ${!isOpen ? 'line-clamp-2' : ''}`}>
            {trimmedText}
          </p>
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="ml-auto text-blue-500 text-xs font-medium hover:underline mt-0.5 flex items-center gap-1"
          >
            {isOpen ? 'Свернуть' : 'Читать далее'}
            {isOpen ? <ChevronUp className="w-2 h-2" /> : <ChevronDown className="w-2 h-2" />}
          </button>
        </div>
      ) : (
        <p className="text-base text-muted-foreground italic whitespace-pre-line">
          {trimmedText}
        </p>
      )}
    </div>
  );
}