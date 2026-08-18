export function TwinCompleteness({ percent }: { percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>Twin Completeness</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
