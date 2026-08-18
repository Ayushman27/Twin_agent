import { PageHeader } from "@/components/layout/page-header";

/**
 * Generic placeholder used by every route in Phase 1 so the full
 * information architecture is navigable end-to-end. Replace with
 * real feature components phase by phase (see README / phases).
 */
export function PageStub({
  title,
  description,
  bullets = [],
}: {
  title: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
        <p className="mb-3">This section will contain:</p>
        <ul className="list-disc list-inside space-y-1">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
