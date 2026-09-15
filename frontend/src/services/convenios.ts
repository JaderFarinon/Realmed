import type { AxiosRequestConfig } from 'axios'
import api, { isClinicIntegrationEnabled } from '@/plugins/axios'

export const ORIGEM_INTEGRACAO = 'integracao' as const
export const ORIGEM_LOCAL = 'local' as const

export type ConvenioOrigem = typeof ORIGEM_INTEGRACAO | typeof ORIGEM_LOCAL

export interface ConvenioIntegrado {
  id: number | string
  origem: ConvenioOrigem
  nome: string
  registro_ans: string | null
  cnpj: string | null
  telefone: string | null
  email: string | null
  ativo: boolean
  raw: Record<string, unknown>
}

export interface BuscarConveniosOptions {
  termo?: string
  incluirInativos?: boolean
}

const CONVENIOS_ROUTES = ['/clinic/convenios', '/convenios'] as const

type ClinicAwareRequestConfig = AxiosRequestConfig & { skipClinicIntegration?: boolean }

const extrairLista = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    const dados = (payload as { dados?: unknown; data?: unknown }).dados
    if (Array.isArray(dados)) {
      return dados
    }

    const data = (payload as { data?: unknown }).data
    if (Array.isArray(data)) {
      return data
    }
  }

  return []
}

const toStringOrNull = (valor: unknown): string | null => {
  if (valor === undefined || valor === null) {
    return null
  }

  if (typeof valor === 'string') {
    const texto = valor.trim()
    return texto.length ? texto : null
  }

  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) {
      return null
    }
    return String(valor)
  }

  if (typeof valor === 'bigint') {
    return String(valor)
  }

  return null
}

const parseId = (valor: unknown, fallback: string): number | string => {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return valor
  }

  if (typeof valor === 'bigint') {
    return Number(valor)
  }

  if (typeof valor === 'string') {
    const texto = valor.trim()
    if (!texto) {
      return fallback
    }

    const numero = Number(texto)
    if (Number.isFinite(numero)) {
      return numero
    }

    return texto
  }

  return fallback
}

export const resolveOrigemConvenio = (valor: unknown): ConvenioOrigem => {
  if (typeof valor === 'string') {
    const normalizado = valor
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

    if (['integracao', 'integracao_clinic', 'clinic', 'externo', 'external'].includes(normalizado)) {
      return ORIGEM_INTEGRACAO
    }
  }

  return ORIGEM_LOCAL
}

const resolveBoolean = (valor: unknown, padrao = true): boolean => {
  if (typeof valor === 'boolean') {
    return valor
  }

  if (typeof valor === 'number') {
    return valor !== 0
  }

  if (typeof valor === 'string') {
    const normalizado = valor.trim().toLowerCase()
    if (['0', 'false', 'f', 'nao', 'não', 'n', 'off'].includes(normalizado)) {
      return false
    }
    if (['1', 'true', 't', 'sim', 's', 'y', 'yes', 'on'].includes(normalizado)) {
      return true
    }
  }

  return padrao
}

const normalizarConvenio = (entrada: unknown, origemPadrao?: ConvenioOrigem): ConvenioIntegrado | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const item = entrada as Record<string, unknown>

  const nome =
    toStringOrNull(item.nome) ||
    toStringOrNull(item.tbDescricao) ||
    toStringOrNull(item.descricao) ||
    ''

  if (!nome) {
    return null
  }

  const registroAns =
    toStringOrNull(item.registro_ans) ||
    toStringOrNull(item.tbRegistroANS) ||
    toStringOrNull(item.registroANS) ||
    null

  const fallbackId =
    toStringOrNull(item.id)?.trim() ||
    registroAns ||
    toStringOrNull(item.cnpj) ||
    toStringOrNull(item.telefone) ||
    nome

  const id = parseId(item.id ?? item.tbCodigo ?? item.codigo, fallbackId || nome)

  const cnpj = toStringOrNull(item.cnpj) || toStringOrNull(item.tbCNPJ)
  const telefone = toStringOrNull(item.telefone) || toStringOrNull(item.tbTelefone)
  const email = toStringOrNull(item.email) || toStringOrNull(item.tbEmail)

  const origemBruta = item.origem ?? item.fonte_dados ?? item.source
  const origem =
    origemBruta !== undefined && origemBruta !== null
      ? resolveOrigemConvenio(origemBruta)
      : origemPadrao ?? ORIGEM_LOCAL
  const ativo = resolveBoolean(item.ativo ?? item.ie_status ?? item.status ?? item.tbStatus ?? true)

  return {
    id,
    origem,
    nome,
    registro_ans: registroAns,
    cnpj,
    telefone,
    email,
    ativo,
    raw: item,
  }
}

const ordenarConvenios = (lista: ConvenioIntegrado[]) =>
  lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

const adicionarConveniosUnicos = (
  destino: Map<string, ConvenioIntegrado>,
  payload: unknown,
  incluirInativos: boolean,

  origemPadrao?: ConvenioOrigem,
) => {
  const normalizados = extrairLista(payload)
    .map((item) => normalizarConvenio(item, origemPadrao))
    .filter((item): item is ConvenioIntegrado => Boolean(item))
    .filter((item) => incluirInativos || item.ativo)

  for (const convenio of normalizados) {
    const chave = `${convenio.origem}:${String(convenio.id)}`
    if (!destino.has(chave)) {
      destino.set(chave, convenio)
    }
  }
}

export const buscarConveniosIntegrados = async (
  opcoes: BuscarConveniosOptions = {},
): Promise<ConvenioIntegrado[]> => {
  const { termo, incluirInativos = true } = opcoes
  const params = termo ? { search: termo } : undefined
  const unicos = new Map<string, ConvenioIntegrado>()

  if (isClinicIntegrationEnabled) {

    const rotasIntegradas: Array<{
      rota: string
      origemPadrao: ConvenioOrigem
      config?: ClinicAwareRequestConfig
    }> = [
      {
        rota: '/clinic/convenios',
        origemPadrao: ORIGEM_INTEGRACAO,
        config: params ? { params } : undefined,
      },
      {
        rota: '/convenios',
        origemPadrao: ORIGEM_LOCAL,

        config: params
          ? { params, skipClinicIntegration: true }
          : { skipClinicIntegration: true },
      },
    ]

    let ultimoErro: unknown = null


    for (const { rota, config, origemPadrao } of rotasIntegradas) {
      try {
        const { data } = await api.get(rota, config)
        adicionarConveniosUnicos(unicos, data, incluirInativos, origemPadrao)

      } catch (erro) {
        ultimoErro = erro
      }
    }

    if (!unicos.size && ultimoErro) {
      throw ultimoErro
    }

    return ordenarConvenios(Array.from(unicos.values()))
  }

  let ultimoErro: unknown = null

  for (const rota of CONVENIOS_ROUTES) {
    try {
      const { data } = await api.get(rota, params ? { params } : undefined)

      const origemPadrao = rota.startsWith('/clinic') ? ORIGEM_INTEGRACAO : ORIGEM_LOCAL
      adicionarConveniosUnicos(unicos, data, incluirInativos, origemPadrao)

    } catch (erro) {
      ultimoErro = erro
    }
  }

  if (!unicos.size) {
    if (ultimoErro) {
      throw ultimoErro
    }

    return []
  }

  return ordenarConvenios(Array.from(unicos.values()))
}

export const formatarOrigemConvenio = (origem: ConvenioOrigem): string =>
  origem === ORIGEM_INTEGRACAO ? 'Externo' : 'Interno'
