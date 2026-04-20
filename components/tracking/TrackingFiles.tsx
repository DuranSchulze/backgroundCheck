import { FileDown, FolderOpen } from "lucide-react";
import type { TrackingFile } from "@/lib/tracking/types";

interface TrackingFilesProps {
  files: TrackingFile[];
  folderUrl: string | null;
}

function formatBytes(size: string | null): string | null {
  if (!size) return null;
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function TrackingFiles({ files, folderUrl }: TrackingFilesProps) {
  if (files.length === 0 && !folderUrl) {
    return (
      <p className="text-sm leading-6 text-on-surface-variant">
        No files have been published to this case yet. Attached documents will
        appear here once they are uploaded to the client&apos;s Drive folder.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {folderUrl ? (
        <a
          href={folderUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container"
        >
          <FolderOpen className="h-4 w-4" />
          Open Drive Folder
        </a>
      ) : null}

      {files.length > 0 ? (
        <ul className="divide-y divide-outline-variant/20 overflow-hidden rounded-md border border-outline-variant/30 bg-white">
          {files.map((file) => {
            const size = formatBytes(file.size);
            const linkUrl = file.downloadUrl || file.viewUrl;
            return (
              <li
                key={file.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-on-surface">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-xs text-outline">
                    {[file.mimeType.replace(/^application\//, ""), size]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {linkUrl ? (
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-outline-variant/40 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container-low"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Open
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
