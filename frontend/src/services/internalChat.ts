import api from '@/plugins/axios'

export interface InternalChatAttachment {
  nomeOriginal: string
  mimeType: string
  tamanhoBytes: number
  downloadUrl: string
}

export interface InternalChatMessage {
  id: number
  senderId: number
  recipientId: number
  content: string
  createdAt: string
  attachment: InternalChatAttachment | null
}

export interface InternalChatUser {
  id: number
  nome: string
  email: string | null
  status: string | null
  isOnline: boolean
}

export const fetchInternalChatUsers = async (): Promise<InternalChatUser[]> => {
  const { data } = await api.get('/internal-chat/users')
  return (data ?? []) as InternalChatUser[]
}

export const fetchInternalChatMessages = async (
  userId: number,
): Promise<InternalChatMessage[]> => {
  const { data } = await api.get(`/internal-chat/conversations/${userId}/messages`)
  return (data ?? []) as InternalChatMessage[]
}

interface SendMessagePayload {
  content?: string
  attachment?: File | null
}

export const sendInternalChatMessage = async (
  userId: number,
  payload: SendMessagePayload,
): Promise<InternalChatMessage> => {
  const formData = new FormData()

  const trimmedContent = payload.content?.trim()
  if (trimmedContent) {
    formData.append('content', trimmedContent)
  }

  if (payload.attachment) {
    formData.append('attachment', payload.attachment)
  }

  const { data } = await api.post(
    `/internal-chat/conversations/${userId}/messages`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )

  return data as InternalChatMessage
}

const extractFileNameFromDisposition = (value: string | undefined, fallback: string) => {
  if (!value) {
    return fallback
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match && utf8Match[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const asciiMatch = value.match(/filename="?([^";]+)"?/i)
  if (asciiMatch && asciiMatch[1]) {
    return asciiMatch[1]
  }

  return fallback
}

export const downloadInternalChatAttachment = async (messageId: number) => {
  const response = await api.get(`/internal-chat/messages/${messageId}/attachment`, {
    responseType: 'blob',
  })

  const headers = (response.headers ?? {}) as Record<string, string | undefined>
  const disposition = headers['content-disposition']
  const filename = extractFileNameFromDisposition(disposition, `anexo-${messageId}`)

  return {
    blob: response.data as Blob,
    filename,
  }
}
