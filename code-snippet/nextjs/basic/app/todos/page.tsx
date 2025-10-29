// app/todos/page.tsx
'use client';

import { FC } from "react";
import { useStore } from "@/app/store";
import { useTranslations } from "@/app/hooks/useTranslations";

const Todos: FC = () => {
  const { t } = useTranslations();
  
  const logout = useStore((state: any) => state.logout);
  const {
    user,
  } = useStore();
  
  return (
    <div>
      <h1>welcome todos</h1>
      <span>{JSON.stringify(user)}</span>
      <button onClick={logout}>
        {t('logout')}
      </button>
    </div>
  );
}

export default Todos;