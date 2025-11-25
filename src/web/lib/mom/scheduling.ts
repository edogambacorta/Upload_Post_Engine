type BuildSlotsArgs = {
  startDate: string
  intervalHours: number
  count: number
}

const pad = (n: number) => String(n).padStart(2, "0")

export function buildScheduleSlots({ startDate, intervalHours, count }: BuildSlotsArgs) {
  if (!startDate || !Number.isFinite(intervalHours) || intervalHours <= 0 || count <= 0) {
    return []
  }
  const base = new Date(startDate)
  if (Number.isNaN(base.getTime())) {
    return []
  }
  const slots: string[] = []
  for (let i = 0; i < count; i += 1) {
    const next = new Date(base.getTime() + i * intervalHours * 60 * 60 * 1000)
    slots.push(next.toISOString())
  }
  return slots
}

export function toLocalInputValue(iso?: string | null) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export function fromLocalInputValue(value: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toISOString()
}
