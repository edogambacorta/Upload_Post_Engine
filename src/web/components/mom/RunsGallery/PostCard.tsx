import { FC } from "react"
import { MomUiPost } from "@/lib/mom/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fromLocalInputValue, toLocalInputValue } from "@/lib/mom/scheduling"

interface PostCardProps {
  post: MomUiPost
  onCopyCaption: (caption: string) => void
  onRegenerate: (postId: string) => void
  onScheduleChange?: (postId: string, isoDate: string) => void
}

export const PostCard: FC<PostCardProps> = ({
  post,
  onCopyCaption,
  onRegenerate,
  onScheduleChange,
}) => {
  return (
    <Card className="border border-slate-800 bg-mm-card/90 rounded-2xl overflow-hidden flex flex-col transition-transform transition-colors hover:-translate-y-[2px] hover:border-mm-primary/60">
      <div className="aspect-[9/16] w-full bg-slate-900/60 overflow-hidden">
        <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <p className="text-xs text-slate-300 line-clamp-4">{post.caption}</p>
        <details className="mt-1">
          <summary className="text-[0.7rem] text-slate-500 cursor-pointer">
            Show prompt
          </summary>
          <p className="mt-1 text-[0.7rem] text-slate-400 whitespace-pre-wrap">
            {post.prompt}
          </p>
        </details>
        <div className="space-y-1">
          <p className="text-[0.65rem] text-slate-500">Scheduled for</p>
          <Input
            type="datetime-local"
            value={toLocalInputValue(post.scheduledDate)}
            onChange={(e) => {
              const iso = fromLocalInputValue(e.target.value)
              if (iso && onScheduleChange) {
                onScheduleChange(post.id, iso)
              }
            }}
            className="bg-mm-bg/60 border-slate-700 text-[0.75rem] focus-visible:ring-mm-primary"
          />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 text-[0.7rem] px-2"
            onClick={() => onCopyCaption(post.caption)}
          >
            Copy caption
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-[0.7rem] text-slate-400 hover:text-mm-primary hover:bg-mm-primary/10"
            onClick={() => onRegenerate(post.id)}
          >
            Regenerate
          </Button>
        </div>
      </div>
    </Card>
  )
}
