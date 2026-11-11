<template>
  <ListDetailDialog
    :open="state.open"
    title="Consultar dados do Stenci"
    @close="cancelStenciRefresh"
  >
    <p class="mb-4 text-sm text-gray-600">
      Confirme sua conta Stenci para retomar as consultas automáticas. As credenciais ficam
      criptografadas apenas durante sua sessão Realmed. O Stenci será desconectado após cada
      consulta.
    </p>
    <form class="grid gap-4" @submit.prevent="submit">
      <label
        ><FieldLabel :required="true">Usuário Stenci</FieldLabel
        ><input
          v-model="username"
          class="input"
          autocomplete="username"
          required
          :disabled="state.busy"
      /></label>
      <label
        ><FieldLabel :required="true">Senha Stenci</FieldLabel
        ><input
          v-model="password"
          class="input"
          type="password"
          autocomplete="current-password"
          required
          :disabled="state.busy"
      /></label>
      
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="btn-secondary"
          :disabled="state.busy"
          @click="cancelStenciRefresh"
        >
          Cancelar
        </button>
        <button class="btn-primary" :disabled="state.busy">
          {{ state.busy ? 'Consultando e encerrando sessão...' : 'Consultar e encerrar sessão' }}
        </button>
      </div>
    </form>
  </ListDetailDialog>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { ref, watch, onBeforeUnmount } from 'vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import {
  stenciRefreshState as state,
  refreshBatch,
  completeRefresh,
  cancelStenciRefresh,
} from '@/composables/useStenciRefresh'
import { useAuthUser } from '@/composables/useAuthUser'
import api from '@/plugins/axios'
const { authUser } = useAuthUser()
const username = ref(''),
  password = ref('')
watch(
  () => state.open,
  (open) => {
    password.value = ''
    state.error = ''
    if (open) username.value = authUser.value?.username || ''
  },
)
onBeforeUnmount(cancelStenciRefresh)
async function submit() {
  if (state.busy) return
  state.busy = true
  state.error = ''
  const batch = refreshBatch()
  const operations = [
    ...new Map(batch.map((item) => [JSON.stringify(item.operation), item.operation])).values(),
  ]
  const credentials = { username: username.value, password: password.value, operations }
  password.value = ''
  try {
    await api.post('/integrations/stenci/refresh', credentials, { timeout: 90000 })
    completeRefresh(batch)
  } catch (error: any) {
    state.error =
      error.response?.data?.error || 'Não foi possível consultar o Stenci. Tente novamente.'
  } finally {
    credentials.password = ''
    state.busy = false
  }
}

useFeedback(() => unwrapNoticeValue(state).error, () => 'error')
</script>
