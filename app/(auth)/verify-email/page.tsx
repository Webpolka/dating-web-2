// app/(auth)/verify-email/page.tsx
// Server Component — обёртка с Suspense вокруг клиентской формы.

import { Suspense } from "react";
import { VerifyEmailForm } from "./_components/verify-email-form";
import { Loader } from "@/components/ui/loader";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loader className="min-h-[calc(100dvh-4rem)]" />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
