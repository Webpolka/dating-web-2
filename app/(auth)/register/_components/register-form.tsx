// app/(auth)/register/_components/register-form.tsx
//
// Многошаговая регистрация (3 шага: профиль → цель знакомства → аккаунт).
// Константы даты рождения и цели знакомства — общие (lib/birthdate.ts,
// lib/profile-dating-config.ts), чтобы не расходиться с остальными формами.

'use client';

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { AxiosError } from "axios";

import { CityCombobox } from '@/components/ui/city-combobox';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { BIRTH_DAYS, BIRTH_MONTHS, BIRTH_YEARS, isRealDate } from "@/lib/birthdate";
import { DATING_GOALS } from "@/lib/profile-dating-config";

type Gender = "male" | "female" | "";
type Goal = "friends" | "romantic" | "family" | "casual" | "travel";

// Ответ шагов регистрации: step2 возвращает капчу, финальный — redirect
interface RegisterResponse {
  success?: boolean;
  redirect?: string;
  captchaImage?: string;
}

export function RegisterForm() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [captchaImage, setCaptchaImage] = useState("");

  // Префилл из URL (от модалки) — читаем прямо в начальном state,
  // а при изменении searchParams подхватываем через adjust-during-render
  const [form, setForm] = useState({
    name: searchParams.get("name") || "",
    gender: (searchParams.get("gender") as Gender) || "",
    birth_day: searchParams.get("birth_day") || "",
    birth_month: searchParams.get("birth_month") || "",
    birth_year: searchParams.get("birth_year") || "",
    dating_goals: [] as Goal[],
    city_id: "",
    country_id: "",
    city_label: "",
    email: "",
    password: "",
    captchaInput: "",
  });

  // Паттерн «adjust state during render»: searchParams изменился после монтирования
  // (например, переход из модалки регистрации) — обновляем префилл-поля
  const [prevParams, setPrevParams] = useState(searchParams);
  if (searchParams !== prevParams) {
    setPrevParams(searchParams);
    setForm((prev) => ({
      ...prev,
      name: searchParams.get("name") || "",
      gender: (searchParams.get("gender") as Gender) || "",
      birth_day: searchParams.get("birth_day") || "",
      birth_month: searchParams.get("birth_month") || "",
      birth_year: searchParams.get("birth_year") || "",
    }));
  }

  // Валидация даты на клиенте (чтобы не слать лишний раз на бэк)
  const isDateValid = useMemo(() => {
    return isRealDate(form.birth_day, form.birth_month, form.birth_year);
  }, [form.birth_day, form.birth_month, form.birth_year]);

  const fetchCaptcha = useCallback(async () => {
    setLoadingCaptcha(true);
    try {
      const res = await api.post<{ captchaImage: string }>("/register/captcha");
      if (res.data.captchaImage) {
        setCaptchaImage(res.data.captchaImage);
        setForm((prev) => ({ ...prev, captchaInput: "" }));
      }
    } catch (e) {
      console.error("Captcha refresh error", e);
    } finally {
      setLoadingCaptcha(false);
    }
  }, []);

  const toggleGoal = (goal: Goal) => {
    setForm((prev) => ({
      ...prev,
      dating_goals: prev.dating_goals.includes(goal)
        ? prev.dating_goals.filter((g) => g !== goal)
        : [...prev.dating_goals, goal],
    }));
  };

  // Универсальный метод отправки на бэк
  const sendRequest = async (
    url: string,
    payload: Record<string, unknown>,
    onSuccess: (data: RegisterResponse) => void,
  ) => {
    setLoading(true);
    setErrors({});

    try {
      const res = await api.post<RegisterResponse>(url, payload);
      if (res.data) {
        onSuccess(res.data);
      }
    } catch (error) {
      const err = error as AxiosError<{
        errors: Record<string, string[]>;
        captchaImage?: string;
      }>;
      if (err.response?.status === 422 && err.response.data.errors) {
        const formatted: Record<string, string> = {};
        for (const key in err.response.data.errors) {
          formatted[key] = err.response.data.errors[key][0];
        }
        setErrors(formatted);

        // Если бэк вернул новую капчу (при ошибке ввода)
        if (err.response.data.captchaImage) {
          setCaptchaImage(err.response.data.captchaImage);
          setForm((prev) => ({ ...prev, captchaInput: "" }));
        }
      } else {
        setErrors({ general: "Ошибка сервера. Попробуйте еще раз." });
      }
    } finally {
      setLoading(false);
    }
  };

  const submitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    // Шаг 1 валидирует только поля профиля — не шлём email/password/captcha,
    // которые ещё не заполнены
    sendRequest(
      "/register/step1",
      {
        name: form.name,
        gender: form.gender,
        birth_day: form.birth_day,
        birth_month: form.birth_month,
        birth_year: form.birth_year,
      },
      () => setStep(2),
    );
  };

  const submitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    sendRequest(
      "/register/step2",
      { dating_goals: form.dating_goals },
      (data) => {
        if (data.captchaImage) setCaptchaImage(data.captchaImage);
        setStep(3);
      },
    );
  };

  const submitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    sendRequest("/register", { ...form }, (data) => {
      if (data.redirect) {
        // Полная перезагрузка — сбрасываем состояние форм и сторы
        window.location.assign(data.redirect);
      }
    });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl items-center px-4 py-8 sm:px-6">
      <div className="flex w-full flex-col bg-background text-foreground lg:flex-row lg:items-stretch">
        {/* ЛЕВАЯ КОЛОНКА (форма) */}
        <div className="mx-auto flex w-full max-w-md flex-col justify-center lg:mx-0 lg:max-w-none lg:w-[448px] lg:flex-none lg:border-r lg:border-border lg:pr-8">
          {/* Прогресс-бар */}
          <div className="mx-auto mb-8 flex w-full max-w-[240px] flex-col items-center gap-2">
            <div className="flex w-full items-center gap-2">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? "bg-green-600" : "bg-muted"}`}
              ></div>
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? "bg-green-600" : "bg-muted"}`}
              ></div>
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 3 ? "bg-green-600" : "bg-muted"}`}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground">Шаг {step} из 3</p>
          </div>

          <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">
            Регистрация
          </h1>

          {/* ЭТАП 1 */}
          {step === 1 && (
            <form onSubmit={submitStep1} className="w-full space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Имя
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  placeholder="Введите ваше имя"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Ваш пол
                </Label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, gender: "male" })}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 outline-none transition-all duration-200 ${
                      form.gender === "male"
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:bg-accent hover:border-muted-foreground/20"
                    }`}
                  >
                    <svg
                      className="h-12 w-12 sm:h-14 sm:w-14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="12" cy="6" r="4" />
                      <path d="M12 10v10M8 14h8" />
                    </svg>
                    <span
                      className={`text-sm font-medium ${form.gender === "male" ? "text-primary" : "text-foreground"}`}
                    >
                      Мужской
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, gender: "female" })}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 outline-none transition-all duration-200 ${
                      form.gender === "female"
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:bg-accent hover:border-muted-foreground/20"
                    }`}
                  >
                    <svg
                      className="h-12 w-12 sm:h-14 sm:w-14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="12" cy="6" r="4" />
                      <path d="M8 10l-2 10h12l-2-10" />
                    </svg>
                    <span
                      className={`text-sm font-medium ${form.gender === "female" ? "text-primary" : "text-foreground"}`}
                    >
                      Женский
                    </span>
                  </button>
                </div>
                {errors.gender && (
                  <p className="text-sm text-destructive">{errors.gender}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  День рождения
                </Label>
                <div className="grid w-full grid-cols-3 gap-2">
                  <Select
                    value={form.birth_day}
                    onValueChange={(val) =>
                      setForm({ ...form, birth_day: val ?? "" })
                    }
                  >
                    <SelectTrigger className="w-full bg-input border-border">
                      <SelectValue placeholder="День" />
                    </SelectTrigger>
                    <SelectContent
                      side="top"
                      align="end"
                      className="max-h-[24rem] overflow-y-auto"
                    >
                      {BIRTH_DAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={form.birth_month}
                    onValueChange={(val) =>
                      setForm({ ...form, birth_month: val ?? "" })
                    }
                  >
                    <SelectTrigger className="w-full bg-input border-border">
                      <SelectValue placeholder="Месяц">
                        {/* Если месяц выбран, ищем его название по индексу, иначе показываем плейсхолдер */}
                        {form.birth_month 
                          ? BIRTH_MONTHS[parseInt(form.birth_month) - 1] 
                          : "Месяц"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      side="top"
                      align="end"
                      className="max-h-[24rem] overflow-y-auto"
                    >
                      {BIRTH_MONTHS.map((m, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={form.birth_year}
                    onValueChange={(val) =>
                      setForm({ ...form, birth_year: val ?? "" })
                    }
                  >
                    <SelectTrigger className="w-full bg-input border-border">
                      <SelectValue placeholder="Год" />
                    </SelectTrigger>
                    <SelectContent
                      side="top"
                      align="end"
                      className="max-h-[24rem] overflow-y-auto"
                    >
                      {BIRTH_YEARS.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.birth_day && (
                  <p className="text-sm text-destructive">{errors.birth_day}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !(form.name && form.gender && isDateValid)}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Далее"
                )}
              </Button>
            </form>
          )}

          {/* ЭТАП 2 */}
          {step === 2 && (
            <form onSubmit={submitStep2} className="w-full space-y-4">
              <h2 className="text-center text-lg font-medium text-muted-foreground">
                Цель знакомства
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 sm:gap-4">
                {/* Цели знакомства — общий конфиг (lib/profile-dating-config.ts) */}
                {DATING_GOALS.map((goal) => (
                  <button
                    key={goal.key}
                    type="button"
                    onClick={() => toggleGoal(goal.key as Goal)}
                    className={`col-span-1 sm:col-span-2 flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 outline-none transition-all duration-200 ${
                      form.dating_goals.includes(goal.key as Goal)
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:bg-accent hover:border-muted-foreground/20"
                    }`}
                  >
                    <svg
                      className="h-10 w-10 sm:h-12 sm:w-12"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={goal.icon}
                      />
                    </svg>
                    <span
                      className={`text-center text-sm font-medium ${form.dating_goals.includes(goal.key as Goal) ? "text-primary" : "text-foreground"}`}
                    >
                      {goal.label}
                    </span>
                  </button>
                ))}
              </div>
              {errors.dating_goals && (
                <p className="text-center text-sm text-destructive">
                  {errors.dating_goals}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Назад
                </Button>
                <Button
                  type="submit"
                  disabled={loading || form.dating_goals.length === 0}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Далее"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ЭТАП 3 */}
          {step === 3 && (
            <form onSubmit={submitRegister} className="w-full space-y-4">
              <h2 className="text-center text-base font-medium text-muted-foreground">
                Последний этап
              </h2>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Город
                </Label>
                <CityCombobox 
                  className="w-full max-w-none"                  
                  value={{ id: form.city_id || form.country_id, type: form.country_id ? 'country' : 'city', label: form.city_label }} 
                  onChange={(val) => setForm(prev => ({ 
                    ...prev, 
                    city_id: val.type === 'city' ? val.id : '',
                    country_id: val.type === 'country' ? val.id : '',
                    city_label: val.label
                  }))} 
                />
                {errors.city_id && (
                  <p className="text-sm text-destructive">{errors.city_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Почта
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="Введите вашу почту"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Пароль
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="Создайте пароль"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Символы на картинке
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-2 w-[16rem] shrink-0">
                    <div className="flex relative h-10 min-w-0 flex-1 bg-[#dcdee4] items-center justify-center overflow-hidden rounded-md border border-border">
                      {captchaImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={captchaImage}
                          alt="Капча"
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={fetchCaptcha}
                      disabled={loadingCaptcha}
                      title="Обновить картинку"
                    >
                      {loadingCaptcha ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-6 w-6" />
                      )}
                    </Button>
                  </div>
                  <div className="min-w-[6.5rem]">
                    <Input
                      value={form.captchaInput}
                      onChange={(e) =>
                        setForm({ ...form, captchaInput: e.target.value })
                      }
                      placeholder="Введите код"
                      required
                      className="w-[7rem]"
                    />
                  </div>
                </div>
                {errors.captchaInput && (
                  <p className="text-sm text-destructive">
                    {errors.captchaInput}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={loading}
                >
                  Назад
                </Button>
                <Button
                  type="submit"
                    disabled={
                    loading ||
                    !(
                      (form.city_id || form.country_id) && // Проверяем, что город или страна выбраны
                      form.email &&
                      form.password &&
                      form.captchaInput
                    )
                  }
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Зарегистрироваться"
                  )}
                </Button>
              </div>
            </form>
          )}

          {errors.general && (
            <p className="text-center text-sm text-destructive mt-4">
              {errors.general}
            </p>
          )}

          {/* Футер страницы */}
          <div className="mt-6 flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-yellow-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
              <span>Регистрация через Google недоступна</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground/70">
              Регистрируясь, вы принимаете{" "}
              <a href="/a-conditions" className="underline hover:no-underline">
                условия пользовательского соглашения
              </a>{" "}
              и даете согласие на обработку{" "}
              <a href="/personal_data" className="underline hover:no-underline">
                персональных данных
              </a>
            </p>            
          </div>
        </div>
      </div>
    </div>
  );
}
