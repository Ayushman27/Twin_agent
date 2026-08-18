"use client";

interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
}: {
  data: T[];
  columns: Column<T>[];
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No records found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className="px-4 py-2 font-medium">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t border-border hover:bg-muted/50">
              {columns.map((c) => (
                <td key={c.header} className="px-4 py-2">{c.accessor(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
