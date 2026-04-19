import db from '@/utils/db';

export const fetchAllSubjects = () => {
  return db.subject.findMany({
    orderBy: { name: 'asc' },
  });
};
