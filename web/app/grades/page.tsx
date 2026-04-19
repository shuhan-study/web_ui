import { fetchAllSubjects } from '@/utils/actions';

export default async function GradesPage() {
  const subjects = await fetchAllSubjects();

  return (
    <>
      <h1 className="text-3xl font-semibold">Grades</h1>
      {subjects.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No subjects yet. Run <code>npm run seed</code>.
        </p>
      ) : (
        <ul className="mt-4 space-y-1">
          {subjects.map((s) => (
            <li key={s.id}>
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground"> — {s.teacher}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
