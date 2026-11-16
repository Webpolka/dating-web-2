// app/subscription/vip/page.tsx
import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import { VipPageClient } from "./_components/vipPageClient";

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100dvh-4rem)]" />}>
      <VipPageClient />
    </Suspense>
  );
}
