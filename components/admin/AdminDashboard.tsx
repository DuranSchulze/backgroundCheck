"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  ClipboardCheck,
  Grid2X2,
  ListFilter,
  MapPin,
  Table2,
  UserSearch,
} from "lucide-react";
import Input from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getCheckedColumnDetails } from "@/lib/tracking/format";
import Badge from "@/components/ui/badge";
import type { SheetOrderSnapshot } from "@/lib/tracking/types";

type AdminDashboardProps = {
  rows: SheetOrderSnapshot[];
};

type ViewMode = "table" | "card";
type FilterMode = "all" | "with-checks" | "metro-manila" | "outside-metro";

const PAGE_SIZE = 12;

function matchesFilter(row: SheetOrderSnapshot, filterMode: FilterMode) {
  if (filterMode === "with-checks") {
    return row.selectedCheckCategories.length > 0;
  }

  if (filterMode === "metro-manila") {
    return /metro manila/i.test(row.areaOfCheck);
  }

  if (filterMode === "outside-metro") {
    return (
      row.areaOfCheck.trim().length > 0 &&
      !/metro manila/i.test(row.areaOfCheck)
    );
  }

  return true;
}

function matchesSearch(row: SheetOrderSnapshot, searchTerm: string) {
  if (!searchTerm) {
    return true;
  }

  const haystack = [
    row.trackingNumber,
    row.submitterName,
    row.submitterEmail,
    row.subjectName,
    row.subjectEmail,
    row.companyName,
    row.purpose,
    row.areaOfCheck,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(searchTerm.toLowerCase());
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
}

export default function AdminDashboard({ rows }: AdminDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const withChecks = rows.filter(
    (r) => r.selectedCheckCategories.length > 0,
  ).length;
  const metroCount = rows.filter((r) =>
    /metro manila/i.test(r.areaOfCheck),
  ).length;
  const outsideMetro = rows.filter(
    (r) =>
      r.areaOfCheck.trim().length > 0 && !/metro manila/i.test(r.areaOfCheck),
  ).length;

  const filteredRows = useMemo(() => {
    return rows.filter(
      (row) => matchesFilter(row, filterMode) && matchesSearch(row, searchTerm),
    );
  }, [filterMode, rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);

  function updateFilter(nextFilter: FilterMode) {
    setFilterMode(nextFilter);
    setCurrentPage(1);
  }

  function updateSearch(value: string) {
    setSearchTerm(value);
    setCurrentPage(1);
  }

  const stats: Array<{
    label: string;
    value: number;
    filter: FilterMode;
    icon: React.ReactNode;
  }> = [
    {
      label: "Total Cases",
      value: rows.length,
      filter: "all",
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      label: "With Checks",
      value: withChecks,
      filter: "with-checks",
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      label: "Metro Manila",
      value: metroCount,
      filter: "metro-manila",
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      label: "Outside Metro",
      value: outsideMetro,
      filter: "outside-metro",
      icon: <MapPin className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Interactive stat-filter strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const active = filterMode === stat.filter;
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => updateFilter(stat.filter)}
              className={[
                "border p-4 text-left transition-colors",
                active
                  ? "border-on-surface bg-on-surface"
                  : "border-outline-variant/20 bg-white hover:border-on-surface/40 hover:bg-surface-container-low",
              ].join(" ")}
            >
              <div
                className={[
                  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]",
                  active ? "text-white/70" : "text-outline",
                ].join(" ")}
              >
                {stat.icon}
                {stat.label}
              </div>
              <div
                className={[
                  "mt-3 font-headline text-3xl font-extrabold",
                  active ? "text-white" : "text-on-surface",
                ].join(" ")}
              >
                {stat.value}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + controls + table/cards all in one panel */}
      <div className="border border-outline-variant/20 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-outline-variant/20 p-4 xl:flex-row xl:items-center xl:gap-4">
          <div className="flex-1">
            <Input
              value={searchTerm}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search tracking number, name, email, company or purpose…"
              leftIcon={<UserSearch className="h-4 w-4" />}
              className="h-10 border border-outline-variant/20"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative flex items-center">
              <ListFilter className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-outline" />
              <select
                value={filterMode}
                onChange={(event) =>
                  updateFilter(event.target.value as FilterMode)
                }
                className="appearance-none border border-outline-variant/30 bg-white py-2.5 pl-8 pr-7 text-xs font-bold uppercase tracking-[0.18em] text-on-surface outline-none transition-colors focus:border-on-surface"
              >
                <option value="all">All Cases</option>
                <option value="with-checks">With Checks</option>
                <option value="metro-manila">Metro Manila</option>
                <option value="outside-metro">Outside Metro</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-outline" />
            </div>

            <div className="flex items-center gap-0.5 border border-outline-variant/20 bg-surface-container-low p-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table view"
                className={[
                  "inline-flex items-center justify-center p-2 transition-colors",
                  viewMode === "table"
                    ? "bg-on-surface text-white"
                    : "text-on-surface-variant hover:text-on-surface",
                ].join(" ")}
              >
                <Table2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                title="Card view"
                className={[
                  "inline-flex items-center justify-center p-2 transition-colors",
                  viewMode === "card"
                    ? "bg-on-surface text-white"
                    : "text-on-surface-variant hover:text-on-surface",
                ].join(" ")}
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between gap-3 bg-surface-container-low px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className="font-semibold text-on-surface">
              {paginatedRows.length}
            </span>
            of
            <span className="font-semibold text-on-surface">
              {filteredRows.length}
            </span>
            cases
            {filterMode !== "all" || searchTerm ? (
              <button
                type="button"
                onClick={() => {
                  updateFilter("all");
                  updateSearch("");
                }}
                className="ml-2 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <span className="text-[10px] uppercase tracking-[0.16em] text-outline">
            Page {safeCurrentPage} / {totalPages}
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          {filteredRows.length === 0 ? (
            <div className="border border-dashed border-outline-variant/30 px-6 py-14 text-center text-sm text-on-surface-variant">
              No cases matched the current search and filter settings.
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-outline-variant/20">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container-low text-left text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                    <th className="px-4 py-3">Tracking #</th>
                    <th className="px-4 py-3">Company / Purpose</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Requestor</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Checks</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {paginatedRows.map((row) => {
                    const checks = getCheckedColumnDetails(row.rawFields);
                    return (
                      <tr
                        key={row.trackingNumber}
                        className="align-top transition-colors hover:bg-surface-container-low/60"
                      >
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm font-bold text-on-surface">
                            {row.trackingNumber}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {row.companyName ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 shrink-0 text-outline" />
                              <span className="text-sm font-semibold text-on-surface">
                                {row.companyName}
                              </span>
                            </div>
                          ) : null}
                          {row.purpose ? (
                            <div className="mt-1 text-xs text-on-surface-variant">
                              {row.purpose}
                            </div>
                          ) : !row.companyName ? (
                            <span className="text-sm text-outline">—</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-on-surface">
                            {row.subjectName || "—"}
                          </div>
                          {row.subjectEmail ? (
                            <div className="mt-0.5 text-xs text-on-surface-variant">
                              {row.subjectEmail}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-on-surface">
                            {row.submitterName || "—"}
                          </div>
                          {row.submitterEmail ? (
                            <div className="mt-0.5 text-xs text-on-surface-variant">
                              {row.submitterEmail}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          {row.areaOfCheck ? (
                            <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-outline" />
                              {row.areaOfCheck}
                            </div>
                          ) : (
                            <span className="text-sm text-outline">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {checks.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {checks.map((check) => (
                                <Badge
                                  key={check.label}
                                  status="processing"
                                  label={check.label}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-outline">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/orders/${encodeURIComponent(row.trackingNumber)}`}
                            className="inline-flex rounded-md border border-on-surface bg-on-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-on-surface/85"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paginatedRows.map((row) => {
                const checks = getCheckedColumnDetails(row.rawFields);
                return (
                  <div
                    key={row.trackingNumber}
                    className="flex flex-col rounded-lg border border-outline-variant/20 bg-white"
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between gap-3 border-b border-outline-variant/20 bg-surface-container-low px-4 py-3">
                      <span className="font-mono text-sm font-bold text-on-surface">
                        {row.trackingNumber}
                      </span>
                      <span className="border border-outline-variant/30 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                        {checks.length}{" "}
                        {checks.length === 1 ? "check" : "checks"}
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="flex flex-1 flex-col gap-4 p-4">
                      {row.companyName ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-outline" />
                          <span className="text-sm font-semibold text-on-surface">
                            {row.companyName}
                          </span>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3 border-t border-outline-variant/10 pt-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                            Subject
                          </div>
                          <div className="mt-1 text-sm font-semibold text-on-surface">
                            {row.subjectName || "—"}
                          </div>
                          {row.subjectEmail ? (
                            <div className="mt-0.5 text-[11px] text-on-surface-variant">
                              {row.subjectEmail}
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                            Requestor
                          </div>
                          <div className="mt-1 text-sm font-semibold text-on-surface">
                            {row.submitterName || "—"}
                          </div>
                          {row.submitterEmail ? (
                            <div className="mt-0.5 text-[11px] text-on-surface-variant">
                              {row.submitterEmail}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {row.purpose || row.areaOfCheck ? (
                        <div className="space-y-1.5 border-t border-outline-variant/10 pt-3">
                          {row.purpose ? (
                            <div className="text-[11px] text-on-surface-variant">
                              <span className="font-bold uppercase tracking-[0.14em] text-outline">
                                Purpose ·{" "}
                              </span>
                              {row.purpose}
                            </div>
                          ) : null}
                          {row.areaOfCheck ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                              <MapPin className="h-3 w-3 shrink-0 text-outline" />
                              {row.areaOfCheck}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {checks.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 border-t border-outline-variant/10 pt-3">
                          {checks.map((check) => (
                            <Badge
                              key={check.label}
                              status="processing"
                              label={check.label}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Card footer */}
                    <div className="border-t border-outline-variant/20 px-4 py-3">
                      <Link
                        href={`/admin/orders/${encodeURIComponent(row.trackingNumber)}`}
                        className="inline-flex rounded-md border border-on-surface bg-on-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-on-surface/85"
                      >
                        Open Case →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="border-t border-outline-variant/20 p-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage((page) => Math.max(1, page - 1));
                    }}
                    aria-disabled={safeCurrentPage === 1}
                    className={
                      safeCurrentPage === 1
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>

                {pageNumbers.map((pageNumber, index) => {
                  const previous = pageNumbers[index - 1];
                  const shouldRenderEllipsis =
                    previous !== undefined && pageNumber - previous > 1;

                  return (
                    <div key={pageNumber} className="flex items-center">
                      {shouldRenderEllipsis ? (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : null}
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          isActive={safeCurrentPage === pageNumber}
                          onClick={(event) => {
                            event.preventDefault();
                            setCurrentPage(pageNumber);
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    </div>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage((page) => Math.min(totalPages, page + 1));
                    }}
                    aria-disabled={safeCurrentPage === totalPages}
                    className={
                      safeCurrentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </div>
    </div>
  );
}
