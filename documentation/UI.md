Alright, let’s turn that plan into a concrete, shippable implementation.

Below I’ll:

Lock in the tech + folder structure

Set up the design system (Tailwind + shadcn theme)

Implement the Create Wizard (all 3 steps)

Implement the Runs Gallery (card-based, with actions)

Wire everything into a dashboard page

I’ll assume:

React + TypeScript

Tailwind already installed

You’re okay to install shadcn/ui via CLI

File base: src/web/... (adjust aliases as needed)

1. Design System Implementation (Tailwind + shadcn)
1.1 Tailwind config

tailwind.config.ts

import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/web/app/**/*.{ts,tsx}",
    "./src/web/components/**/*.{ts,tsx}",
    "./src/web/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Outfit", "system-ui", "sans-serif"],
      },
      colors: {
        mm: {
          primary: "#f43f5e",
          primarySoft: "#fb7185",
          secondary: "#a855f7",
          secondarySoft: "#c084fc",
          accent: "#fb923c",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
          bg: "#0f172a",
          card: "#1e293b",
          elevated: "#334155",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        "mm-soft": "0 18px 45px rgba(15, 23, 42, 0.65)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config

1.2 Global CSS / shadcn theme

src/web/app/globals.css (or equivalent)

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* mapped roughly to your palette (HSL values) */
    --background: 222.2 47.4% 11.2%;   /* #0f172a */
    --foreground: 210 40% 98%;
    --card: 217.2 32.6% 17.5%;         /* #1e293b */
    --card-foreground: 210 40% 96%;
    --popover: 217.2 32.6% 17.5%;
    --popover-foreground: 210 40% 98%;

    --primary: 349.7 89.2% 60.2%;      /* #f43f5e */
    --primary-foreground: 210 40% 98%;
    --secondary: 270.7 91% 65.1%;      /* #a855f7 */
    --secondary-foreground: 210 40% 98%;

    --muted: 215.3 25% 26.7%;          /* #334155 */
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 27 96% 61%;              /* #fb923c */
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;      /* #ef4444 */
    --destructive-foreground: 210 40% 98%;

    --border: 215.3 25% 26.7%;
    --input: 215.3 25% 26.7%;
    --ring: 349.7 89.2% 60.2%;

    --radius: 1rem;
  }

  body {
    @apply bg-mm-bg text-slate-100;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

2. Core Types & Utilities

src/web/lib/mom/types.ts

export type Audience =
  | "pregnant_anxious"
  | "first_time_mom"
  | "burned_out"
  | "overwhelmed_general"

export type AspectRatio = "3:4" | "4:3" | "9:16"

export type Llmmodel = "claude_sonnet_4_5" | "gpt_5_1"
export type ImageModel = "nanobanana_pro" | "flux_schnell"

export type WizardStep = 1 | 2 | 3

export interface WizardConfig {
  basePrompt: string
  audience: Audience
  aspectRatio: AspectRatio
  llmModel: Llmmodel
  imageModel: ImageModel
  postCount: number
}

export interface GeneratedPrompt {
  id: string
  text: string
}

export interface GeneratedImage {
  id: string
  promptId: string
  imageUrl: string
  caption: string
}

export type RunStatus = "pending" | "generating" | "completed" | "failed"

export interface MomRun {
  id: string
  createdAt: string
  topic: string
  audience: Audience
  aspectRatio: AspectRatio
  llmModel: Llmmodel
  imageModel: ImageModel
  status: RunStatus
  postCount: number
  thumbnails: string[] // subset for gallery
}

export interface MomPost {
  id: string
  runId: string
  imageUrl: string
  caption: string
  prompt: string
}

3. Shared Feature Components
3.1 AudienceSelector

src/web/components/mom/shared/AudienceSelector.tsx

"use client"

import { FC } from "react"
import { Audience } from "@/web/lib/mom/types"
import { cn } from "@/web/lib/utils"
import { Card } from "@/web/components/ui/card"
import { Badge } from "@/web/components/ui/badge"

const audienceMeta: Record<
  Audience,
  { label: string; description: string; tone: string }
> = {
  pregnant_anxious: {
    label: "Pregnant & Anxious",
    description: "Early pregnancy worries, physical changes, ‘what if…?’ loops.",
    tone: "gentle • reassuring • grounding",
  },
  first_time_mom: {
    label: "First-Time Moms",
    description: "Newborn chaos, sleep loss, identity shift, information overload.",
    tone: "validating • practical • ‘you’re not alone’",
  },
  burned_out: {
    label: "Burned-Out Parents",
    description: "Chronic exhaustion, invisible load, resentment, guilt.",
    tone: "honest • de-shaming • energy-saving tips",
  },
  overwhelmed_general: {
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
              "text-left group focus:outline-none",
              "transition-transform duration-200 hover:-translate-y-[2px]"
            )}
          >
            <Card
              className={cn(
                "relative h-full border border-slate-700 bg-mm-card/80 backdrop-blur-md",
                "p-4 md:p-5 rounded-2xl shadow-mm-soft",
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
                {isActive && (
                  <Badge className="bg-mm-primary/80 text-xs px-2 py-1">
                    Selected
                  </Badge>
                )}
              </div>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

3.2 ModelSelector

src/web/components/mom/shared/ModelSelector.tsx

"use client"

import { FC } from "react"
import { Llmmodel, ImageModel } from "@/web/lib/mom/types"
import { Label } from "@/web/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/web/components/ui/select"

interface ModelSelectorProps {
  llmModel: Llmmodel
  imageModel: ImageModel
  onChangeLlmmodel: (m: Llmmodel) => void
  onChangeImageModel: (m: ImageModel) => void
}

export const ModelSelector: FC<ModelSelectorProps> = ({
  llmModel,
  imageModel,
  onChangeLlmmodel,
  onChangeImageModel,
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label className="text-sm text-slate-200">Text model (prompts)</Label>
        <Select
          value={llmModel}
          onValueChange={(value) => onChangeLlmmodel(value as Llmmodel)}
        >
          <SelectTrigger className="bg-mm-card border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-mm-card border-slate-700">
            <SelectItem value="claude_sonnet_4_5">
              Claude Sonnet 4.5 – emotionally nuanced
            </SelectItem>
            <SelectItem value="gpt_5_1">
              ChatGPT 5.1 – flexible & creative
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-slate-200">
          Image model (visuals)
        </Label>
        <Select
          value={imageModel}
          onValueChange={(value) => onChangeImageModel(value as ImageModel)}
        >
          <SelectTrigger className="bg-mm-card border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-mm-card border-slate-700">
            <SelectItem value="nanobanana_pro">
              NanoBanana Pro – consistent infographic look
            </SelectItem>
            <SelectItem value="flux_schnell">
              FLUX Schnell – fast, experimental
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

3.3 AspectRatioToggle

src/web/components/mom/shared/AspectRatioToggle.tsx

"use client"

import { FC } from "react"
import { AspectRatio } from "@/web/lib/mom/types"
import { ToggleGroup, ToggleGroupItem } from "@/web/components/ui/toggle-group"
import { cn } from "@/web/lib/utils"

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
              "relative flex-1 rounded-2xl border border-slate-700 bg-mm-card/80",
              "p-3 text-xs sm:text-sm data-[state=on]:border-mm-primary data-[state=on]:bg-mm-primary/10",
              "flex flex-col items-start gap-1"
            )}
          >
            <span className="font-medium">{label[ratio]}</span>
            <span className="text-[0.7rem] text-slate-400">
              {ratio === "9:16" && "Vertical stories & short-form"}
              {ratio === "3:4" && "Feed posts with more breathing room"}
              {ratio === "4:3" && "Landscape carousels or blog visuals"}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

4. Create Wizard Implementation
4.1 Step Indicator

src/web/components/mom/CreateWizard/StepIndicator.tsx

"use client"

import { FC } from "react"
import { WizardStep } from "@/web/lib/mom/types"
import { cn } from "@/web/lib/utils"

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

4.2 Step 1 – Configure

src/web/components/mom/CreateWizard/Step1_Configure.tsx

"use client"

import { FC, useState } from "react"
import {
  Audience,
  AspectRatio,
  ImageModel,
  Llmmodel,
  WizardConfig,
} from "@/web/lib/mom/types"
import { Card } from "@/web/components/ui/card"
import { Label } from "@/web/components/ui/label"
import { Input } from "@/web/components/ui/input"
import { Slider } from "@/web/components/ui/slider"
import { Button } from "@/web/components/ui/button"
import { AudienceSelector } from "../shared/AudienceSelector"
import { ModelSelector } from "../shared/ModelSelector"
import { AspectRatioToggle } from "../shared/AspectRatioToggle"

interface Step1ConfigureProps {
  initialConfig?: Partial<WizardConfig>
  isLoading?: boolean
  onSubmit: (config: WizardConfig) => void
}

export const Step1_Configure: FC<Step1ConfigureProps> = ({
  initialConfig,
  isLoading,
  onSubmit,
}) => {
  const [basePrompt, setBasePrompt] = useState(
    initialConfig?.basePrompt ?? ""
  )
  const [audience, setAudience] = useState<Audience>(
    initialConfig?.audience ?? "first_time_mom"
  )
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    initialConfig?.aspectRatio ?? "9:16"
  )
  const [llmModel, setLlmmodel] = useState<Llmmodel>(
    initialConfig?.llmModel ?? "gpt_5_1"
  )
  const [imageModel, setImageModel] = useState<ImageModel>(
    initialConfig?.imageModel ?? "nanobanana_pro"
  )
  const [postCount, setPostCount] = useState<number>(
    initialConfig?.postCount ?? 6
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!basePrompt.trim()) return

    onSubmit({
      basePrompt: basePrompt.trim(),
      audience,
      aspectRatio,
      llmModel,
      imageModel,
      postCount,
    })
  }

  return (
    <Card className="mt-4 border-slate-800 bg-mm-card/90 p-4 md:p-6 rounded-2xl shadow-mm-soft">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic input */}
        <div className="space-y-2">
          <Label className="text-sm text-slate-200">
            Topic or working title
          </Label>
          <Input
            className="bg-mm-bg/60 border-slate-700 focus-visible:ring-mm-primary"
            placeholder="z.B. 'Invisible load of motherhood' oder 'Sleep deprivation & mom guilt'"
            value={basePrompt}
            onChange={(e) => setBasePrompt(e.target.value)}
          />
          <p className="text-xs text-slate-400">
            Keep it human and specific. The AI will explode this into multiple
            scroll-stopping infographic prompts.
          </p>
        </div>

        {/* Audience */}
        <div className="space-y-3">
          <Label className="text-sm text-slate-200">
            Who are we speaking to?
          </Label>
          <AudienceSelector value={audience} onChange={setAudience} />
        </div>

        {/* Models + aspect */}
        <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <div className="space-y-4">
            <ModelSelector
              llmModel={llmModel}
              imageModel={imageModel}
              onChangeLlmmodel={setLlmmodel}
              onChangeImageModel={setImageModel}
            />
          </div>
          <div className="space-y-4">
            <AspectRatioToggle
              value={aspectRatio}
              onChange={setAspectRatio}
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-200">Number of posts</span>
                <span className="text-xs text-slate-400">
                  {postCount} infographic{postCount !== 1 && "s"}
                </span>
              </div>
              <Slider
                defaultValue={[postCount]}
                min={1}
                max={10}
                step={1}
                onValueChange={([val]) => setPostCount(val)}
              />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
          <p className="text-xs text-slate-400 max-w-md">
            Next step: MomMirror will generate emotionally resonant, on-brand
            prompts. You can tweak them before any images are created.
          </p>
          <Button
            type="submit"
            disabled={isLoading || !basePrompt.trim()}
            className="mt-2 sm:mt-0 bg-mm-primary hover:bg-mm-primarySoft text-slate-950 px-6"
          >
            {isLoading ? "Generating prompts…" : "Generate prompts"}
          </Button>
        </div>
      </form>
    </Card>
  )
}

4.3 Step 2 – Review & Edit Prompts

src/web/components/mom/CreateWizard/Step2_ReviewPrompts.tsx

"use client"

import { FC } from "react"
import { GeneratedPrompt } from "@/web/lib/mom/types"
import { Card } from "@/web/components/ui/card"
import { Textarea } from "@/web/components/ui/textarea"
import { Button } from "@/web/components/ui/button"
import { cn } from "@/web/lib/utils"

interface Step2ReviewPromptsProps {
  prompts: GeneratedPrompt[]
  isGeneratingImages?: boolean
  onChangePrompt: (id: string, text: string) => void
  onBackToConfigure: () => void
  onGenerateImages: () => void
}

export const Step2_ReviewPrompts: FC<Step2ReviewPromptsProps> = ({
  prompts,
  isGeneratingImages,
  onChangePrompt,
  onBackToConfigure,
  onGenerateImages,
}) => {
  const hasPrompts = prompts.length > 0

  return (
    <Card className="mt-4 border-slate-800 bg-mm-card/90 p-4 md:p-6 rounded-2xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h3 className="font-heading text-lg">
            Review & fine-tune the copy
          </h3>
          <p className="text-xs text-slate-400 max-w-lg mt-1">
            Adjust tone, examples, and length. Think: “would I save this if I
            saw it at 2am while feeding my baby?”
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToConfigure}
          className="border-slate-700 text-slate-300"
        >
          ← Back to settings
        </Button>
      </div>

      {hasPrompts ? (
        <div className="grid gap-4 md:grid-cols-2">
          {prompts.map((prompt, index) => (
            <Card
              key={prompt.id}
              className={cn(
                "border border-slate-700 bg-mm-bg/60 p-3 md:p-4 rounded-2xl flex flex-col gap-2"
              )}
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Prompt #{index + 1}</span>
                <span>For slide / visual #{index + 1}</span>
              </div>
              <Textarea
                className="mt-1 min-h-[140px] bg-transparent border-slate-700 text-sm"
                value={prompt.text}
                onChange={(e) => onChangePrompt(prompt.id, e.target.value)}
              />
              <p className="mt-1 text-[0.7rem] text-slate-500 leading-relaxed">
                Tip: Aim for one strong idea per card. Start with a “hook”
                sentence that makes a tired mom feel instantly seen.
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          No prompts yet. Go back to Step 1 and generate them.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-6">
        <p className="text-xs text-slate-400 max-w-md">
          When you continue, MomMirror will turn each prompt into a designed
          infographic with overlay text and ready-to-post captions.
        </p>
        <Button
          className="bg-mm-primary hover:bg-mm-primarySoft text-slate-950 px-6"
          disabled={!hasPrompts || isGeneratingImages}
          onClick={onGenerateImages}
        >
          {isGeneratingImages ? "Generating visuals…" : "Looks good, generate images"}
        </Button>
      </div>
    </Card>
  )
}

4.4 Step 3 – Generate Images

src/web/components/mom/CreateWizard/Step3_GenerateImages.tsx

"use client"

import { FC } from "react"
import { GeneratedImage } from "@/web/lib/mom/types"
import { Card } from "@/web/components/ui/card"
import { Button } from "@/web/components/ui/button"
import { Progress } from "@/web/components/ui/progress"
import { cn } from "@/web/lib/utils"

interface Step3GenerateImagesProps {
  images: GeneratedImage[]
  progress: number // 0–100
  isRunning: boolean
  onOpenRun: () => void
  onCopyCaption: (caption: string) => void
  onRegenerateImage: (imageId: string) => void
}

export const Step3_GenerateImages: FC<Step3GenerateImagesProps> = ({
  images,
  progress,
  isRunning,
  onOpenRun,
  onCopyCaption,
  onRegenerateImage,
}) => {
  const completed = progress >= 100

  return (
    <Card className="mt-4 border-slate-800 bg-mm-card/90 p-4 md:p-6 rounded-2xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h3 className="font-heading text-lg">
            Generating visuals & captions
          </h3>
          <p className="text-xs text-slate-400 max-w-lg mt-1">
            You can already preview, copy captions, and even regenerate single
            images while the run is still processing.
          </p>
        </div>
        {completed && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenRun}
            className="border-mm-primary text-mm-primary"
          >
            Open full run →
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{completed ? "All done" : "Working on your mom magic…"}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2 bg-slate-800"
            indicatorClassName={cn(
              "bg-gradient-to-r from-mm-primary via-mm-secondary to-mm-accent"
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <Card
              key={img.id}
              className="border border-slate-700 bg-mm-bg/70 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[9/16] w-full overflow-hidden bg-slate-900/80">
                <img
                  src={img.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <p className="text-xs text-slate-300 line-clamp-3">
                  {img.caption}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <Button
                    size="xs"
                    variant="outline"
                    className="border-slate-700 text-[0.7rem] px-2"
                    onClick={() => onCopyCaption(img.caption)}
                  >
                    Copy caption
                  </Button>
                  <Button
                    size="xs"
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
          <p className="text-sm text-slate-400">
            Images will appear here as they are generated.
          </p>
        )}
      </div>
    </Card>
  )
}

4.5 Wizard Container

This ties all steps together and exposes a clean API to your page.

src/web/components/mom/CreateWizard/CreateWizard.tsx

"use client"

import { useState } from "react"
import {
  GeneratedImage,
  GeneratedPrompt,
  WizardConfig,
  WizardStep,
} from "@/web/lib/mom/types"
import { StepIndicator } from "./StepIndicator"
import { Step1_Configure } from "./Step1_Configure"
import { Step2_ReviewPrompts } from "./Step2_ReviewPrompts"
import { Step3_GenerateImages } from "./Step3_GenerateImages"

interface CreateWizardProps {
  onGeneratePrompts: (config: WizardConfig) => Promise<GeneratedPrompt[]>
  onGenerateImages: (prompts: GeneratedPrompt[], config: WizardConfig) => Promise<GeneratedImage[]>
  onOpenRunFromWizard: (runId: string) => void
}

export const CreateWizard: React.FC<CreateWizardProps> = ({
  onGeneratePrompts,
  onGenerateImages,
  onOpenRunFromWizard,
}) => {
  const [step, setStep] = useState<WizardStep>(1)
  const [config, setConfig] = useState<WizardConfig | null>(null)
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([])
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)

  const handleGeneratePrompts = async (cfg: WizardConfig) => {
    setIsLoadingPrompts(true)
    setConfig(cfg)
    try {
      const result = await onGeneratePrompts(cfg)
      setPrompts(result)
      setStep(2)
    } finally {
      setIsLoadingPrompts(false)
    }
  }

  const handleChangePrompt = (id: string, text: string) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, text } : p))
    )
  }

  const handleGenerateImages = async () => {
    if (!config || !prompts.length) return
    setIsGeneratingImages(true)
    setProgress(5)
    try {
      const res = await onGenerateImages(prompts, config)
      setImages(res)
      setStep(3)
      setProgress(100)
      // If your backend returns a runId, you should push it here
      const anyRunId = res[0]?.id.split(":")[0] ?? null
      if (anyRunId) setCurrentRunId(anyRunId)
    } finally {
      setIsGeneratingImages(false)
    }
  }

  const handleOpenRun = () => {
    if (currentRunId) onOpenRunFromWizard(currentRunId)
  }

  return (
    <section className="space-y-4">
      <StepIndicator activeStep={step} />

      {step === 1 && (
        <Step1_Configure
          initialConfig={config ?? undefined}
          isLoading={isLoadingPrompts}
          onSubmit={handleGeneratePrompts}
        />
      )}

      {step === 2 && (
        <Step2_ReviewPrompts
          prompts={prompts}
          isGeneratingImages={isGeneratingImages}
          onChangePrompt={handleChangePrompt}
          onBackToConfigure={() => setStep(1)}
          onGenerateImages={handleGenerateImages}
        />
      )}

      {step === 3 && (
        <Step3_GenerateImages
          images={images}
          progress={progress}
          isRunning={isGeneratingImages}
          onOpenRun={handleOpenRun}
          onCopyCaption={(caption) =>
            navigator.clipboard?.writeText(caption).catch(() => {})
          }
          onRegenerateImage={(imageId) => {
            // hook into your existing regenerate endpoint here
            console.log("Regenerate image", imageId)
          }}
        />
      )}
    </section>
  )
}


