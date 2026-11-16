// app/(billing)/layout.tsx
import { WebNavigation } from "@/components/layout/navigations/web-navigation";

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <WebNavigation />
      <main className="flex-1">{children}</main>
    </div>
  );
}
