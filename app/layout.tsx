// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppProvider } from "@/components/providers/app-provider";
import { AuthHydrator } from "@/components/providers/auth-hydrator";
import { getServerUser } from "@/lib/server-auth";
import { Toaster } from "sonner";

import { LoginModal } from "@/components/modals/auth/login-modal";
import { ForgotPasswordModal } from "@/components/modals/auth/forgot-password-modal";
import { RegisterModal } from "@/components/modals/auth/register-modal";
import { GiftModal } from "@/components/modals/billing/gift-modal";
import { GiftCheckoutModal } from "@/components/modals/billing/gift-checkout-modal";
import { BillingModal } from "@/components/modals/billing/billing-modal";
import { VipModal } from "@/components/modals/billing/vip-modal";
import { PremiumModal } from "@/components/modals/billing/premium-modal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dating App",
  description: "Знакомства онлайн",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${inter.className} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          {/* Гидратор строго ПЕРЕД AppProvider: его эффект сработает первым */}
          <AuthHydrator user={user} />
          <AppProvider>
            {children}

            <LoginModal />
            <ForgotPasswordModal />
            <RegisterModal />

            <GiftModal />
            <GiftCheckoutModal />
            <BillingModal />
            <PremiumModal />
            <VipModal />

            <Toaster expand={true} richColors position="top-right" />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
