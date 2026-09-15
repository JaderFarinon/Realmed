export const extractSurgicalRequestId = (
  dados?: Record<string, unknown> | null,
): string => {
  if (!dados) {
    return ''
  }

  const chaves = [
    'id',
    'esteira_procedimento_id',
    'esteiraProcedimentoId',
    'solicitacao_id',
    'solicitacaoId',
    'numero_liberacao',
    'numeroLiberacao',
    'numero',
    'codigo',
  ]

  for (const chave of chaves) {
    if (Object.prototype.hasOwnProperty.call(dados, chave)) {
      const valor = dados[chave]
      if (valor !== undefined && valor !== null) {
        const texto = String(valor).trim()
        if (texto.length) {
          return texto
        }
      }
    }
  }

  return ''
}

export const cloneSurgicalRequestData = <T extends Record<string, unknown>>(dados: T): T => {
  return JSON.parse(JSON.stringify(dados)) as T
}
