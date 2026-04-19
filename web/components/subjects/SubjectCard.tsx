import type { Subject } from '@prisma/client';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <article className="group">
      <Link href={`/subject/${subject.id}`}>
        <Card className="transition-shadow group-hover:shadow-xl">
          <CardHeader>
            <CardTitle>{subject.name}</CardTitle>
            <CardDescription>{subject.teacher}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold">
                {subject.currentGrade}
              </span>
              <span className="text-sm text-muted-foreground">
                {subject.currentPercent.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </article>
  );
}

export default SubjectCard;
