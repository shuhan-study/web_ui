import type { Assignment } from '@prisma/client';
import EmptyState from '@/components/global/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function AssignmentsTable({
  assignments,
}: {
  assignments: Assignment[];
}) {
  if (assignments.length === 0) {
    return <EmptyState heading="No assignments yet." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Assignment</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => {
          const percent = (a.score / a.maxScore) * 100;
          return (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {a.date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                })}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {a.category}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {a.score}/{a.maxScore}
                <span className="ml-2 text-muted-foreground">
                  ({percent.toFixed(1)}%)
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default AssignmentsTable;
