"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronDown,
  Grid2X2,
  ListFilter,
  Search,
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

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
              <BriefcaseBusiness className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
                Background Operations
              </p>
              <h2 className="mt-2 font-headline text-2xl font-extrabold text-on-surface md:text-3xl">
                Background Check Status Management
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-on-surface-variant">
                Monitor incoming requests, inspect case intake details, and move
                into each order&apos;s progress workspace from one operational
                queue.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
            Queue Snapshot
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-3xl font-headline font-extrabold text-on-surface">
                {rows.length}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-outline">
                Total Cases
              </div>
            </div>
            <div>
              <div className="text-3xl font-headline font-extrabold text-on-surface">
                {
                  rows.filter((row) => row.selectedCheckCategories.length > 0)
                    .length
                }
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-outline">
                With Checks
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-outline">
              <Search className="h-4 w-4 text-primary" />
              Search
            </div>
            <Input
              value={searchTerm}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search by tracking number, email, subject, company, or purpose"
              leftIcon={<UserSearch className="h-4 w-4" />}
              className="h-12 rounded-[1.2rem] border-amber-200"
            />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="relative flex items-center">
              <ListFilter className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-primary" />
              <select
                value={filterMode}
                onChange={(event) =>
                  updateFilter(event.target.value as FilterMode)
                }
                className="appearance-none rounded-full border border-amber-200 bg-white py-2.5 pl-8 pr-7 text-xs font-bold uppercase tracking-[0.18em] text-on-surface outline-none transition-colors focus:border-primary"
              >
                <option value="all">All Cases</option>
                <option value="with-checks">With Checks</option>
                <option value="metro-manila">Metro Manila</option>
                <option value="outside-metro">Outside Metro</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-outline" />
            </div>

            <div className="flex items-center gap-0.5 rounded-full border border-amber-200 bg-[#fffaf0] p-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table view"
                className={[
                  "inline-flex items-center justify-center rounded-full p-2 transition-colors",
                  viewMode === "table"
                    ? "bg-primary text-[color:var(--color-on-primary)]"
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
                  "inline-flex items-center justify-center rounded-full p-2 transition-colors",
                  viewMode === "card"
                    ? "bg-primary text-[color:var(--color-on-primary)]"
                    : "text-on-surface-variant hover:text-on-surface",
                ].join(" ")}
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-amber-100 bg-[#fffaf0] px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <ListFilter className="h-4 w-4 text-primary" />
            Showing{" "}
            <span className="font-semibold text-on-surface">
              {paginatedRows.length}
            </span>
            of{" "}
            <span className="font-semibold text-on-surface">
              {filteredRows.length}
            </span>
            filtered cases
          </div>
          <div className="text-xs uppercase tracking-[0.18em] text-outline">
            Page {safeCurrentPage} of {totalPages}
          </div>
        </div>

        <div className="mt-6">
          {viewMode === "table" ? (
            <div className="overflow-x-auto rounded-[1.6rem] border border-amber-100">
              <table className="min-w-full divide-y divide-amber-100 bg-white">
                <thead className="bg-[#fffaf0]">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                    <th className="px-6 py-4">Tracking Number</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Requestor Email</th>
                    <th className="px-6 py-4">Checks Needed</th>
                    <th className="px-6 py-4">Area</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {paginatedRows.map((row) => (
                    <tr key={row.trackingNumber} className="align-top">
                      <td className="px-6 py-4 text-sm font-semibold text-on-surface">
                        {row.trackingNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        <div className="font-semibold text-on-surface">
                          {row.subjectName || "Not provided"}
                        </div>
                        <div className="mt-1">
                          {row.subjectEmail || "No subject email"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {row.submitterEmail || "Not provided"}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const checks = getCheckedColumnDetails(row.rawFields);
                          return checks.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {checks.map((check) => (
                                <div
                                  key={check.label}
                                  className="flex flex-col gap-0.5"
                                >
                                  <Badge
                                    status="processing"
                                    label={check.label}
                                  />
                                  <span className="text-[11px] text-on-surface-variant">
                                    {check.value
                                      .replace(/-/g, " ")
                                      .replace(/–/g, "–")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-outline">—</span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {row.areaOfCheck || "Not provided"}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/orders/${encodeURIComponent(row.trackingNumber)}`}
                          className="inline-flex rounded-full border border-[#f0ca52] bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--color-on-primary)] transition-colors hover:bg-primary-container"
                        >
                          Open Case
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedRows.map((row) => (
                <div
                  key={row.trackingNumber}
                  className="rounded-[1.6rem] border border-amber-100 bg-white p-5 shadow-[0_10px_30px_rgba(66,44,0,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                        Tracking Number
                      </p>
                      <h3 className="mt-2 font-headline text-lg font-bold text-on-surface">
                        {row.trackingNumber}
                      </h3>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-[#fffaf0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                      {row.selectedCheckCategories.length} checks
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-on-surface-variant">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">
                        Subject
                      </div>
                      <div className="mt-1 font-semibold text-on-surface">
                        {row.subjectName || "Not provided"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">
                        Requestor
                      </div>
                      <div className="mt-1">
                        {row.submitterEmail || "Not provided"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">
                        Checks Needed
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(() => {
                          const checks = getCheckedColumnDetails(row.rawFields);
                          return checks.length > 0 ? (
                            checks.map((check) => (
                              <div
                                key={check.label}
                                className="inline-flex flex-col gap-1 rounded-2xl border border-primary-fixed-dim bg-primary-fixed px-3 py-2"
                              >
                                <Badge
                                  status="processing"
                                  label={check.label}
                                />
                                <span className="text-[11px] font-medium text-on-surface-variant">
                                  {check.value
                                    .replace(/-/g, " ")
                                    .replace(/–/g, "–")}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-outline">
                              No checks selected
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/orders/${encodeURIComponent(row.trackingNumber)}`}
                    className="mt-5 inline-flex rounded-full border border-[#f0ca52] bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--color-on-primary)] transition-colors hover:bg-primary-container"
                  >
                    Open Case
                  </Link>
                </div>
              ))}
            </div>
          )}

          {filteredRows.length === 0 ? (
            <div className="rounded-[1.6rem] border border-amber-100 bg-[#fffaf0] px-6 py-12 text-center text-sm text-on-surface-variant">
              No cases matched the current search and filter settings.
            </div>
          ) : null}
        </div>

        {totalPages > 1 ? (
          <div className="mt-8">
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
      </section>
    </div>
  );
}
