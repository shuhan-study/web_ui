import { fetchAllSubjects } from '@/utils/actions';
import SubjectCard from '@/components/subjects/SubjectCard';

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
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </div>
      )}
    </>
  );
}
