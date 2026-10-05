import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <RegisterForm />
      <a href="/login" className="text-sm underline">
        Sign in to an existing account
      </a>
    </main>
  );
}
