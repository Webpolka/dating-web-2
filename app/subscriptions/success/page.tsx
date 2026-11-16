// app/subscription/success/page.tsx
// Сервер-компонент с Suspense wrapper (нужен из-за useSearchParams в App Router)

import { Suspense } from "react";
import { SubscriptionSuccessContent } from "./_components/subscription-success-content";

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center text-muted-foreground">
          Загрузка...
        </div>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
