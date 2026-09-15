export interface TempoMedioEtapa {
  etapaId: number | null
  etapaNome: string
  volume: number
  duracaoMediaSegundos: number | null
}

export interface LiberacaoCriticaItem {
  etapaId: number | null
  etapaNome: string
  concluido: number
  total: number
}

export interface LiberacoesCriticasResumo {
  totalSolicitacoes: number
  etapas: LiberacaoCriticaItem[]
}

export interface SolicitacoesSemanaisResumo {
  labels: string[]
  referenciaSemanas: string[]
  totals: number[]
  periodo: {
    inicio: string | null
    fim: string | null
  }
}

export interface EsteiraProcedimentosDashboardResponse {
  atualizadoEm: string | null
  liberacoesCriticas: LiberacoesCriticasResumo
  temposMedios: TempoMedioEtapa[]
  totalEtapasConcluidas: number
  temposMediosAviso: string | null
  solicitacoesSemanais: SolicitacoesSemanaisResumo
}

export interface EtapasResumoPercentuais {
  pendentes: number
  emAndamento: number
  concluidas: number
}

export interface EtapasResumo {
  pendentes: number
  emAndamento: number
  concluidas: number
  total: number
  percentuais: EtapasResumoPercentuais
  estaVazio: boolean
}

export interface EtapasResumoResponse {
  etapasResumo: EtapasResumo
  atualizadoEm: string | null
}

export interface FluxoSemanalSeries {
  criadas: number[]
  concluidas: number[]
}

export interface FluxoSemanalResponse {
  filtroSemanas: number
  filtrosDisponiveis: number[]
  periodo: {
    inicio: string | null
    fim: string | null
  }
  fluxoSemanal: {
    labels: string[]
    series: FluxoSemanalSeries
  }
}

export interface StatusResumoResponse {
  statusResumo: Record<string, number>
}
