"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Shield } from "lucide-react";
import { Application } from "@/types/application";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRecruiter } from "@/context/RecruiterContext";

interface AllApplicantsViewProps {
  onSelectApplication: (app: Application) => void;
}

export function AllApplicantsView({ onSelectApplication }: AllApplicantsViewProps) {
  const { applications, anonymize } = useRecruiter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "SHORTLISTED" && app.status !== "SHORTLISTED") return false;
        if (
          statusFilter === "IN_REVIEW" &&
          app.status !== "UNDER_REVIEW" &&
          app.status !== "PROCESSING"
        )
          return false;
        if (statusFilter === "REJECTED" && app.status !== "REJECTED") return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (app.applicant_name && app.applicant_name.toLowerCase().includes(q)) ||
        (app.candidate_code && app.candidate_code.toLowerCase().includes(q)) ||
        (app.job_title && app.job_title.toLowerCase().includes(q)) ||
        (app.email && app.email.toLowerCase().includes(q)) ||
        (app.phone && app.phone.includes(q))
      );
    });
  }, [applications, searchQuery, statusFilter]);

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "SHORTLISTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "UNDER_REVIEW":
      case "PROCESSING":
        return "bg-blue-50 text-[#1976D2] border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Canvas-Level Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: "ALL", label: "All Candidates" },
              { id: "SHORTLISTED", label: "Shortlisted" },
              { id: "IN_REVIEW", label: "In Review" },
              { id: "REJECTED", label: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {anonymize && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-[#1976D2] border border-blue-100">
              Demographics Masked
            </span>
          )}
        </div>

        {/* Search & Count */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono hidden md:inline">
            {filteredApplications.length} candidate{filteredApplications.length === 1 ? "" : "s"}
          </span>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm bg-white shadow-2xs focus:outline-none focus:border-[#2196F3] focus:ring-4 focus:ring-[#2196F3]/10 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Single Surface Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700 w-[120px]">Candidate ID</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Applicant &amp; Contact</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Applied Position</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-center w-[140px]">AI Match Score</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-center w-[140px]">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right w-[140px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                  {searchQuery || statusFilter !== "ALL"
                    ? "No applicants found matching your filter criteria."
                    : "No candidate applications recorded yet."}
                </TableCell>
              </TableRow>
            ) : (
              filteredApplications.map((app) => {
                const score = app.match_result?.match_score || 0;
                return (
                  <TableRow
                    key={app.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectApplication(app)}
                    className="cursor-pointer hover:bg-blue-50/30 transition-colors focus-visible:outline-none focus-visible:bg-blue-50/50"
                  >
                    <TableCell className="font-mono font-bold text-xs text-[#1976D2] tabular-nums">
                      {app.candidate_code || `#${app.id}`}
                    </TableCell>

                    <TableCell>
                      {anonymize ? (
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-xs text-slate-800 font-mono">
                            {app.candidate_code || `Applicant #${app.id}`}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-xs text-slate-900 block">
                            {app.applicant_name || `Applicant #${app.id}`}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {app.email || "No email"} &bull; {app.phone || "No phone"}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-slate-700">
                      <Link
                        href={`/admin/jobs/${app.job}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#1976D2] hover:text-[#1565C0] hover:underline font-semibold"
                      >
                        {app.job_title || `Job Requisition #${app.job}`}
                      </Link>
                    </TableCell>

                    <TableCell className="text-center font-mono font-extrabold text-xs text-slate-900 tabular-nums">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                        {score}%
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadgeClass(
                          app.status
                        )}`}
                      >
                        {app.status.replace(/_/g, " ")}
                      </span>
                    </TableCell>

                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectApplication(app)}
                        className="h-8 px-3 text-xs font-semibold text-[#1976D2] border-blue-200 bg-blue-50/50 hover:bg-[#2196F3] hover:text-white hover:border-[#2196F3] transition-all rounded-lg cursor-pointer"
                      >
                        View Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
