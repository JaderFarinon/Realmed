import api from '@/plugins/axios'
import type {
  SupportAttachment,
  SupportMessage,
  SupportRequestDetail,
  SupportRequestSummary,
  SupportUserReference,
} from '@/types/support'

const normalizeUserReference = (entrada: any): SupportUserReference | null => {
  if (!entrada || typeof entrada !== 'object') {
    return { id: null, nome: null }
  }

  const idBruto = 'id' in entrada ? Number((entrada as any).id) : Number((entrada as any).created_by)
  const nomeBruto = (entrada as any).nome ?? (entrada as any).autor_nome ?? null

  return {
    id: Number.isFinite(idBruto) ? Number(idBruto) : null,
    nome: typeof nomeBruto === 'string' && nomeBruto.trim().length ? nomeBruto : null,
  }
}

const normalizeAttachment = (entrada: any): SupportAttachment => {
  const userRef = normalizeUserReference(entrada)

  return {
    id: Number.isFinite(Number(entrada?.id)) ? Number(entrada.id) : null,
    nomeOriginal:
      typeof entrada?.nomeOriginal === 'string'
        ? entrada.nomeOriginal
        : typeof entrada?.nome_original === 'string'
          ? entrada.nome_original
          : null,
    mimeType:
      typeof entrada?.mimeType === 'string'
        ? entrada.mimeType
        : typeof entrada?.mime_type === 'string'
          ? entrada.mime_type
          : null,
    tamanhoBytes:
      Number.isFinite(Number(entrada?.tamanhoBytes))
        ? Number(entrada.tamanhoBytes)
        : Number.isFinite(Number(entrada?.tamanho_bytes))
          ? Number(entrada.tamanho_bytes)
          : null,
    criadoEm:
      typeof entrada?.criadoEm === 'string'
        ? entrada.criadoEm
        : typeof entrada?.created_at === 'string'
          ? entrada.created_at
          : entrada?.created_at instanceof Date
            ? entrada.created_at.toISOString()
            : null,
    criadoPor: userRef,
  }
}

const normalizeMessage = (entrada: any): SupportMessage => {
  const anexosEntrada = Array.isArray(entrada?.anexos)
    ? entrada.anexos
    : Array.isArray(entrada?.attachments)
      ? entrada.attachments
      : []

  const anexos = anexosEntrada.map((item: any) => normalizeAttachment(item))

  const criadoEmValor = entrada?.criadoEm ?? entrada?.created_at

  return {
    id: Number.isFinite(Number(entrada?.id)) ? Number(entrada.id) : null,
    conteudo:
      typeof entrada?.conteudo === 'string'
        ? entrada.conteudo
        : typeof entrada?.mensagem === 'string'
          ? entrada.mensagem
          : '',
    criadoEm:
      typeof criadoEmValor === 'string'
        ? criadoEmValor
        : criadoEmValor instanceof Date
          ? criadoEmValor.toISOString()
          : null,
    criadoPor: normalizeUserReference(entrada?.criadoPor ?? entrada),
    anexos,
  }
}

const normalizeRequestSummary = (entrada: any): SupportRequestSummary => {
  const criadoEmValor = entrada?.criadoEm ?? entrada?.created_at
  const atualizadoEmValor = entrada?.atualizadoEm ?? entrada?.updated_at

  return {
    id: Number.isFinite(Number(entrada?.id)) ? Number(entrada.id) : null,
    motivo:
      typeof entrada?.motivo === 'string'
        ? entrada.motivo
        : typeof entrada?.motivo_chave === 'string'
          ? entrada.motivo_chave
          : null,
    titulo: typeof entrada?.titulo === 'string' ? entrada.titulo : '',
    descricao: typeof entrada?.descricao === 'string' ? entrada.descricao : '',
    status: typeof entrada?.status === 'string' ? entrada.status : 'aguardando_suporte',
    criadoEm:
      typeof criadoEmValor === 'string'
        ? criadoEmValor
        : criadoEmValor instanceof Date
          ? criadoEmValor.toISOString()
          : null,
    atualizadoEm:
      typeof atualizadoEmValor === 'string'
        ? atualizadoEmValor
        : atualizadoEmValor instanceof Date
          ? atualizadoEmValor.toISOString()
          : null,
    criadoPor: normalizeUserReference(entrada?.criadoPor ?? entrada),
    atualizadoPor: normalizeUserReference(entrada?.atualizadoPor ?? { id: entrada?.updated_by, nome: entrada?.atualizado_por_nome }),
    ultimaMensagem: typeof entrada?.ultimaMensagem === 'string' ? entrada.ultimaMensagem : entrada?.ultima_mensagem ?? null,
    ultimaMensagemEm:
      typeof entrada?.ultimaMensagemEm === 'string'
        ? entrada.ultimaMensagemEm
        : typeof entrada?.ultima_mensagem_em === 'string'
          ? entrada.ultima_mensagem_em
          : null,
    totalMensagens:
      Number.isFinite(Number(entrada?.totalMensagens))
        ? Number(entrada.totalMensagens)
        : Number.isFinite(Number(entrada?.total_mensagens))
          ? Number(entrada.total_mensagens)
          : 0,
  }
}

