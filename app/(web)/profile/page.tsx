// app/(web)/profile/page.tsx
// Сервер-компонент — просто рендерит клиентский компонент.
// Страница "Мой профиль" — авторизованный пользователь редактирует свои данные.
import { ProfileEditClient } from "./_components/profile-edit-client";

export default function ProfilePage() {
  return <ProfileEditClient />;
}
