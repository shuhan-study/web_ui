import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That page doesn&apos;t exist.
      </p>
      <p className="mt-8">
        <Link href="/grades" className="underline">
          Back to grades
        </Link>
      </p>
    </>
  );
}
