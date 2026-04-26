import db from '@/utils/db';

export const fetchAllSubjects = async () => {
  const rows = await db.subject.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { assignments: true } } },
  });
  return rows.map(({ _count, ...subject }) => ({
    ...subject,
    hasAssignments: _count.assignments > 0,
  }));
};

export const fetchSubjectById = (id: string) => {
  return db.subject.findUnique({
    where: { id },
    include: {
      assignments: {
        orderBy: { date: 'asc' },
      },
    },
  });
};
