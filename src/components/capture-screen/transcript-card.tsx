'use client';

import { type ChangeEvent, type DragEvent, useRef } from 'react';

import { Button } from '@/components/ui/button/button';
import { Card } from '@/components/ui/card/card';
import { Icon } from '@/components/ui/icon/icon';
import { Spinner } from '@/components/ui/spinner/spinner';
import { Eyebrow } from '@/components/ui/typography/eyebrow';
import { TRANSCRIPT_FILE_ACCEPT } from '@/constants/workflow';
import { cn } from '@/lib/utils/cn';
import type { WorkflowStatus } from '@/types/workflow.types';

export interface TranscriptCardProps {
  transcript: string;
  wordCount: number;
  status: WorkflowStatus;
  error: string;
  onTranscriptChange: (text: string) => void;
  onFile: (file: File) => void;
  onLoadSample: () => void;
  onClear: () => void;
  onSummarise: () => void;
  className?: string;
}

/** Transcript input card — prototype `.kx-transcript-card` (3630–3696). */
export function TranscriptCard({
  transcript,
  wordCount,
  status,
  error,
  onTranscriptChange,
  onFile,
  onLoadSample,
  onClear,
  onSummarise,
  className,
}: TranscriptCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  const processing = status === 'processing';

  return (
    <Card
      className={cn(
        'max-bp900:p-[16px] max-bp560:p-[14px] flex min-h-0 flex-1 flex-col p-[18px_20px]',
        className,
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="max-bp560:gap-[8px] mb-[10px] flex shrink-0 flex-wrap items-center justify-between gap-[12px]">
        <Eyebrow inline>Transcript</Eyebrow>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            iconStart="UploadCloud"
            iconSize={13}
            onClick={() => fileInputRef.current?.click()}
          >
            Attach file
          </Button>
          <Button variant="ghost" iconStart="FileText" iconSize={13} onClick={onLoadSample}>
            Load sample
          </Button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={TRANSCRIPT_FILE_ACCEPT}
        className="hidden"
        onChange={handleInputChange}
      />
      <textarea
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        spellCheck={false}
        placeholder="Paste a meeting transcript, drop a .txt/.vtt file, or attach one…"
        className="rounded-btn border-border bg-transcript-bg text-text focus:border-green max-bp560:p-[12px] max-bp560:text-[12px] min-h-0 min-h-[180px] w-full min-w-0 flex-1 resize-none border p-[16px] font-mono text-[12.5px] leading-[1.6] transition-colors outline-none focus:bg-white"
      />
      {status === 'error' && (
        <div className="rounded-btn border-rust/40 bg-rust-tint mt-3 flex items-start gap-2 border p-[10px]">
          <Icon name="AlertTriangle" size={16} className="text-rust" />
          <span className="text-rust text-[12px]">{error}</span>
        </div>
      )}
      <div className="max-bp560:gap-[8px] mt-[12px] flex shrink-0 flex-wrap items-center justify-between gap-[12px]">
        <span className="text-muted text-[12px]">{wordCount} words</span>
        <div className="inline-flex items-center gap-[10px]">
          <Button
            variant="ghost"
            disabled={!transcript}
            onClick={onClear}
            className="px-[18px]! py-[10px]! text-[12px] font-semibold! tracking-[0.04em] uppercase"
          >
            Clear
          </Button>
          <Button
            variant="primary"
            disabled={!transcript.trim() || processing}
            onClick={onSummarise}
          >
            {processing ? <Spinner size={16} /> : <Icon name="Sparkles" size={16} />}
            Summarise
          </Button>
        </div>
      </div>
    </Card>
  );
}
