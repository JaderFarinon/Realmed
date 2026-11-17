export type Area = { key: string; label: string }
export type Definition = {
  key: string
  area: string
  label: string
  kind: 'bar' | 'area' | 'donut'
  unit: string
}
export type Filters = {
  start: string
  end: string
  area: string
  source: string
  status: string
  insurance: string
  scheduleId: string
  placeId: string
}
export type Coverage = {
  days: number
  collectedDays: number
  currentDays: number
  complete: boolean
  lastSuccessAt: string | null
}
export type Metric = Definition & {
  rows: { label: string; value: number }[]
  total: number | null
  population: number | null
  missing: number
  description: string
  scope: string
  warnings: string[]
  filters: Filters
  capturedAt: string
  coverage: Coverage
}
export type Options = {
  insurances: string[]
  schedules: { id: string; name: string }[]
  places: { id: string; name: string }[]
}
export type Dashboard = {
  areas: Area[]
  definitions: Definition[]
  metrics: Metric[]
  filters: Filters
  coverage: Coverage
  options: Options
  generatedAt: string
}
export type Slide = {
  title: string
  indicatorKey: string
  beforeId: string
  nowId: string
  before: Metric
  now: Metric
  origin: string
  explanation: string
  direction: string
  actions: string
  target: string
  responsible: string
  dueDate: string
}
export type Presentation = {
  id?: number
  title: string
  revision?: number
  slides: Slide[]
  updated_at?: string
}
export const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
export const initialFilters = (area = 'epidemiology'): Filters => ({
  start: today().slice(0, 7) + '-01',
  end: today(),
  area,
  source: 'combined',
  status: 'active',
  insurance: '',
  scheduleId: 'all',
  placeId: 'all',
})
export const dateOnly = (value: string) => value?.split('-').reverse().join('/') || '—'
export const timestamp = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
export const previousFilters = (f: Filters): Filters => {
  const delta = Date.parse(f.end) - Date.parse(f.start) + 86400000
  return {
    ...f,
    start: new Date(Date.parse(f.start) - delta).toISOString().slice(0, 10),
    end: new Date(Date.parse(f.start) - 86400000).toISOString().slice(0, 10),
  }
}
export const errorMessage = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } }).response?.data?.error ||
  'Não foi possível concluir. Tente novamente.'
