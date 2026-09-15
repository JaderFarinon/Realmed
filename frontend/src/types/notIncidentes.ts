export interface NotificacaoFiltro {
  dsPaciente?: string
  dsClass?: string
  cdMedico?: number | null
  cdSetorNotificador?: number | null
  cdIncidente?: number | null
  cdResponsavel?: number | null
  ieFinalizado?: number | null
}

export interface NotificacaoIncidente {
  id: number
  nmCriador: string | null
  dsSetor: string
  dsFato: string
  dsConseq: string
  dsAcao: string
  dsConseqDet: string
  dtIncidente: string
  dsMaquina: string | null
  status: string
  nmMedico: string | null
  nmPaciente: string | null
  dsIncidente: string
  dsSubtipoIncidente: string | null
  nrAtendimento: string | null
  dtAtendimento: string | null
  dsMedicoResponsavel: string | null
  dsProtocolo: string | null
  dsCateter: string | null
  cdPaciente: string | null
  escalaNews: string | null
  dtCadastro: string | null
  cdEscalaNews: number | null
  dsEmail: string | null
  preProcessamento?: PreProcessamento | null
  posProcessamento?: PosProcessamento | null
  diagramas?: Diagramas | null
  responsavel?: RespNotificacao | null
}

export interface PreProcessamento {
  id?: number
  idIncidente: number
  dsClass: string
  dtPreProcessamento: string
  cdResponsavel: number | null
  dsResponsavel: string | null
  dsMotivoClassificacao: string | null
  dsRespostaProcesso: string | null
}

export interface PosProcessamento {
  id?: number
  idNotificacao: number
  gravidade: string | null
  dsGravidade: string | null
  dsProtocoloSeguranca: string | null
  dsEventoRelacao: string | null
  dsProdutoRelacao: string | null
  numeroLote: string | null
  numeroRegistroAnvisa: string | null
  dsFornecedor: string | null
  dsRelacaoOpcional: string | null
  dsIshikawa: string | null
  dtIshikawa: string | null
  dsBowTie: string | null
  dtBowTie: string | null
  dsNaranjo: string | null
  dtNaranjo: string | null
  dsAcao1_1: string | null
  dsAcao1_2: string | null
  dsAcao1_3: string | null
  dsAcao1_4: string | null
  dsAcao2_1: string | null
  dsAcao2_2: string | null
  dsAcao2_3: string | null
  dsAcao2_4: string | null
  dsAcao3_1: string | null
  dsAcao3_2: string | null
  dsAcao3_3: string | null
  dsAcao3_4: string | null
  dtPosProcessamento: string | null
  dsJustificativaRelacao: string | null
  avaliacaoEficacia: string | null
  avaliacaoEvidencias: string | null
}

export interface DiagramaIshikawa {
  id?: number
  idNot: number
  dtDiagrama: string
  tarefa1: string | null
  tarefa2: string | null
  ambiente1: string | null
  ambiente2: string | null
  paciente1: string | null
  paciente2: string | null
  gestao1: string | null
  gestao2: string | null
  equipe1: string | null
  equipe2: string | null
  individuo1: string | null
  individuo2: string | null
  comunica: string | null
}

export interface DiagramaBowTie {
  id?: number
  idNot: number
  dtDiagrama: string
  ameaca1: string | null
  ameaca2: string | null
  ameaca3: string | null
  ameaca4: string | null
  ameaca5: string | null
  barreira1: string | null
  barreira2: string | null
  barreira3: string | null
  evento: string | null
  mitigacao1: string | null
  mitigacao2: string | null
  mitigacao3: string | null
  dano1: string | null
  dano2: string | null
  dano3: string | null
  dano4: string | null
  dano5: string | null
}

export interface DiagramaNaranjo {
  id?: number
  idNot: number
  dtDiagrama: string
  questao1: number | null
  questao2: number | null
  questao3: number | null
  questao4: number | null
  questao5: number | null
  questao6: number | null
  questao7: number | null
  questao8: number | null
  questao9: number | null
  questao10: number | null
  soma: number | null
}

export interface Diagramas {
  ishikawa?: DiagramaIshikawa | null
  bowTie?: DiagramaBowTie | null
  naranjo?: DiagramaNaranjo | null
}

export interface RespNotificacao {
  id: number
  dsResp: string
  userCadastro: string
  dtCadastro: string
}

export interface PermissaoNotificacao {
  id: number
  idUser: number
  preProc: number
  nucSeg: number
  adm: number
  comissoes: number
  qualidade: number
  compras: number
  pesquisa: number
}

export interface NotificacaoTipo {
  id: number
  ieSubIncidente: number
  dsTipo: string
  ieQualidade: number
  iePesquisa: number
  dtCadastro: string
  usrCadastro: string
}
