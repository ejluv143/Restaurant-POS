"use client";

import { useActionState, useRef, useState } from "react";
import { login } from "./actions";

type DemoAccounts = { password: string; accounts: { email: string; label: string }[] };

const FIELD =
  "w-full rounded-lg bg-surface-container-low border border-outline-variant/50 px-4 py-3 font-body-md text-body-lg text-on-surface placeholder:text-on-surface-variant/60 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 aria-invalid:border-error";

export default function LoginForm({ next, demo }: { next?: string; demo?: DemoAccounts }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const email = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);

  const fillDemo = (address: string) => {
    if (!email.current || !password.current || !demo) return;
    email.current.value = address;
    password.current.value = demo.password;
    password.current.focus();
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <form action={action} className="flex flex-col gap-space-md">
        {next && <input type="hidden" name="next" value={next} />}

        {state?.error && (
          <div id="login-error" role="alert" className="flex items-start gap-space-sm rounded-lg border border-error/40 bg-error-container/30 px-4 py-3 text-on-error-container">
            <span className="material-symbols-outlined text-[20px] text-error" aria-hidden>
              error
            </span>
            <p className="font-body-md text-body-md">{state.error}</p>
          </div>
        )}

        <div className="flex flex-col gap-space-xs">
          <label htmlFor="email" className="font-label-lg text-label-lg text-on-surface">
            Work email
          </label>
          <input
            ref={email}
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={254}
            autoFocus
            defaultValue={state?.email}
            placeholder="you@restaurant.com"
            aria-invalid={state?.error ? true : undefined}
            aria-describedby={state?.error ? "login-error" : undefined}
            className={FIELD}
          />
        </div>

        <div className="flex flex-col gap-space-xs">
          <label htmlFor="password" className="font-label-lg text-label-lg text-on-surface">
            Password
          </label>
          <div className="relative">
            <input
              ref={password}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              maxLength={256}
              aria-invalid={state?.error ? true : undefined}
              aria-describedby={[state?.error && "login-error", capsLock && "caps-lock"].filter(Boolean).join(" ") || undefined}
              onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onBlur={() => setCapsLock(false)}
              className={`${FIELD} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          {capsLock && (
            <p id="caps-lock" className="flex items-center gap-1 font-body-sm text-body-sm text-secondary">
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                keyboard_capslock
              </span>
              Caps Lock is on
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-space-sm inline-flex items-center justify-center gap-2 rounded-lg bg-primary-container px-6 py-3.5 font-label-lg text-label-lg font-bold text-on-primary-container shadow-md transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          <span className={`material-symbols-outlined text-[20px] ${pending ? "motion-safe:animate-spin" : ""}`} aria-hidden>
            {pending ? "progress_activity" : "login"}
          </span>
          {pending ? "Signing in…" : "Sign in"}
        </button>

        <p className="font-body-sm text-body-sm text-on-surface-variant text-center">Forgot your password? Ask your branch manager or restaurant admin to reset it.</p>
      </form>

      {demo && (
        <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low p-4">
          <p className="font-label-md text-label-md text-secondary uppercase">Development only: demo accounts</p>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Password for all: <code className="font-mono text-on-surface">{demo.password}</code>. Tap one to fill the form.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {demo.accounts.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fillDemo(a.email)}
                className="rounded-full border border-outline-variant/50 bg-surface-container px-3 py-1.5 font-label-md text-label-md text-on-surface hover:border-primary hover:text-primary transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
