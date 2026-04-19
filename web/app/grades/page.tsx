import { fetchAllSubjects } from '@/utils/actions';
import SubjectCard from '@/components/subjects/SubjectCard';
import EmptyState from '@/components/global/EmptyState';

export default async function GradesPage() {
  const subjects = await fetchAllSubjects();

  return (
    <>
      <h1 className="text-3xl font-semibold">Grades</h1>
      {subjects.length === 0 ? (
        <EmptyState heading="No subjects yet. Check back after grades are loaded." />
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
