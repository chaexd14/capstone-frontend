"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <section role="alert" className="w-full max-w-lg rounded-2xl bg-card p-8 text-center shadow-md sm:p-10">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-rose-50 text-destructive">
          <AlertCircle className="size-5" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">This page could not finish loading</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Your session is safe. Try loading the page again, or return home and continue from there.
        </p>
        <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline"><Link href="/">Return home</Link></Button>
          <Button type="button" onClick={reset}>Try again</Button>
        </div>
      </section>
    </main>
  );
}
