import api from '@/plugins/axios'
import type {
  NotificationQueueResponse,
  NotificationStatus,
} from '@/types/esteiraNotificacoes'

export interface FetchNotificationQueueParams {
  status?: NotificationStatus | 'TODOS'
  tipo?: string
  page?: number
  pageSize?: number
}

export const fetchNotificationQueue = async (
  params: FetchNotificationQueueParams = {},
): Promise<NotificationQueueResponse> => {
  const { data } = await api.get<NotificationQueueResponse>('/esteira/notificacoes', {
    params: {
      ...params,
      status: params.status && params.status !== 'TODOS' ? params.status : undefined,
    },
  })

  return data
}

export default {
  fetchNotificationQueue,
}
