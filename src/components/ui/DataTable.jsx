import React from 'react';

export const DataTable = ({ columns, data, className = '' }) => {
    return (
        <div className={`w-full overflow-x-auto ${className}`}>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-[#161b22] text-[#6e7681] text-[11px] uppercase tracking-wider font-medium border-y border-[var(--border-default)]">
                        {columns.map((col, idx) => (
                            <th key={idx} className="h-9 px-4 align-middle whitespace-nowrap">
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="h-12 text-center text-[var(--text-muted)] text-13px border-b border-[var(--border-muted)]">
                                No data available
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIdx) => (
                            <tr
                                key={row.id || rowIdx}
                                className={`
                  h-9 bg-transparent hover:bg-[#1c2128] border-b border-[var(--border-muted)] text-[13px] transition-colors duration-100 ease-in-out
                  ${rowIdx % 2 === 0 ? 'bg-white/[0.02]' : ''}
                `}
                            >
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} className="px-4 align-middle whitespace-nowrap text-[var(--text-primary)]">
                                        {col.render ? col.render(row) : row[col.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;
