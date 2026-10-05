const layers = [
  { path: "src/app/", holds: "pages, route handlers, server actions", role: "transport" },
  { path: "src/server/services/", holds: "one use case each", role: "orchestration" },
  { path: "src/server/repositories/", holds: "database reads and writes", role: "persistence" },
  { path: "src/server/db/", holds: "schema and client", role: "persistence" },
  {
    path: "src/server/domain/",
    holds: "business rules, pure",
    role: "the part that outlives this repo",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Next.js MVP Template</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          One product, one deployable, one team. Replace this page.
        </p>
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        {layers.map((layer) => (
          <div
            key={layer.path}
            className="flex flex-col gap-1 bg-zinc-50 px-4 py-3 dark:bg-zinc-900"
          >
            <code className="font-mono text-sm text-zinc-900 dark:text-zinc-100">{layer.path}</code>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {layer.holds}: {layer.role}
            </span>
          </div>
        ))}
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        The decisions behind this layout are in <code className="font-mono">docs/adr</code>. Run{" "}
        <code className="font-mono">mise run check</code> before you finish a change.
      </p>
    </main>
  );
}
