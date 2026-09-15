<template>
  <Modal :fullScreenBackdrop="true" @close="handleCancel">
    <div class="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900">
      <header class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Pré-Processamento #{{ notificacao.id }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Atualize as informações de classificação e responsável pela tratativa.
          </p>
        </div>
        <button class="text-gray-400 hover:text-gray-600" type="button" @click="handleCancel">
          <span class="sr-only">Fechar</span>
          ×
        </button>
      </header>

      <form class="mt-6 space-y-5" @submit.prevent="salvar">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="form-label">Classificação</label>
            <select v-model="form.dsClass" class="form-input" required>
              <option value="Não Processado">Não Processado</option>
              <option value="Procedente">Procedente</option>
              <option value="Improcedente">Improcedente</option>
            </select>
          </div>
          <div>
            <label class="form-label">Responsável</label>
            <div class="flex gap-2">
              <select v-model.number="form.cdResponsavel" class="form-input flex-1">
                <option :value="null">Selecione</option>
                <option v-for="responsavel in responsaveis" :key="responsavel.id" :value="responsavel.id">
                  {{ responsavel.dsResp }}
                </option>
              </select>
              <Button variant="outline" size="sm" @click="abrirCadastroResponsavel">Novo</Button>
            </div>
          </div>
        </div>

        <div>
          <label class="form-label">Justificativa</label>
          <textarea v-model="form.dsMotivoClassificacao" rows="3" class="form-input" placeholder="Descreva a justificativa"></textarea>
        </div>
        <div>
          <label class="form-label">Resposta da Gestão</label>
          <textarea v-model="form.dsRespostaProcesso" rows="3" class="form-input" placeholder="Informe as ações adotadas"></textarea>
        </div>

        <footer class="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
          <div class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>Última atualização: {{ formatDate(form.dtPreProcessamento) }}</span>
            <span v-if="form.dsResponsavel">Responsável atual: {{ form.dsResponsavel }}</span>
          </div>
          <div class="flex items-center gap-3">
            <Button variant="outline" @click="() => emit('close', true)">Cancelar Pré-Processamento</Button>
            <Button variant="outline" @click="handleCancel">Fechar</Button>
            <Button type="submit" @click="salvar" :disabled="isSaving">
              {{ isSaving ? 'Salvando...' : 'Salvar alterações' }}
            </Button>
          </div>
        </footer>
      </form>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, watch, ref } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/ui/Modal.vue'
import Button from '@/components/ui/Button.vue'
import type { NotificacaoIncidente, PreProcessamento, RespNotificacao } from '@/types/notIncidentes'
import { savePreProcessamento } from '@/services/notIncidentes'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  open: boolean
  notificacao: NotificacaoIncidente
  responsaveis: RespNotificacao[]
}>()

const emit = defineEmits<{
  close: [cancelar?: boolean]
  saved: []
  'refresh-responsaveis': []
}>()

const toast = useToast()
const router = useRouter()
const cadastrosPath = '/qualidade/gestao-notificacoes/cadastros'
const isSaving = ref(false)

const form = reactive<PreProcessamento>({
  id: props.notificacao.preProcessamento?.id,
  idIncidente: props.notificacao.id,
  dsClass: props.notificacao.preProcessamento?.dsClass ?? 'Não Processado',
  dtPreProcessamento: props.notificacao.preProcessamento?.dtPreProcessamento ?? new Date().toISOString(),
  cdResponsavel: props.notificacao.preProcessamento?.cdResponsavel ?? null,
  dsResponsavel: props.notificacao.preProcessamento?.dsResponsavel ?? null,
  dsMotivoClassificacao: props.notificacao.preProcessamento?.dsMotivoClassificacao ?? '',
  dsRespostaProcesso: props.notificacao.preProcessamento?.dsRespostaProcesso ?? '',
})

watch(
  () => props.notificacao,
  (value) => {
    form.id = value.preProcessamento?.id
    form.idIncidente = value.id
    form.dsClass = value.preProcessamento?.dsClass ?? 'Não Processado'
    form.dtPreProcessamento = value.preProcessamento?.dtPreProcessamento ?? new Date().toISOString()
    form.cdResponsavel = value.preProcessamento?.cdResponsavel ?? null
    form.dsResponsavel = value.preProcessamento?.dsResponsavel ?? null
    form.dsMotivoClassificacao = value.preProcessamento?.dsMotivoClassificacao ?? ''
    form.dsRespostaProcesso = value.preProcessamento?.dsRespostaProcesso ?? ''
  },
  { immediate: true },
)

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

const handleCancel = () => {
  emit('close', false)
}

const abrirCadastroResponsavel = () => {
  emit('refresh-responsaveis')
  const resolved = router.resolve(cadastrosPath)
  if (resolved.matched.length) {
    void router.push(resolved)
    return
  }

  window.open('/configuracoes/parametrizacoes', '_blank')
}

const salvar = async () => {
  if (isSaving.value) return
  try {
    isSaving.value = true
    await savePreProcessamento(props.notificacao.id, form)
    toast.success('Pré-processamento atualizado com sucesso')
    emit('saved')
  } catch (error) {
    console.error('Erro ao salvar pré-processamento', error)
    toast.error('Não foi possível salvar o pré-processamento')
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.form-label {
  @apply mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300;
}
.form-input {
  @apply w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200;
}
</style>
