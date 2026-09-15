export interface SupportUserReference {
  id: number | null
  nome: string | null
}

export interface SupportAttachment {
  id: number | null
  nomeOriginal: string | null
  mimeType: string | null
  tamanhoBytes: number | null
  criadoEm: string | null
  criadoPor: SupportUserReference | null
}

export interface SupportMessage {
  id: number | null
  conteudo: string
  criadoEm: string | null
  criadoPor: SupportUserReference | null
  anexos: SupportAttachment[]
}

export interface SupportRequestSummary {
  id: number | null
  motivo: string | null
  titulo: string
  descricao: string
  status: string
  criadoEm: string | null
  atualizadoEm: string | null
  criadoPor: SupportUserReference | null
  atualizadoPor: SupportUserReference | null
  ultimaMensagem: string | null
  ultimaMensagemEm: string | null
  totalMensagens: number
}

export interface SupportRequestDetail extends SupportRequestSummary {
  mensagens: SupportMessage[]
}
