import { notFound } from 'next/navigation';
import { fetchSubjectById } from '@/utils/actions';
import AssignmentsTable from '@/components/assignments/AssignmentsTable';
import CategoryBreakdown from '@/components/assignments/CategoryBreakdown';

export default async function SubjectPage({
  params,
}: {
  params: { id: string };
}) {
  const subject = await fetchSubjectById(params.id);
  if (!subject) notFound();

  return (
    <>
      <h1 className="text-3xl font-semibold">{subject.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {subject.teacher} · {subject.currentGrade} ·{' '}
        {subject.currentPercent.toFixed(1)}%
      </p>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Assignments</h2>
        <AssignmentsTable assignments={subject.assignments} />
      </section>
      {subject.assignments.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">By category</h2>
          <CategoryBreakdown assignments={subject.assignments} />
        </section>
      )}
    </>
  );
}
