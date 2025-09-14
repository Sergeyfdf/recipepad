import React, { useEffect, useRef } from "react";
import type { TgUser } from "../lib/tgAuth";

declare global { interface Window { onTelegramAuth?: (user: TgUser) => void } }

export default function TelegramLoginButton({
  botName,
  size = "large",
  onAuth,
}: {
  botName: string;         // без @, например "recipepad_bot"
  size?: "large" | "medium" | "small";
  onAuth: (user: TgUser) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ЕДИНСТВЕННОЕ место, где объявляем window.onTelegramAuth
    window.onTelegramAuth = (user: TgUser) => {
      console.log("[widget] onTelegramAuth user:", user);
      onAuth(user);
    };

    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", botName);
    s.setAttribute("data-size", size);
    s.setAttribute("data-userpic", "true");
    s.setAttribute("data-onauth", "onTelegramAuth(user)");
    s.setAttribute("data-request-access", "write");
    s.setAttribute("data-radius", "8");
    s.setAttribute("data-lang", "ru");
    ref.current?.appendChild(s);

    return () => {
      delete window.onTelegramAuth;
      if (s.parentNode) s.parentNode.removeChild(s);
    };
  }, [botName, size, onAuth]);

  return <div ref={ref} />;
}
