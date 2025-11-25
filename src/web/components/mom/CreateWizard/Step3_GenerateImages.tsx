import { FC } from "react"
import { GeneratedImage } from "@/lib/mom/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { fromLocalInputValue, toLocalInputValue } from "@/lib/mom/scheduling"

interface Step3GenerateImagesProps {
  images: GeneratedImage[]
  progress: number // 0–100
  onOpenRun: () => void
  onCopyCaption: (caption: string) => void
  onRegenerateImage: (imageId: string) => void
  onScheduleChange?: (postId: string, scheduledDate: string) => void
}

export const Step3_GenerateImages: FC<Step3GenerateImagesProps> = ({
  images,
  progress,
  onOpenRun,
  onCopyCaption,
  onRegenerateImage,
  onScheduleChange,
}) => {
  const completed = progress >= 100

  return (
    <Card className="mt-4 border-slate-800 bg-mm-card/90 p-4 md:p-6 rounded-2xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h3 className="font-heading text-lg">Generating visuals &amp; captions</h3>
          <p className="text-xs text-slate-400 max-w-lg mt-1">
            You can already preview, copy captions, and even regenerate single images while
            the run is still processing.
          </p>
        </div>
        {completed && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenRun}
            className="border-mm-primary text-mm-primary"
          >
            Open full run 
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{completed ? "All done" : "Working on your mom magic…"}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-800" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <Card
              key={img.id}
              className="border border-slate-700 bg-mm-bg/70 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[9/16] w-full overflow-hidden bg-slate-900/80">
                <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <p className="text-xs text-slate-300 line-clamp-3">{img.caption}</p>
                <div className="space-y-1">
                  <p className="text-[0.65rem] text-slate-500">Scheduled for</p>
                  <Input
                    type="datetime-local"
                    value={toLocalInputValue(img.scheduledDate)}
                    onChange={(e) => {
                      const iso = fromLocalInputValue(e.target.value)
                      if (iso && onScheduleChange) {
                        onScheduleChange(img.postId, iso)
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
                    onClick={() => onCopyCaption(img.caption)}
                  >
                    Copy caption
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[0.7rem] text-slate-400 hover:text-mm-primary hover:bg-mm-primary/10"
                    onClick={() => onRegenerateImage(img.id)}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {!images.length && (
          <p className="text-sm text-slate-400">Images will appear here as they are generated.</p>
        )}
      </div>
    </Card>
  )
}
