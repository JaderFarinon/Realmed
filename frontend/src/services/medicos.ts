import api, { isClinicIntegrationEnabled } from '@/plugins/axios'

export const ORIGEM_INTEGRACAO = 'integracao' as const
export const ORIGEM_LOCAL = 'local' as const

export type MedicoOrigem = typeof ORIGEM_INTEGRACAO | typeof ORIGEM_LOCAL

export interface MedicoIntegrado {
  id: string
  origem: MedicoOrigem
  nome_completo: string
  conselho: string
  crm_numero: string
  crm_numero_original: string | null
  crm_numero_correcao: string | null
  crm_uf: string | null
  corpo_clinico: string | null
  cpf: string | null
  telefone_principal: string | null
  email: string | null
  especialidade: string | null
  ie_status: number
  raw: Record<string, unknown>
}

export interface BuscarMedicosOptions {
  apenasAtivos?: boolean
}

const MEDICOS_ROUTES = ['/clinic/medicos', '/medicos'] as const

const appendQueryParams = (url: string, params: Record<string, string | number | boolean>) => {
  if (!params || Object.keys(params).length === 0) {
    return url
  }

  const [basePath, existingQuery = ''] = url.split('?')
  const searchParams = new URLSearchParams(existingQuery)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}

interface ConsultaMedicosResultado {
  rota: string
  data: unknown | null
  erro: unknown | null
}

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

export const resolveOrigemMedico = (valor: unknown): MedicoOrigem => {
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

const normalizarMedico = (entrada: unknown): MedicoIntegrado | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const item = entrada as Record<string, unknown>

  const nome =
    toStringOrNull(item.nome_completo) ||
    toStringOrNull(item.nome) ||
    toStringOrNull(item.tbNome) ||
    ''

  if (!nome) {
    return null
  }

  const crmNumero =
    toStringOrNull(item.crm_numero) ||
    toStringOrNull(item.crm_numero_original) ||
    toStringOrNull(item.tbNumConselho) ||
    toStringOrNull(item.crm) ||
    toStringOrNull(item.tbCRM) ||
    ''

  const crmNumeroOriginal =
    toStringOrNull(item.crm_numero_original) ||
    toStringOrNull(item.tbCRM) ||
    (crmNumero ? crmNumero : null)

  const crmNumeroCorrecao =
    toStringOrNull(item.crm_numero_correcao) ||
    toStringOrNull(item.tbCRMCorrecao) ||
    null

  const rawId =
    toStringOrNull(item.id) ||
    crmNumero ||
    crmNumeroOriginal ||
    toStringOrNull(item.codigo) ||
    toStringOrNull(item.codigo_medico_clinic) ||
    toStringOrNull(item.tbCRM) ||
    nome

  if (!rawId) {
    return null
  }

  const origem = resolveOrigemMedico(item.origem)

  let ieStatus = 1
  const statusBruto = item.ie_status
  if (statusBruto !== undefined && statusBruto !== null) {
    if (typeof statusBruto === 'string') {
      ieStatus = Number(statusBruto.trim()) ? 1 : 0
    } else if (typeof statusBruto === 'number') {
      ieStatus = Number(statusBruto) ? 1 : 0
    } else if (typeof statusBruto === 'boolean') {
      ieStatus = statusBruto ? 1 : 0
    }
  }

  return {
    id: String(rawId),
    origem,
    nome_completo: nome,
    conselho: toStringOrNull(item.conselho) || 'CRM',
    crm_numero: crmNumero ? String(crmNumero) : '',
    crm_numero_original: crmNumeroOriginal ? String(crmNumeroOriginal) : null,
    crm_numero_correcao: crmNumeroCorrecao ? String(crmNumeroCorrecao) : null,
    crm_uf: toStringOrNull(item.crm_uf) || toStringOrNull(item.tbUF),
    corpo_clinico: toStringOrNull(item.corpo_clinico) || toStringOrNull(item.tbCorpoClinico),
    cpf: toStringOrNull(item.cpf) || toStringOrNull(item.tbCPF),
    telefone_principal: toStringOrNull(item.telefone_principal) || toStringOrNull(item.tbCelular),
    email: toStringOrNull(item.email) || toStringOrNull(item.tbEmail),
    especialidade: toStringOrNull(item.especialidade) || null,
    ie_status: ieStatus,
    raw: item,
  }
}

const ordenarMedicos = (lista: MedicoIntegrado[]) =>
  lista.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'))

export const buscarMedicosIntegrados = async (
  opcoes: BuscarMedicosOptions = {},
): Promise<MedicoIntegrado[]> => {
  const { apenasAtivos = true } = opcoes
  const queryParams: Record<string, string | number | boolean> = apenasAtivos ? { status: 1 } : {}

  const rotas = isClinicIntegrationEnabled
    ? [
        appendQueryParams(MEDICOS_ROUTES[0], queryParams),
        appendQueryParams(`${MEDICOS_ROUTES[1]}?origem=local`, queryParams),
      ]
    : [appendQueryParams(MEDICOS_ROUTES[1], queryParams)]

  const respostas = await Promise.all(
    rotas.map(async (rota): Promise<ConsultaMedicosResultado> => {
      try {
        const { data } = await api.get(rota)
        return { rota, data, erro: null }
      } catch (erro) {
        return { rota, data: null, erro }
      }
    }),
  )

  const unicos = new Map<string, MedicoIntegrado>()
  let ultimoErro: unknown = null
  let houveRespostaBemSucedida = false

  for (const resposta of respostas) {
    if (resposta.erro) {
      ultimoErro = resposta.erro
      continue
    }

    houveRespostaBemSucedida = true
    const normalizados = extrairLista(resposta.data)
      .map((item) => normalizarMedico(item))
      .filter((item): item is MedicoIntegrado => Boolean(item))

    for (const medico of normalizados) {
      const chave = `${medico.origem}:${medico.id}`
      if (!unicos.has(chave)) {
        unicos.set(chave, medico)
      }
    }
  }

  if (!houveRespostaBemSucedida && ultimoErro) {
    throw ultimoErro
  }

  return ordenarMedicos(Array.from(unicos.values()))
}

export const formatarOrigemMedico = (origem: MedicoOrigem): string =>
  origem === ORIGEM_INTEGRACAO ? 'Externo' : 'Interno'
