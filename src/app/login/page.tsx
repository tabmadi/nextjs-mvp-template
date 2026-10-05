import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <LoginForm />
      <a href="/register" className="text-sm underline">
        Create an account
      </a>
    </main>
  );
}
