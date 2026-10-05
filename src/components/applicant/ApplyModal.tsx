"use client";

import React, { useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Job } from "@/types/job";
import { Application } from "@/types/application";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/api";

interface ApplyModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (app: Application) => void;
}

export function ApplyModal({ job, isOpen, onClose, onSuccess }: ApplyModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<Application | null>(null);

  if (!job) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "docx", "doc", "txt"].includes(ext || "")) {
        setError("Please upload a .pdf, .docx, or .txt resume file.");
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setError("File size exceeds the 10MB limit.");
        return;
      }
      setError(null);
      setFile(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a resume file to upload.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("resume", file);

    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${job.id}/apply/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.resume?.[0] || "Failed to submit application");
      }

      const applicationData: Application = await response.json();
      setSuccessResult(applicationData);
      onSuccess(applicationData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error submitting application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessResult(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setFile(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
      <DialogContent onClose={handleResetAndClose} className="max-w-2xl">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-border space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {job.department}
            </Badge>
            <span className="text-sm text-muted-foreground">{job.location}</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl">{job.title}</DialogTitle>
          <DialogDescription className="text-sm">
            Submit your resume for instant qualification matching and explainable scoring evaluation.
          </DialogDescription>
        </DialogHeader>

        {/* Success View */}
        {successResult ? (
          <div className="py-6 text-center space-y-5">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">Application Successfully Submitted</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your resume was parsed, anonymized, and screened against this role&apos;s benchmarks.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card text-left space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Candidate Reference:</span>
                <span className="font-mono font-bold text-primary text-base">{successResult.candidate_code}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Initial Status:</span>
                <Badge variant="secondary" className="text-xs font-semibold">{successResult.status}</Badge>
              </div>
              {successResult.match_result && (
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-semibold flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Match Score:
                    </span>
                    <span className="font-bold text-foreground font-mono text-lg">
                      {successResult.match_result.match_score}%
                    </span>
                  </div>
                  {successResult.match_result.matched_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {successResult.match_result.matched_skills.slice(0, 6).map((s, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs font-normal">
                          ✓ {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button onClick={handleResetAndClose} size="lg" className="w-full text-sm font-semibold">
              Done & View Status
            </Button>
          </div>
        ) : (
          /* Application Form */
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {error && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-semibold">First Name *</Label>
                <Input
                  id="first_name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Juan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-semibold">Last Name *</Label>
                <Input
                  id="last_name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Dela Cruz"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. juan@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +63 912 345 6789"
                />
              </div>
            </div>

            {/* Resume Upload Dropzone */}
            <div className="space-y-2 pt-1">
              <Label className="text-sm font-semibold">Resume / CV File (.pdf, .docx, .txt) *</Label>
              <label className="relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 cursor-pointer transition group">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  required
                  onChange={handleFileChange}
                  className="sr-only"
                />
                {file ? (
                  <div className="flex items-center gap-3 text-foreground">
                    <FileText className="h-7 w-7 text-primary" />
                    <div className="text-left">
                      <div className="text-sm font-semibold">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB · File Ready
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition mb-2" />
                    <div className="text-sm font-medium text-foreground">Click or drop resume file here</div>
                    <div className="text-xs text-muted-foreground mt-1">PDF or DOCX documents up to 10MB</div>
                  </>
                )}
              </label>
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" size="default" onClick={handleResetAndClose}>
                Cancel
              </Button>
              <Button type="submit" size="default" disabled={submitting || !file} className="font-semibold">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing & Submitting...</span>
                  </>
                ) : (
                  <span>Submit Application</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
