// app/(web)/user/[slug]/page.tsx
import { Suspense } from "react";
import { UserClient } from "./_components/user-profile-client";
import { Loader } from "@/components/ui/loader";

// Делаем функцию async и ожидаем params
export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<Loader className="min-h-[calc(100dvh-4rem)]" />}>
      <UserClient slug={slug} />
    </Suspense>
  );
}
