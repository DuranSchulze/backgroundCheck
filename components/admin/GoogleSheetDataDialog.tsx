"use client";

import { Maximize2Icon, MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { stripColumnSuffix } from "@/lib/tracking/format";

type GoogleSheetDataDialogProps = {
  entries: Array<[string, string]>;
  iconOnly?: boolean;
};

export default function GoogleSheetDataDialog({
  entries,
  iconOnly = false,
}: GoogleSheetDataDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            title="View Google Sheet data"
            className="shrink-0 border-amber-200 bg-[#fffaf0] text-outline hover:border-primary hover:bg-white hover:text-on-surface"
          >
            <Maximize2Icon className="size-4" />
            <span className="sr-only">View Sheet Data</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5 inline-flex items-center gap-2 border-amber-200 bg-[#fffaf0] text-on-surface hover:bg-amber-50"
          >
            <MoreHorizontalIcon className="size-4" />
            Show more
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-4xl gap-4 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-amber-100 px-6 py-5">
          <DialogTitle className="text-xl text-on-surface">
            Full Google Sheet Data
          </DialogTitle>
          <DialogDescription>
            Raw field values from the matched Google Sheet row.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(85vh-7.5rem)] overflow-y-auto px-6 pb-6">
          <div className="space-y-2">
            {entries.map(([rawLabel, value]) => {
              const label = stripColumnSuffix(rawLabel);
              const isUpload = /\|upload-/i.test(rawLabel);

              return (
                <div
                  key={rawLabel}
                  className="overflow-x-auto rounded-xl border border-amber-100 bg-[#fffaf0] px-4 py-3"
                >
                  <div className="min-w-max whitespace-nowrap text-sm text-on-surface-variant">
                    <span className="font-bold uppercase tracking-[0.16em] text-outline">
                      {label}
                    </span>
                    <span className="mx-2 text-outline">•</span>
                    {isUpload ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {value}
                      </a>
                    ) : (
                      <span>{value}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
