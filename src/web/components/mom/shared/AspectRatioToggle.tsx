import { FC } from "react"
import { AspectRatio } from "@/lib/mom/types"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

interface AspectRatioToggleProps {
    value: AspectRatio
    onChange: (value: AspectRatio) => void
}

const label: Record<AspectRatio, string> = {
    "3:4": "Portrait 3:4",
    "4:3": "Landscape 4:3",
    "9:16": "Stories 9:16",
}

export const AspectRatioToggle: FC<AspectRatioToggleProps> = ({
    value,
    onChange,
}) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-200">Aspect ratio</p>
                <p className="text-xs text-slate-400">
                    Recommended: 9:16 for TikTok / Reels
                </p>
            </div>
            <ToggleGroup
                type="single"
                value={value}
                onValueChange={(val) => val && onChange(val as AspectRatio)}
                className="flex gap-2"
            >
                {(["3:4", "4:3", "9:16"] as AspectRatio[]).map((ratio) => (
                    <ToggleGroupItem
                        key={ratio}
                        value={ratio}
                        className={cn(
                            "relative flex-1 rounded-2xl border border-slate-700 bg-mm-card/80 shadow-sm",
                            "p-3 text-xs sm:text-sm flex flex-col items-start gap-2 cursor-pointer transition-colors",
                            // Strong selected state
                            "data-[state=on]:border-mm-primary data-[state=on]:bg-mm-primary/15 data-[state=on]:shadow-mm-soft data-[state=on]:ring-1 data-[state=on]:ring-mm-primary/70",
                            // Hover, when not yet selected
                            "hover:border-mm-primary/40 hover:bg-mm-card/90"
                        )}
                    >
                        <div className="flex items-center gap-3 w-full">
                            <div
                                className={cn(
                                    "border border-slate-700 bg-white",
                                    // Small ratio previews – keep proportions but reduce size
                                    ratio === "3:4" && "h-4 w-3", // portrait 3:4
                                    ratio === "4:3" && "h-3 w-4", // landscape 4:3
                                    ratio === "9:16" && "h-5 w-2.5" // tall stories 9:16
                                )}
                            />
                            <div className="flex flex-col">
                                <span className="font-medium">{label[ratio]}</span>
                                <span className="text-[0.7rem] text-slate-400">
                                    {ratio === "9:16" && "Vertical stories & short-form"}
                                    {ratio === "3:4" && "Feed posts with more breathing room"}
                                    {ratio === "4:3" && "Landscape carousels or blog visuals"}
                                </span>
                            </div>
                        </div>
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
        </div>
    )
}