You’ll plug real API calls into onGeneratePrompts and onGenerateImages in the page.

5. Runs Gallery Implementation
5.1 RunCard

src/web/components/mom/RunsGallery/RunCard.tsx

"use client"

import { FC } from "react"
import { MomRun } from "@/web/lib/mom/types"
import { Card } from "@/web/components/ui/card"
import { Badge } from "@/web/components/ui/badge"
import { Button } from "@/web/components/ui/button"
import { cn } from "@/web/lib/utils"

interface RunCardProps {
  run: MomRun
  onOpen: (runId: string) => void
}

const statusLabel: Record<MomRun["status"], string> = {
  pending: "Queued",
  generating: "Generating",
  completed: "Completed",
  failed: "Failed",
}

export const RunCard: FC<RunCardProps> = ({ run, onOpen }) => {
  const date = new Date(run.createdAt)

  return (
    <Card
      className="border border-slate-800 bg-mm-card/80 rounded-2xl overflow-hidden flex flex-col shadow-mm-soft"
    >
      <div className="flex gap-1 bg-slate-900/60 p-2">
        {run.thumbnails.slice(0, 3).map((src, idx) => (
          <div key={idx} className="relative w-1/3 aspect-[9/16] overflow-hidden rounded-xl">
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover"
            />
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
            <h3 className="font-heading text-sm line-clamp-2">
              {run.topic}
            </h3>
            <p className="text-[0.7rem] text-slate-400 mt-1">
              {date.toLocaleDateString()} • {run.postCount} posts •{" "}
              {run.aspectRatio}
            </p>
          </div>
          <Badge
            className={cn(
              "text-[0.65rem]",
              run.status === "completed" && "bg-mm-success/20 text-green-300",
              run.status === "generating" && "bg-mm-secondary/20 text-mm-secondarySoft",
              run.status === "failed" && "bg-mm-error/20 text-mm-error",
              run.status === "pending" && "bg-slate-700/60 text-slate-200"
            )}
          >
            {statusLabel[run.status]}
          </Badge>
        </div>

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="border-slate-700 text-[0.6rem]">
              {run.audience.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="border-slate-700 text-[0.6rem]">
              {run.llmModel === "gpt_5_1" ? "GPT 5.1" : "Claude Sonnet 4.5"}
            </Badge>
          </div>
          <Button
            size="xs"
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

5.2 PostCard (for run detail view)

src/web/components/mom/RunsGallery/PostCard.tsx

"use client"

import { FC } from "react"
import { MomPost } from "@/web/lib/mom/types"
import { Card } from "@/web/components/ui/card"
import { Button } from "@/web/components/ui/button"

interface PostCardProps {
  post: MomPost
  onCopyCaption: (caption: string) => void
  onRegenerate: (postId: string) => void
}

export const PostCard: FC<PostCardProps> = ({
  post,
  onCopyCaption,
  onRegenerate,
}) => {
  return (
    <Card className="border border-slate-800 bg-mm-card/90 rounded-2xl overflow-hidden flex flex-col">
      <div className="aspect-[9/16] w-full bg-slate-900/60 overflow-hidden">
        <img
          src={post.imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <p className="text-xs text-slate-300 line-clamp-4">
          {post.caption}
        </p>
        <details className="mt-1">
          <summary className="text-[0.7rem] text-slate-500 cursor-pointer">
            Show prompt
          </summary>
          <p className="mt-1 text-[0.7rem] text-slate-400 whitespace-pre-wrap">
            {post.prompt}
          </p>
        </details>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Button
            size="xs"
            variant="outline"
            className="border-slate-700 text-[0.7rem] px-2"
            onClick={() => onCopyCaption(post.caption)}
          >
            Copy caption
          </Button>
          <Button
            size="xs"
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

5.3 RunsGallery wrapper

src/web/components/mom/RunsGallery/RunsGallery.tsx

"use client"

import { FC } from "react"
import { MomRun } from "@/web/lib/mom/types"
import { RunCard } from "./RunCard"
import { Input } from "@/web/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/web/components/ui/select"

interface RunsGalleryProps {
  runs: MomRun[]
  onOpenRun: (runId: string) => void
}

export const RunsGallery: FC<RunsGalleryProps> = ({ runs, onOpenRun }) => {
  // simple local filter; you can replace with server-side requests
  // if needed
  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-heading text-xl">
            Previous content runs
          </h2>
          <p className="text-xs text-slate-400">
            Browse, reuse, or regenerate your best-performing sets.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by topic…"
            className="h-8 w-full sm:w-56 bg-mm-card border-slate-700 text-xs"
          />
          <Select defaultValue="latest">
            <SelectTrigger className="h-8 w-full sm:w-40 bg-mm-card border-slate-700 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-mm-card border-slate-700 text-xs">
              <SelectItem value="latest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-slate-400">
          No runs yet. Create your first flow using the wizard above.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} onOpen={onOpenRun} />
          ))}
        </div>
      )}
    </section>
  )
}

6. Dashboard Page Wiring

Assuming Next.js App Router with src/web/app/mom/page.tsx:

src/web/app/mom/page.tsx

"use client"

import { useEffect, useState } from "react"
import {
  GeneratedImage,
  GeneratedPrompt,
  MomRun,
  MomPost,
  WizardConfig,
} from "@/web/lib/mom/types"
import { CreateWizard } from "@/web/components/mom/CreateWizard/CreateWizard"
import { RunsGallery } from "@/web/components/mom/RunsGallery/RunsGallery"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/web/components/ui/dialog"
import { PostCard } from "@/web/components/mom/RunsGallery/PostCard"
import { Button } from "@/web/components/ui/button"

export default function MomDashboardPage() {
  const [runs, setRuns] = useState<MomRun[]>([])
  const [selectedRun, setSelectedRun] = useState<MomRun | null>(null)
  const [runPosts, setRunPosts] = useState<MomPost[]>([])
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false)

  useEffect(() => {
    // plug your existing backend here instead of /api/...
    fetch("/api/mom/runs")
      .then((res) => res.json())
      .then(setRuns)
      .catch(() => {})
  }, [])

  const handleGeneratePrompts = async (
    config: WizardConfig
  ): Promise<GeneratedPrompt[]> => {
    const res = await fetch("/api/mom/generate-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
    const data = await res.json()
    return data.prompts as GeneratedPrompt[]
  }

  const handleGenerateImages = async (
    prompts: GeneratedPrompt[],
    config: WizardConfig
  ): Promise<GeneratedImage[]> => {
    const res = await fetch("/api/mom/generate-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, prompts }),
    })
    const data = await res.json()

    const updatedRuns = await fetch("/api/mom/runs").then((r) => r.json())
    setRuns(updatedRuns)

    return data.images as GeneratedImage[]
  }

  const openRun = async (runId: string) => {
    const res = await fetch(`/api/mom/runs/${runId}`)
    const data = await res.json()
    setSelectedRun(data.run as MomRun)
    setRunPosts(data.posts as MomPost[])
    setIsRunDialogOpen(true)
  }

  const copyCaption = (caption: string) => {
    navigator.clipboard?.writeText(caption).catch(() => {})
  }

  const regeneratePost = (postId: string) => {
    // hook into your regenerate endpoint
    console.log("Regenerate post", postId)
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-10 pt-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl md:text-3xl">
          MomMirror Content Studio
        </h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Generate emotionally resonant parenting infographics in a guided,
          three-step flow – then browse, reuse, and refine your best runs.
        </p>
      </header>

      <CreateWizard
        onGeneratePrompts={handleGeneratePrompts}
        onGenerateImages={handleGenerateImages}
        onOpenRunFromWizard={openRun}
      />

      <RunsGallery runs={runs} onOpenRun={openRun} />

      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent className="max-w-5xl bg-mm-card border-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {selectedRun?.topic ?? "Run details"}
            </DialogTitle>
            {selectedRun && (
              <p className="text-xs text-slate-400">
                {new Date(selectedRun.createdAt).toLocaleString()} •{" "}
                {selectedRun.postCount} posts • {selectedRun.aspectRatio}
              </p>
            )}
          </DialogHeader>
          <div className="mt-3 flex-1 overflow-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {runPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onCopyCaption={copyCaption}
                  onRegenerate={regeneratePost}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-200"
              onClick={() => setIsRunDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

7. How to Roll This Out Incrementally

Install shadcn/ui + base components

Run the shadcn CLI and generate button, card, input, textarea, select, slider, badge, toggle-group, dialog, progress into src/web/components/ui.

Drop in the design system

Update tailwind.config.ts and globals.css as above.

Ensure Inter + Outfit are loaded via <link> or next/font.

Add shared types & components

lib/mom/types.ts

AudienceSelector, ModelSelector, AspectRatioToggle.

Add CreateWizard components

StepIndicator, Step1_Configure, Step2_ReviewPrompts, Step3_GenerateImages, CreateWizard.

Add RunsGallery + Run detail dialog

RunCard, PostCard, RunsGallery, wire them in the main page.

Wire real API endpoints

Replace /api/mom/... with your actual routes.

Use your existing run IDs in GenerateImages so the wizard can open the run.

If you want, next step I can:

Adapt the fetch layer exactly to your current backend route structure,

Or rewrite the wizard to plug directly into your existing “runs” data model if you paste it.