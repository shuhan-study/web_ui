import type { Assignment } from '@prisma/client';

const CATEGORY_ORDER = ['Homework', 'Quiz', 'Test', 'Project'] as const;

function CategoryBreakdown({
  assignments,
}: {
  assignments: Assignment[];
}) {
  const rows = CATEGORY_ORDER.map((cat) => {
    const subset = assignments.filter((a) => a.category === cat);
    if (subset.length === 0) return null;
    const score = subset.reduce((s, a) => s + a.score, 0);
    const max = subset.reduce((s, a) => s + a.maxScore, 0);
    return {
      category: cat,
      score,
      max,
      percent: (score / max) * 100,
      count: subset.length,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return null;

  return (
    <dl className="grid gap-3">
      {rows.map((r) => (
        <div
          key={r.category}
          className="flex items-baseline justify-between"
        >
          <dt className="font-medium">{r.category}</dt>
          <dd className="text-sm text-muted-foreground tabular-nums">
            {r.score}/{r.max}
            <span className="ml-2 text-foreground">
              {r.percent.toFixed(1)}%
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default CategoryBreakdown;
