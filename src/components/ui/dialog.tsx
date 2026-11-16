"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({ className, ...props }, ref) => <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in", className)} {...props} />);
DialogOverlay.displayName = "DialogOverlay";

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> { onClose?: () => void; hideClose?: boolean; }
const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(({ className, children, onClose, hideClose = false, ...props }, ref) => <DialogPortal><DialogOverlay /><DialogPrimitive.Content ref={ref} className={cn("fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-2xl bg-card p-6 shadow-md outline-none sm:p-8", className)} {...props}>{children}{!hideClose ? <DialogPrimitive.Close onClick={onClose} className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/15"><X className="size-4" /><span className="sr-only">Close dialog</span></DialogPrimitive.Close> : null}</DialogPrimitive.Content></DialogPortal>);
DialogContent.displayName = "DialogContent";
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("shrink-0 space-y-2 pr-8 text-left", className)} {...props} />;
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex shrink-0 flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end", className)} {...props} />;
const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn("text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl", className)} {...props} />);
DialogTitle.displayName = "DialogTitle";
const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />);
DialogDescription.displayName = "DialogDescription";

export { Dialog, DialogTrigger, DialogPortal, DialogClose, DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
