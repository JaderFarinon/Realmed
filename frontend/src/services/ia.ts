import api from '@/plugins/axios'

export type IaRole = 'user' | 'assistant'

export interface IaSettings {
  id: number
  model: string
  api_key: string
  created_at: string
  updated_at: string
}

export interface SaveIaSettingsPayload {
  model: string
  api_key: string
}

export interface IaChat {
  id: number
  title: string
  created_at: string
}

export interface IaMessage {
  id: number
  chat_id: number
  role: IaRole
  content: string
  created_at: string
}

export interface SendIaMessageResponse {
  pergunta: IaMessage
  resposta: IaMessage
}

export const fetchIaSettings = async (): Promise<IaSettings | null> => {
  const response = await api.get('/ia/settings')
  const data = response?.data as IaSettings | null | undefined
  return data ?? null
}

export const saveIaSettings = async (payload: SaveIaSettingsPayload): Promise<IaSettings> => {
  const response = await api.post('/ia/settings', payload)
  const data = response?.data as { mensagem?: string; dados?: IaSettings } | undefined
  return data?.dados ?? (response?.data as IaSettings)
}

export const listIaChats = async (): Promise<IaChat[]> => {
  const response = await api.get('/ia/chats')
  const data = response?.data as IaChat[] | undefined
  return Array.isArray(data) ? data : []
}

export const createIaChat = async (title?: string): Promise<IaChat> => {
  const response = await api.post('/ia/chats', title ? { title } : {})
  return response?.data as IaChat
}

export const fetchIaMessages = async (chatId: number): Promise<IaMessage[]> => {
  const response = await api.get(`/ia/chats/${chatId}/messages`)
  const data = response?.data as IaMessage[] | undefined
  return Array.isArray(data) ? data : []
}

export const sendIaMessage = async (chatId: number, message: string): Promise<SendIaMessageResponse> => {
  const response = await api.post('/ia/chat', { chatId, message })
  return response?.data as SendIaMessageResponse
}
