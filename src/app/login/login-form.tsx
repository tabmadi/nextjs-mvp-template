"use client";

import { useActionState } from "react";
import { type LoginFormState, loginAction } from "./actions";

const initialState: LoginFormState = { error: null };

const fields = [
  { name: "email", label: "Email", type: "email", autoComplete: "username" },
  { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
] as const;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {fields.map((field) => (
        <label key={field.name} className="flex flex-col gap-1 text-sm">
          {field.label}
          <input
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
          />
        </label>
      ))}
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Sign in
      </button>
    </form>
  );
}
