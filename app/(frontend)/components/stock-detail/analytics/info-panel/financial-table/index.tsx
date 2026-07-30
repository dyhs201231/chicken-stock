"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { FinancialTableRow } from "../types";

type FinancialTableProps = {
  columns: string[];
  rows: FinancialTableRow[];
};

export default function FinancialTable({ columns, rows }: FinancialTableProps) {
  const tableColumns = useMemo<ColumnDef<FinancialTableRow>[]>(
    () => [
      {
        accessorKey: "item",
        header: "항목",
        cell: (info) => info.getValue(),
      },
      ...columns.map((column) => ({
        id: column,
        header: column,
        accessorFn: (row: FinancialTableRow) => row.values[column] ?? "-",
      })),
    ],
    [columns],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
      <table className="w-full min-w-112 table-fixed text-center text-xs md:min-w-full md:text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-2 pb-2 font-medium text-zinc-500 first:w-24 md:px-3 md:pb-3"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-2 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-500 first:text-left md:px-3"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
