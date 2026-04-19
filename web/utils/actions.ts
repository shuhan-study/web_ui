import db from '@/utils/db';

export const fetchAllSubjects = () => {
  return db.subject.findMany({
    orderBy: { name: 'asc' },
  });
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
