import api from '@/plugins/axios'

export const ORIGEM_INTEGRACAO = 'integracao' as const
export const ORIGEM_LOCAL = 'local' as const

export type PacienteOrigem = typeof ORIGEM_INTEGRACAO | typeof ORIGEM_LOCAL

export interface PacienteIntegrado {
  id: number | string
  clinic_id: number | string | null
  nome_completo: string
  nome_social: string | null
  data_nascimento: string | null
  sexo: string | null
  cpf: string | null
  telefone_principal: string | null
  telefone_celular: string | null
  telefone_comercial: string | null
  email: string | null
  endereco_logradouro: string | null
  endereco_cidade: string | null
  endereco_uf: string | null
  endereco_cep: string | null
  nome_mae: string | null
  nome_pai: string | null
  estado_civil: string | null
  profissao: string | null
  ie_status: boolean | null
  origem: PacienteOrigem
  raw: Record<string, unknown>
}

export interface BuscarPacientesOptions {
  termo?: string
  cpf?: string
  status?: string | number | null
}

const PACIENTES_ROUTES = ['/clinic/pacientes', '/pacientes'] as const

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

const sanitizeDigits = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\D/g, '')
}

const normalizeString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized || null
}

const normalizeStatus = (value: unknown): boolean | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return null
    if (['1', 'true', 't', 's', 'sim', 'y', 'yes'].includes(normalized)) return true
    if (['0', 'false', 'f', 'n', 'nao', 'não', 'no'].includes(normalized)) return false
  }
  return null
}

const toIsoDate = (value: unknown): string | null => {
  if (!value && value !== 0) return null
  if (typeof value === 'string') {
    if (value.length >= 10) {
      return value.slice(0, 10)
    }
    return value || null
  }
  const date = value instanceof Date ? value : new Date(value as number)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

const resolveId = (value: unknown): string | number | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  return null
}

const resolveOrigem = (valor: unknown): PacienteOrigem => {
  if (typeof valor === 'string') {
    const normalized = valor
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
    if (['integracao', 'integracao_clinic', 'clinic', 'externo', 'external'].includes(normalized)) {
      return ORIGEM_INTEGRACAO
    }
  }
  return ORIGEM_LOCAL
}

const normalizarPaciente = (entrada: unknown): PacienteIntegrado | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const item = entrada as Record<string, unknown>

  const nomeCompleto =
    normalizeString(item.nome_completo) ||
    normalizeString(item.nome) ||
    normalizeString(item.tbNome) ||
    ''

  if (!nomeCompleto) {
    return null
  }

  const cpfDigits = sanitizeDigits(item.cpf ?? item.tbCPF)
  const resolvedId =
    resolveId(item.id) ??
    resolveId(item.clinic_id) ??
    (cpfDigits || normalizeString(item.codigo) || nomeCompleto)
  const idValue =
    resolvedId ?? `paciente-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

  const telefonePrincipal =
    normalizeString(item.telefone_principal ?? item.telefone ?? item.tbFoneRes) ??
    null
  const telefoneCelular =
    normalizeString(item.telefone_celular ?? item.tbCelular ?? item.celular) ??
    null
  const telefoneComercial =
    normalizeString(item.telefone_comercial ?? item.tbFoneCom ?? item.telefone_comercial1) ??
    null

  return {
    id: typeof idValue === 'number' || typeof idValue === 'string' ? idValue : String(idValue),
    clinic_id: resolveId(item.clinic_id),
    nome_completo: nomeCompleto,
    nome_social: normalizeString(item.nome_social ?? item.tbNomeSocial),
    data_nascimento: toIsoDate(item.data_nascimento ?? item.tbDtNasc),
    sexo: normalizeString(item.sexo ?? item.tbSexo),
    cpf: cpfDigits || null,
    telefone_principal: telefonePrincipal,
    telefone_celular: telefoneCelular,
    telefone_comercial: telefoneComercial,
    email: normalizeString(item.email ?? item.tbEmail),
    endereco_logradouro: normalizeString(item.endereco_logradouro ?? item.tbEndereco),
    endereco_cidade: normalizeString(item.endereco_cidade ?? item.tbCidade),
    endereco_uf: normalizeString(item.endereco_uf ?? item.tbEstado),
    endereco_cep: sanitizeDigits(item.endereco_cep ?? item.tbCEP) || null,
    nome_mae: normalizeString(item.nome_mae ?? item.tbNomeMae),
    nome_pai: normalizeString(item.nome_pai ?? item.tbNomePai),
    estado_civil: normalizeString(item.estado_civil ?? item.tbEstadoCivil),
    profissao: normalizeString(item.profissao ?? item.tbProfissao),
    ie_status: normalizeStatus(item.ie_status ?? item.status ?? item.tbStatus),
    origem: resolveOrigem(item.origem ?? item.fonte_dados ?? item.source),
    raw: item,
  }
}

const ordenarPacientes = (lista: PacienteIntegrado[]) =>
  lista.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'))

export const buscarPacientesIntegrados = async (
  opcoes: BuscarPacientesOptions = {},
): Promise<PacienteIntegrado[]> => {
  const { termo, cpf, status } = opcoes
  const params: Record<string, unknown> = {}

  if (termo) params.q = termo
  if (cpf) params.cpf = cpf
  if (status !== undefined && status !== null && status !== '') params.status = status

  const resultados = new Map<string, PacienteIntegrado>()
  let ultimoErro: unknown = null

  for (const rota of PACIENTES_ROUTES) {
    try {
      const { data } = await api.get(rota, Object.keys(params).length ? { params } : undefined)
      const normalizados = extrairLista(data)
        .map((item) => normalizarPaciente(item))
        .filter((item): item is PacienteIntegrado => Boolean(item))

      for (const paciente of normalizados) {
        const chave = `${paciente.origem}:${String(paciente.id)}`
        if (!resultados.has(chave)) {
          resultados.set(chave, paciente)
        }
      }
    } catch (erro) {
      ultimoErro = erro
    }
  }

  const listaFinal = ordenarPacientes(Array.from(resultados.values()))

  if (!listaFinal.length && ultimoErro) {
    throw ultimoErro
  }

  return listaFinal
}

export const formatarOrigemPaciente = (origem: PacienteOrigem): string =>
  origem === ORIGEM_INTEGRACAO ? 'Integração' : 'Interno'
