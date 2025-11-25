import { FC } from "react"
import { MomUiRun } from "@/lib/mom/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RunCardProps {
  run: MomUiRun
  onOpen: (runId: string) => void
  onDelete?: (runId: string) => void
}

const statusLabel: Record<MomUiRun["status"], string> = {
  pending: "Queued",
  generating: "Generating",
  completed: "Completed",
  failed: "Failed",
}

export const RunCard: FC<RunCardProps> = ({ run, onOpen, onDelete }) => {
  const dateLabel = (() => {
    const date = new Date(run.createdAt)
    return isNaN(date.getTime()) ? run.createdAt : date.toLocaleDateString()
  })()

  return (
    <Card className="border border-slate-800 bg-mm-card/80 rounded-2xl overflow-hidden flex flex-col shadow-mm-soft transition-transform transition-colors hover:-translate-y-[2px] hover:border-mm-primary/60 hover:bg-mm-card/90">
      <div className="flex gap-1 bg-slate-900/60 p-2">
        {run.thumbnails.slice(0, 3).map((src, idx) => (
          <div
            key={idx}
            className="relative w-1/3 aspect-[9/16] overflow-hidden rounded-xl"
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
        {run.thumbnails.length === 0 && (
          <div className="h-[120px] w-full rounded-xl bg-slate-900/60 flex items-center justify-center text-xs text-slate-500">
            No preview yet
          </div>
        )}
      </div>

      <div className="p-3 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-sm line-clamp-2">{run.topic}</h3>
            <p className="text-[0.7rem] text-slate-400 mt-1">
              {dateLabel} • {run.postCount} posts • {run.aspectRatio}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Badge
              className={cn(
                "text-[0.65rem]",
                run.status === "completed" && "bg-mm-success/20 text-green-300",
                run.status === "generating" && "bg-mm-secondary/20 text-mm-secondarySoft",
                run.status === "failed" && "bg-mm-error/20 text-mm-error",
                run.status === "pending" && "bg-slate-700/60 text-slate-200",
              )}
            >
              {statusLabel[run.status]}
            </Badge>
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => onDelete(run.id)}
                title="Delete run"
              >
                ×
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="border-slate-700 text-[0.6rem]">
              {run.audience.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="border-slate-700 text-[0.6rem]">
              {run.llmModel === "openrouter-gpt-5.1" ? "GPT 5.1" : "Claude Sonnet 4.5"}
            </Badge>
          </div>
          <Button
            size="sm"
            className="text-[0.7rem] px-3 bg-mm-primary hover:bg-mm-primarySoft text-slate-950"
            onClick={() => onOpen(run.id)}
          >
            Open run
          </Button>
        </div>
      </div>
    </Card>
  )
}
