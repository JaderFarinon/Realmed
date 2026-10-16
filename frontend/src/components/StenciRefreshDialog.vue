<template>
  <ListDetailDialog
    :open="state.open"
    title="Consultar dados do Stenci"
    @close="cancelStenciRefresh"
  >
    <p class="mb-4 text-sm text-gray-600">
      Entre com sua conta Stenci para atualizar os dados. A sessão Stenci será encerrada após a
      consulta; você continuará no Realmed.
    </p>
    <form class="grid gap-4" @submit.prevent="submit">
      <label
        >Usuário Stenci<input
          v-model="username"
          class="input"
          autocomplete="username"
          required
          :disabled="state.busy"
      /></label>
      <label
        >Senha Stenci<input
          v-model="password"
          class="input"
          type="password"
          autocomplete="current-password"
          required
          :disabled="state.busy"
      /></label>
      <p v-if="state.error" role="alert" class="text-error-700">{{ state.error }}</p>
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
</script>
