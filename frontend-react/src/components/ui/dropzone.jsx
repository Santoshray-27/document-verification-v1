import React from 'react';
import { UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function DropzoneShell({
  isDragOver = false,
  fileName,
  fileSize,
  acceptHint = 'PDF, PNG, JPG up to 10 MB',
  className,
  children,
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-8 md:p-12 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center',
        isDragOver
          ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
          : 'border-border hover:border-amber-500/60 bg-card/60 hover:bg-card',
        className
      )}
    >
      {fileName ? (
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="font-medium text-foreground text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-muted-foreground" />
            {fileName}
          </div>
          {fileSize && (
            <div className="text-xs text-muted-foreground mt-0.5">{fileSize}</div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="h-14 w-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-4 ring-1 ring-border group-hover:scale-105 transition-transform">
            <UploadCloud className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Drag and drop your document here, or <span className="text-amber-600 dark:text-amber-400 underline underline-offset-2">browse</span>
          </p>
          <p className="text-xs text-muted-foreground">{acceptHint}</p>
        </div>
      )}
      {children}
    </div>
  );
}
