export const DEFAULT_ATTACHMENT_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'png',
  'jpg',
  'jpeg',
] as const

export const DEFAULT_ATTACHMENT_ACCEPT = DEFAULT_ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(',')

export const DEFAULT_ATTACHMENT_EXTENSIONS_LABEL = DEFAULT_ATTACHMENT_EXTENSIONS.map((ext) => ext.toUpperCase()).join(', ')

const DEFAULT_ATTACHMENT_EXTENSIONS_SET = new Set<string>(DEFAULT_ATTACHMENT_EXTENSIONS)

export const isDefaultAttachmentAllowed = (file: File): boolean => {
  const parts = file.name.split('.')
  const extension = parts.length > 1 ? parts.pop() || '' : ''
  return DEFAULT_ATTACHMENT_EXTENSIONS_SET.has(extension.toLowerCase())
}

export const splitAttachmentsByValidity = (files: File[]) => {
  const valid: File[] = []
  const invalid: File[] = []

  files.forEach((file) => {
    if (isDefaultAttachmentAllowed(file)) {
      valid.push(file)
    } else {
      invalid.push(file)
    }
  })

  return { valid, invalid }
}
