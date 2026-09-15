import api from '@/plugins/axios'
import type {
  SurgicalRequestChatMessage,
  SurgicalRequestTimelineResponse,
} from '@/types/surgicalRequests'

export const fetchSurgicalRequestTimeline = async (
  id: string | number,
): Promise<SurgicalRequestTimelineResponse> => {
  const encodedId = encodeURIComponent(String(id))
  const { data } = await api.get<SurgicalRequestTimelineResponse>(
    `/esteira-procedimentos/${encodedId}/timeline`,
  )
  return data
}

export const fetchSurgicalRequestChatMessages = async (
  id: string | number,
): Promise<SurgicalRequestChatMessage[]> => {
  const encodedId = encodeURIComponent(String(id))
  const { data } = await api.get<SurgicalRequestChatMessage[]>(
    `/esteira-procedimentos/${encodedId}/chat/mensagens`,
  )
  return Array.isArray(data) ? data : []
}

export const postSurgicalRequestChatMessage = async (
  id: string | number,
  conteudo: string,
): Promise<SurgicalRequestChatMessage> => {
  const encodedId = encodeURIComponent(String(id))
  const { data } = await api.post<SurgicalRequestChatMessage>(
    `/esteira-procedimentos/${encodedId}/chat/mensagens`,
    { conteudo },
  )
  return data
}

export const uploadSurgicalRequestChatAttachment = async (
  id: string | number,
  arquivo: File,
): Promise<SurgicalRequestChatMessage | null> => {
  const encodedId = encodeURIComponent(String(id))
  const formData = new FormData()
  formData.append('arquivo', arquivo)

  const { data } = await api.post<SurgicalRequestChatMessage | null>(
    `/esteira-procedimentos/${encodedId}/chat/anexos`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )

  return data ?? null
}

export const downloadSurgicalRequestChatAttachment = async (
  id: string | number,
  anexoId: string | number,
) => {
  const encodedId = encodeURIComponent(String(id))
  const encodedAnexoId = encodeURIComponent(String(anexoId))
  return api.get(
    `/esteira-procedimentos/${encodedId}/chat/anexos/${encodedAnexoId}/download`,
    { responseType: 'blob' },
  )
}

export default {
  fetchSurgicalRequestTimeline,
  fetchSurgicalRequestChatMessages,
  postSurgicalRequestChatMessage,
  uploadSurgicalRequestChatAttachment,
  downloadSurgicalRequestChatAttachment,
}
