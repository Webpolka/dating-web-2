// app/(web)/billing/success/page.tsx
import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import { SuccessContent } from "./_components/successContent";

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100dvh-4rem)]" />}>
      <SuccessContent />
    </Suspense>
  );
}
