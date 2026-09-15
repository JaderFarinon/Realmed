const MOTIVO_LABELS: Record<string, string> = {
  melhoria: 'Sugestão de Melhoria',
  'duvida_problema': 'Dúvida ou Problema',
  'dúvida_problema': 'Dúvida ou Problema',
}

const STATUS_LABELS: Record<string, string> = {
  aguardando_suporte: 'Aguardando suporte',
  aguardando_usuario: 'Aguardando usuário',
  fechado: 'Encerrado',
}

export const getSupportMotivoLabel = (motivo: string | null | undefined): string => {
  if (!motivo) {
    return 'Outro'
  }

  const chave = motivo.toLowerCase()
  return MOTIVO_LABELS[chave] ?? 'Outro'
}

export const getSupportStatusLabel = (status: string | null | undefined): string => {
  if (!status) {
    return STATUS_LABELS.aguardando_suporte
  }

  const chave = status.toLowerCase()
  return STATUS_LABELS[chave] ?? STATUS_LABELS.aguardando_suporte
}

export const getSupportStatusBadgeClass = (status: string | null | undefined): string => {
  const chave = status?.toLowerCase?.() ?? ''

  if (chave === 'aguardando_usuario') {
    return 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/40'
  }

  if (chave === 'fechado') {
    return 'bg-gray-200 text-gray-700 ring-gray-300 dark:bg-gray-700/40 dark:text-gray-200 dark:ring-gray-600/60'
  }

  return 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/40'
}

export const formatSupportDateTime = (valor: string | null | undefined): string => {
  if (!valor) {
    return '-'
  }

  try {
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) {
      return '-'
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(data)
  } catch (error) {
    return '-'
  }
}

export const formatSupportDate = (valor: string | null | undefined): string => {
  if (!valor) {
    return '-'
  }

  try {
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) {
      return '-'
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
    }).format(data)
  } catch (error) {
    return '-'
  }
}

export const formatSupportFileSize = (tamanho: number | null | undefined): string => {
  if (typeof tamanho !== 'number' || !Number.isFinite(tamanho) || tamanho <= 0) {
    return '-'
  }

  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let valor = tamanho
  let indice = 0

  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024
    indice += 1
  }

  return `${valor.toFixed(valor >= 10 || indice === 0 ? 0 : 1)} ${unidades[indice]}`
}
