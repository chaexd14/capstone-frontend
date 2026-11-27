"use client";

import * as React from "react";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Section } from "@/components/ui/section";
import { CollectionToolbar, type CollectionFilterValues } from "@/components/ui/toolbar";

const DEFAULT_FILTERS: CollectionFilterValues = {
  status: "ALL",
  score: "any",
  sort: "newest",
};

export default function ResponsiveFiltersLabPage() {
  const [tab, setTab] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState(DEFAULT_FILTERS);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Object.entries(filters).some(([key, value]) => value !== DEFAULT_FILTERS[key]);

  const resetFilters = () => {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader>
          <div>
            <PageHeaderTitle>Responsive collection filters</PageHeaderTitle>
            <PageHeaderDescription>
              Canonical desktop toolbar and staged mobile filter sheet.
            </PageHeaderDescription>
          </div>
        </PageHeader>

        <Section>
          <CollectionToolbar
            label="Candidate collection controls"
            tabs={
              <FilterTabs
                label="Candidate status"
                value={tab}
                onValueChange={setTab}
                tabs={[
                  { id: "all", label: "All", count: 148 },
                  { id: "review", label: "In review", count: 23 },
                  { id: "shortlist", label: "Shortlisted", count: 8 },
                ]}
              />
            }
            search={
              <SearchInput
                aria-label="Search candidate collection"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onClear={() => setSearch("")}
                placeholder="Search candidates…"
                containerClassName="w-full md:w-64"
              />
            }
            filterFields={[
              {
                id: "status",
                label: "Application status",
                value: filters.status,
                defaultValue: DEFAULT_FILTERS.status,
                options: [
                  { value: "ALL", label: "All statuses" },
                  { value: "UNDER_REVIEW", label: "Under review" },
                  { value: "SHORTLISTED", label: "Shortlisted" },
                ],
              },
              {
                id: "score",
                label: "Minimum match score",
                value: filters.score,
                defaultValue: DEFAULT_FILTERS.score,
                triggerClassName: "w-44",
                options: [
                  { value: "any", label: "Any match score" },
                  { value: "85", label: "85%+ (Strong)" },
                  { value: "70", label: "70%+ (Good+)" },
                ],
              },
              {
                id: "sort",
                label: "Sort candidates",
                value: filters.sort,
                defaultValue: DEFAULT_FILTERS.sort,
                triggerClassName: "w-44",
                options: [
                  { value: "newest", label: "Newest applied" },
                  { value: "score", label: "Highest AI match" },
                ],
              },
            ]}
            onFilterValuesChange={setFilters}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={resetFilters}
          />

          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            Applied: {filters.status}, {filters.score}, {filters.sort}
          </p>
        </Section>
      </div>
    </main>
  );
}
