import { FC } from "react"
import { WizardStep } from "@/lib/mom/types"
import { cn } from "@/lib/utils"

const steps: { id: WizardStep; label: string; subtitle: string }[] = [
    {
        id: 1,
        label: "Configure",
        subtitle: "Topic, audience, settings",
    },
    {
        id: 2,
        label: "Review prompts",
        subtitle: "Edit & approve copy",
    },
    {
        id: 3,
        label: "Generate images",
        subtitle: "Visuals, captions & export",
    },
]

interface StepIndicatorProps {
    activeStep: WizardStep
}

export const StepIndicator: FC<StepIndicatorProps> = ({ activeStep }) => {
    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-mm-card/80 p-4 md:p-5">
            <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg md:text-xl">
                    Create parenting content flow
                </h2>
                <p className="text-xs text-slate-400">
                    Step {activeStep} of {steps.length}
                </p>
            </div>
            <div className="flex items-center gap-4 md:gap-6">
                {steps.map((step, index) => {
                    const isActive = activeStep === step.id
                    const isCompleted = activeStep > step.id
                    const isLast = index === steps.length - 1

                    return (
                        <div
                            key={step.id}
                            className="flex flex-1 items-center gap-2 md:gap-3"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                                        "md:h-9 md:w-9",
                                        isCompleted &&
                                        "border-mm-primary bg-mm-primary text-slate-900",
                                        isActive &&
                                        !isCompleted &&
                                        "border-mm-primary bg-mm-primary/20 text-mm-primary",
                                        !isCompleted &&
                                        !isActive &&
                                        "border-slate-700 bg-mm-bg text-slate-400"
                                    )}
                                >
                                    {isCompleted ? (
                                        <span className="text-[0.7rem]">✓</span>
                                    ) : (
                                        step.id
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-1 flex-col">
                                <span
                                    className={cn(
                                        "text-xs font-medium uppercase tracking-wide",
                                        isActive ? "text-mm-primary" : "text-slate-300"
                                    )}
                                >
                                    {step.label}
                                </span>
                                <span className="text-[0.7rem] text-slate-400">
                                    {step.subtitle}
                                </span>
                            </div>
                            {!isLast && (
                                <div className="hidden flex-1 items-center md:flex">
                                    <div className="h-px w-full bg-gradient-to-r from-slate-700 via-slate-700/50 to-transparent" />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
