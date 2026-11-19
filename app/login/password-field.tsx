"use client";

import { useRef, useState } from "react";

export function PasswordField() {
  const [visible, setVisible] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  function insertCaret() {
    const input = passwordRef.current;
    if (!input) return;

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (input.value.length - (end - start) < input.maxLength) {
      input.setRangeText("^", start, end, "end");
    }
    input.focus();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <label className="field-label" htmlFor="password">Mot de passe DSI de secours</label>
        <button
          type="button"
          className="text-sm font-medium text-slate-700 underline"
          aria-controls="password"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        </button>
      </div>
      <input
        ref={passwordRef}
        className="field-input"
        id="password"
        name="password"
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        maxLength={256}
      />
      <button type="button" className="mt-2 text-sm font-medium text-slate-700 underline" onClick={insertCaret}>
        Insérer ^
      </button>
    </div>
  );
}
