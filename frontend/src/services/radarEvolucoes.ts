import api from '@/plugins/axios'
import type { RadarEvolucoesResponse } from '@/types/radarEvolucoes'

export interface RadarEvolucoesQuery {
  paciente?: string
  medico?: string
  ficha?: string
  palavra?: string
  cid?: string
  dias?: number
}

const buildQueryParams = (filtros?: RadarEvolucoesQuery) => {
  if (!filtros) {
    return {}
  }

  const params: Record<string, string> = {}

  if (filtros.paciente) {
    params.paciente = filtros.paciente
  }

  if (filtros.medico) {
    params.medico = filtros.medico
  }

  if (filtros.ficha) {
    params.ficha = filtros.ficha
  }

  if (filtros.palavra) {
    params.palavra = filtros.palavra
  }

  if (filtros.cid) {
    params.cid = filtros.cid
  }

  if (typeof filtros.dias === 'number' && Number.isFinite(filtros.dias)) {
    params.dias = String(Math.trunc(filtros.dias))
  }

  return params
}

export const fetchRadarEvolucoes = async (
  filtros?: RadarEvolucoesQuery,
): Promise<RadarEvolucoesResponse> => {
  const params = buildQueryParams(filtros)
  const { data } = await api.get<RadarEvolucoesResponse>('/radar-evolucoes', {
    params,
  })
  return data
}

export default {
  fetchRadarEvolucoes,
}
