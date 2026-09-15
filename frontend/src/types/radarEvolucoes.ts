export interface RadarEvolucaoMatchPosition {
  start: number
  end: number
}

export interface RadarEvolucaoMatch {
  term: string
  positions: RadarEvolucaoMatchPosition[]
}

export interface RadarEvolucaoRegistro {
  id: string
  data: string | null
  hora: string | null
  texto: string
  medico: {
    codigo: string | null
    nome: string | null
  }
  cid: string | null
  palavrasEncontradas: RadarEvolucaoMatch[]
}

export interface RadarPacienteResumo {
  ficha: string
  paciente: {
    nome: string | null
    cpf: string | null
  }
  evolucoes: RadarEvolucaoRegistro[]
  possuiSolicitacao: boolean
}

export interface RadarConfiguracaoResponse {
  palavras: string[]
  excluir: string[]
  periodoDias: number
}

export interface RadarFiltroAplicado {
  paciente: string | null
  medico: string | null
  ficha: string | null
  palavra: string | null
  cid: string | null
}

export interface RadarEvolucoesResponse {
  config: RadarConfiguracaoResponse
  filtros: RadarFiltroAplicado
  totalFichas: number
  totalEvolucoes: number
  resultados: RadarPacienteResumo[]
}
