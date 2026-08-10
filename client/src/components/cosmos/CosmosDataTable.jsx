export default function CosmosDataTable({ columns, data, onRowClick, loading, emptyMessage = 'Sin datos' }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return <p className="text-center text-white/50 py-8 text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-jarvis-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-jarvis-surface text-xs uppercase tracking-widest text-jarvis-gold/70">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-medium">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={`border-t border-jarvis-border/50 ${onRowClick ? 'cursor-pointer hover:bg-jarvis-elevated/50' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
