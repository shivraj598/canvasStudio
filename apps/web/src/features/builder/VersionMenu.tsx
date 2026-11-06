import type { Project } from '@canvas/shared';
import { Check, History } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { timeAgo } from '../../lib/utils';

export function VersionMenu({
  project,
  onRestore,
  disabled,
}: {
  project: Project;
  onRestore(versionId: string): void;
  disabled: boolean;
}) {
  const current = project.versions.find((v) => v.id === project.currentVersionId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={project.versions.length === 0}
          aria-label="Version history"
        >
          <History />
          <span className="hidden lg:inline">{current ? `v${current.number}` : 'History'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Version history</DropdownMenuLabel>
        <div className="scrollbar-thin max-h-80 overflow-y-auto">
          {[...project.versions].reverse().map((v) => {
            const isCurrent = v.id === project.currentVersionId;
            return (
              <DropdownMenuItem
                key={v.id}
                disabled={disabled && !isCurrent}
                onSelect={() => !isCurrent && onRestore(v.id)}
                className="items-start"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-muted font-mono text-[11px] font-medium">
                  {v.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{v.summary}</span>
                  <span className="text-xs text-muted-foreground">
                    {isCurrent ? 'Current · ' : 'Click to restore · '}
                    {timeAgo(v.createdAt)}
                  </span>
                </span>
                {isCurrent && <Check className="mt-1" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
