"use client";

import { useActionState } from "react";
import { type RegisterFormState, registerAction } from "./actions";

const initialState: RegisterFormState = { errors: [] };

const fields = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "username" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
] as const;

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {fields.map((field) => {
        const error = state.errors.find((item) => item.field === field.name)?.message;
        return (
          <label key={field.name} className="flex flex-col gap-1 text-sm">
            {field.label}
            <input
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              defaultValue={field.name === "password" ? undefined : state.values?.[field.name]}
              required
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
            />
            {error && <span className="text-red-600">{error}</span>}
          </label>
        );
      })}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Create account
      </button>
    </form>
  );
}
