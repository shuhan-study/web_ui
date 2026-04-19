import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prisma = new PrismaClient();

const ALLOWED_CATEGORIES = ['Homework', 'Quiz', 'Test', 'Project'] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

type SeedAssignment = {
  name: string;
  score: number;
  max_score: number;
  date: string;
  category: string;
};
type SeedSubject = {
  id: string;
  name: string;
  teacher: string;
  current_grade: string;
  current_percent: number;
  assignments: SeedAssignment[];
};
type SeedData = {
  student: { name: string; school: string; grade: number };
  term: { name: string; start: string; end: string };
  subjects: SeedSubject[];
};

function isCategory(v: string): v is Category {
  return (ALLOWED_CATEGORIES as readonly string[]).includes(v);
}

async function main() {
  const seedPath = resolve(__dirname, '../data/seed/grades.json');

  let raw: string;
  try {
    raw = readFileSync(seedPath, 'utf-8');
  } catch {
    console.error(`Seed file not found at ${seedPath}.`);
    console.error('Expected shuhan rig to deliver grades.json via mayor reseed bead.');
    console.error('See PLAN.md § Cross-rig contract.');
    process.exit(1);
  }

  const data: SeedData = JSON.parse(raw);

  for (const subj of data.subjects) {
    for (const a of subj.assignments) {
      if (!isCategory(a.category)) {
        console.error(
          `Unknown category "${a.category}" in subject "${subj.id}" assignment "${a.name}". ` +
            `Allowed: ${ALLOWED_CATEGORIES.join(', ')}.`
        );
        process.exit(1);
      }
    }
  }

  const termFields = {
    name: data.term.name,
    start: new Date(data.term.start),
    end: new Date(data.term.end),
    studentName: data.student.name,
    studentSchool: data.student.school,
    studentGradeLevel: data.student.grade,
  };

  const term = await prisma.term.upsert({
    where: { id: 1 },
    update: termFields,
    create: { id: 1, ...termFields },
  });

  for (const subj of data.subjects) {
    const subjFields = {
      name: subj.name,
      teacher: subj.teacher,
      currentGrade: subj.current_grade,
      currentPercent: subj.current_percent,
      termId: term.id,
    };
    await prisma.subject.upsert({
      where: { id: subj.id },
      update: subjFields,
      create: { id: subj.id, ...subjFields },
    });

    for (const a of subj.assignments) {
      const date = new Date(a.date);
      await prisma.assignment.upsert({
        where: {
          subjectId_name_date: {
            subjectId: subj.id,
            name: a.name,
            date,
          },
        },
        update: {
          score: a.score,
          maxScore: a.max_score,
          category: a.category,
        },
        create: {
          subjectId: subj.id,
          name: a.name,
          date,
          score: a.score,
          maxScore: a.max_score,
          category: a.category,
        },
      });
    }
  }

  const termCount = await prisma.term.count();
  const subjectCount = await prisma.subject.count();
  const assignmentCount = await prisma.assignment.count();
  console.log(
    `Seeded: ${termCount} term, ${subjectCount} subjects, ${assignmentCount} assignments.`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
