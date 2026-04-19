import { notFound } from 'next/navigation';
import { fetchSubjectById } from '@/utils/actions';

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
      <p className="mt-8 text-sm text-muted-foreground">
        {subject.assignments.length} assignments recorded.
      </p>
    </>
  );
}
