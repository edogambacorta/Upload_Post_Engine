import { FC } from "react"
import { Audience } from "@/lib/mom/types"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

const audienceMeta: Record<
    Audience,
    { label: string; description: string; tone: string }
> = {
    pregnant_anxious: {
        label: "Pregnant & Anxious",
        description: "Early pregnancy worries, physical changes, 'what if…?' loops.",
        tone: "gentle • reassuring • grounding",
    },
    first_time_newborn: {
        label: "First-Time Moms",
        description: "Newborn chaos, sleep loss, identity shift, information overload.",
        tone: "validating • practical • 'you're not alone'",
    },
    burned_out_parent: {
        label: "Burned-Out Parents",
        description: "Chronic exhaustion, invisible load, resentment, guilt.",
        tone: "honest • de-shaming • energy-saving tips",
    },
    female_overwhelm: {
        label: "General Overwhelm",
        description: "Too many tabs open in life and in the mind.",
        tone: "light • relatable • normalizing",
    },
}

interface AudienceSelectorProps {
    value: Audience
    onChange: (audience: Audience) => void
}

export const AudienceSelector: FC<AudienceSelectorProps> = ({
    value,
    onChange,
}) => {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(audienceMeta) as Audience[]).map((key) => {
                const meta = audienceMeta[key]
                const isActive = value === key

                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key)}
                        className={cn(
                            "text-left group focus:outline-none cursor-pointer",
                            "transition-transform duration-200 hover:-translate-y-[2px]"
                        )}
                    >
                        <Card
                            className={cn(
                                "relative h-full border border-slate-700 bg-mm-card/80 backdrop-blur-md",
                                "p-4 md:p-5 rounded-2xl shadow-mm-soft transition-colors",
                                "group-hover:border-mm-primary/60 group-hover:bg-mm-card/90",
                                isActive && "border-mm-primary/80 ring-1 ring-mm-primary/70"
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="font-heading text-lg font-semibold">
                                        {meta.label}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-300">
                                        {meta.description}
                                    </p>
                                    <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                                        {meta.tone}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </button>
                )
            })}
        </div>
    )
}