const normalizeRequestDetail = (entrada: any): SupportRequestDetail => {
  const resumo = normalizeRequestSummary(entrada)
  const mensagensEntrada = Array.isArray(entrada?.mensagens) ? entrada.mensagens : []

  return {
    ...resumo,
    mensagens: mensagensEntrada.map((item: any) => normalizeMessage(item)),
  }
}

export const fetchSupportRequests = async (status?: string): Promise<SupportRequestSummary[]> => {
  const params = status ? { status } : undefined
  const { data } = await api.get('/suporte/solicitacoes', { params })

  if (!Array.isArray(data)) {
    return []
  }

  return data.map((item: any) => normalizeRequestSummary(item))
}

export const fetchSupportRequestDetail = async (id: number): Promise<SupportRequestDetail> => {
  const { data } = await api.get(`/suporte/solicitacoes/${id}`)
  return normalizeRequestDetail(data)
}

interface CreateSupportRequestPayload {
  motivo: string
  titulo: string
  descricao: string
  anexos?: File[]
}

export const createSupportRequest = async (
  payload: CreateSupportRequestPayload,
): Promise<SupportRequestDetail> => {
  const formData = new FormData()
  formData.append('motivo', payload.motivo)
  formData.append('titulo', payload.titulo)
  formData.append('descricao', payload.descricao)

  if (Array.isArray(payload.anexos)) {
    payload.anexos.forEach((arquivo) => {
      formData.append('anexos', arquivo)
    })
  }

  const { data } = await api.post('/suporte/solicitacoes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return normalizeRequestDetail(data)
}

export const sendSupportMessage = async (
  solicitacaoId: number,
  conteudo: string,
): Promise<{ mensagem: SupportMessage | null; resumo: SupportRequestSummary | null }> => {
  const { data } = await api.post(`/suporte/solicitacoes/${solicitacaoId}/mensagens`, {
    conteudo,
  })

  const mensagem = data?.mensagem ? normalizeMessage(data.mensagem) : null
  const resumo = data?.resumo ? normalizeRequestSummary(data.resumo) : null

  return { mensagem, resumo }
}

export const uploadSupportAttachments = async (
  solicitacaoId: number,
  arquivos: File[],
): Promise<{ mensagem: SupportMessage | null; resumo: SupportRequestSummary | null }> => {
  if (!Array.isArray(arquivos) || !arquivos.length) {
    return { mensagem: null, resumo: null }
  }

  const formData = new FormData()
  arquivos.forEach((arquivo) => formData.append('anexos', arquivo))

  const { data } = await api.post(
    `/suporte/solicitacoes/${solicitacaoId}/mensagens/anexos`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )

  const mensagem = data?.mensagem ? normalizeMessage(data.mensagem) : null
  const resumo = data?.resumo ? normalizeRequestSummary(data.resumo) : null

  return { mensagem, resumo }
}

const parseFilenameFromDisposition = (valor?: string): string | null => {
  if (!valor || typeof valor !== 'string') {
    return null
  }

  const utf8Match = valor.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch (error) {
      return utf8Match[1]
    }
  }

  const asciiMatch = valor.match(/filename="?([^";]+)"?/i)
  if (asciiMatch && asciiMatch[1]) {
    return asciiMatch[1]
  }

  return null
}

export const downloadSupportAttachment = async (
  attachmentId: number,
): Promise<{ blob: Blob; filename: string; mimeType: string }> => {
  const response = await api.get(`/suporte/anexos/${attachmentId}/download`, {
    responseType: 'blob',
  })

  const mimeType = typeof response.headers?.['content-type'] === 'string'
    ? response.headers['content-type']
    : 'application/octet-stream'

  const filename =
    parseFilenameFromDisposition(response.headers?.['content-disposition']) || `anexo-suporte-${attachmentId}`

  const blob = new Blob([response.data], { type: mimeType })
  return { blob, filename, mimeType }
}
