import api from '@/plugins/axios'
import type {
  EsteiraProcedimentosDashboardResponse,
  EtapasResumoResponse,
  FluxoSemanalResponse,
  StatusResumoResponse,
} from '@/types/esteiraDashboard'

export interface DashboardDateFilters {
  dataInicio?: string | null
  dataFim?: string | null
  tipoData?: 'criacao' | 'ultima_movimentacao'
}

const buildDateFilterParams = (filters?: DashboardDateFilters) => {
  if (!filters) {
    return {}
  }

  const params: Record<string, string> = {}

  if (filters.dataInicio) {
    params.dataInicio = filters.dataInicio
  }

  if (filters.dataFim) {
    params.dataFim = filters.dataFim
  }

  if (filters.tipoData) {
    params.tipoData = filters.tipoData
  }

  return params
}

export const fetchEsteiraProcedimentosDashboard = async (
  filters?: DashboardDateFilters,
): Promise<EsteiraProcedimentosDashboardResponse> => {
  const params = buildDateFilterParams(filters)
  const { data } = await api.get<EsteiraProcedimentosDashboardResponse>(
    '/esteira-procedimentos/dashboard',
    { params },
  )
  return data
}

export const fetchEsteiraResumo = async (
  filters?: DashboardDateFilters,
): Promise<EtapasResumoResponse> => {
  const params = buildDateFilterParams(filters)
  const { data } = await api.get<EtapasResumoResponse>('/esteira-dashboard/resumo', { params })
  return data
}

export const fetchFluxoSemanal = async (
  weeks: number,
  filters?: DashboardDateFilters,
): Promise<FluxoSemanalResponse> => {
  const params = {
    weeks,
    ...buildDateFilterParams(filters),
  }
  const { data } = await api.get<FluxoSemanalResponse>('/esteira-dashboard/fluxo-semanal', {
    params,
  })
  return data
}

export const fetchStatusResumo = async (
  filters?: DashboardDateFilters,
): Promise<StatusResumoResponse> => {
  const params = buildDateFilterParams(filters)
  const { data } = await api.get<StatusResumoResponse>('/esteira-dashboard/status-resumo', { params })
  return data
}

export default {
  fetchEsteiraProcedimentosDashboard,
  fetchEsteiraResumo,
  fetchFluxoSemanal,
  fetchStatusResumo,
}
