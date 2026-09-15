import api from '@/plugins/axios'

export interface ProcedimentoTipoIntegrado {
  id: number
  nome: string
  ativo: boolean
}

const parseId = (valor: unknown): number | null => {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return Math.trunc(valor)
  }

  if (typeof valor === 'string') {
    const numero = Number(valor.trim())
    if (Number.isFinite(numero)) {
      return Math.trunc(numero)
    }
  }

  if (typeof valor === 'bigint') {
    return Number(valor)
  }

  return null
}

const toStringOrNull = (valor: unknown): string | null => {
  if (valor === undefined || valor === null) {
    return null
  }

  if (typeof valor === 'string') {
    const texto = valor.trim()
    return texto.length ? texto : null
  }

  return String(valor).trim() || null
}

const toBoolean = (valor: unknown, padrao = true): boolean => {
  if (typeof valor === 'boolean') {
    return valor
  }

  if (typeof valor === 'number') {
    return valor !== 0
  }

  if (typeof valor === 'string') {
    const normalizado = valor.trim().toLowerCase()
    if (['0', 'false', 'nao', 'não', 'no', 'n'].includes(normalizado)) {
      return false
    }
    if (['1', 'true', 'sim', 'yes', 'y', 's'].includes(normalizado)) {
      return true
    }
  }

  return padrao
}

const normalizarTipo = (entrada: unknown): ProcedimentoTipoIntegrado | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const item = entrada as Record<string, unknown>
  const id = parseId(item.id)
  const nome = toStringOrNull(item.nome)

  if (!id || !nome) {
    return null
  }

  const ativo = toBoolean(item.ativo, true)

  return {
    id,
    nome,
    ativo,
  }
}

export const buscarTiposProcedimento = async (): Promise<ProcedimentoTipoIntegrado[]> => {
  const { data } = await api.get('/procedimento-tipos')

  if (!Array.isArray(data)) {
    return []
  }

  const tipos = data
    .map((item) => normalizarTipo(item))
    .filter((item): item is ProcedimentoTipoIntegrado => Boolean(item))

  return tipos
}

export default buscarTiposProcedimento
