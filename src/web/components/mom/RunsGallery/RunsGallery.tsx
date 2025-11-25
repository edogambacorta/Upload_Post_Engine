import { FC, useMemo, useState } from "react"
import { MomUiRun } from "@/lib/mom/types"
import { RunCard } from "./RunCardClean"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface RunsGalleryProps {
  runs: MomUiRun[]
  onOpenRun: (runId: string) => void
  onDeleteRun?: (runId: string) => void
}

export const RunsGallery: FC<RunsGalleryProps> = ({ runs, onOpenRun, onDeleteRun }) => {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"latest" | "oldest">("latest")

  const filtered = useMemo(() => {
    let result = runs

    if (search.trim()) {
      const term = search.toLowerCase()
      result = result.filter((run) =>
        run.topic.toLowerCase().includes(term),
      )
    }

    result = [...result].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      return sort === "latest" ? bTime - aTime : aTime - bTime
    })

    return result
  }, [runs, search, sort])

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-heading text-xl">Previous content runs</h2>
          <p className="text-xs text-slate-400">
            Browse, reuse, or regenerate your best-performing sets.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full sm:w-56 bg-mm-card border-slate-700 text-xs"
          />
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as "latest" | "oldest")}
          >
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

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">
          No runs yet. Create your first flow using the wizard above.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((run) => (
            <RunCard key={run.id} run={run} onOpen={onOpenRun} onDelete={onDeleteRun} />
          ))}
        </div>
      )}
    </section>
  )
}
