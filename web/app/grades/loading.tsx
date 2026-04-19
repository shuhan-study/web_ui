export default function Loading() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Grades</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card shadow-sm animate-pulse"
          >
            <div className="flex flex-col space-y-1.5 p-6">
              <div className="h-6 w-2/3 rounded-md bg-muted" />
              <div className="h-4 w-1/2 rounded-md bg-muted" />
            </div>
            <div className="p-6 pt-0">
              <div className="h-10 w-24 rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
