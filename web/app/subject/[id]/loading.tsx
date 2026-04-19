export default function Loading() {
  return (
    <>
      <div className="h-9 w-48 rounded-md bg-muted animate-pulse" />
      <div className="mt-2 h-5 w-64 rounded-md bg-muted animate-pulse" />
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Assignments</h2>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-md bg-muted animate-pulse"
            />
          ))}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">By category</h2>
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between"
            >
              <div className="h-5 w-20 rounded-md bg-muted animate-pulse" />
              <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
