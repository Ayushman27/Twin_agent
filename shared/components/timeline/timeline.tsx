interface TimelineItem {
  id: string;
  label: string;
  timestamp: string;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative border-l border-border ml-2">
      {items.map((item) => (
        <li key={item.id} className="ml-4 mb-4">
          <div className="absolute w-2 h-2 rounded-full bg-primary -left-1 mt-1.5" />
          <p className="text-sm">{item.label}</p>
          <p className="text-xs text-muted-foreground">{item.timestamp}</p>
        </li>
      ))}
    </ol>
  );
}
