import { cookies } from "next/headers";
import type { User } from "@/store/auth-store";

const API_INTERNAL = process.env.API_URL_INTERNAL || "http://localhost:8000";

export async function getServerUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const res = await fetch(`${API_INTERNAL}/api/me`, {
      headers: {
        cookie: cookieHeader,
        accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return null; // 401 = гость, всё честно
    }

    const data = (await res.json()) as { user?: User };
    return data.user ?? null;
  } catch {
    // Бэк недоступен = считаем гостем, не роняем страницу
    return null;
  }
}
