"use client";

export function ConfirmDialog({
  open, title, description, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-5">
        <h2 className="font-medium mb-1">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-md border border-border">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-sm rounded-md bg-primary text-white">Confirm</button>
        </div>
      </div>
    </div>
  );
}
