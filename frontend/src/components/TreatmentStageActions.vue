<template>
  <div class="stage-actions">
    <TreatmentSaveButton
      v-if="canEdit && saveDraftAction && !completed"
      :disabled="disabled"
      :busy="busy"
      @click="saveDraft"
    />
    <button
      v-if="canEdit || (!completed && canFinalize)"
      type="button"
      class="btn-secondary"
      :disabled="busy || disabled"
      @click="confirmOpen = true"
    >
      {{ busy ? 'Salvando…' : completed ? 'Reabrir etapa' : 'Finalizar etapa' }}
    </button>
    
    <ListDetailDialog
      :open="confirmOpen"
      :title="(completed ? 'Reabrir: ' : 'Finalizar: ') + title"
      @close="!busy && (confirmOpen = false)"
    >
      <p>
        {{
          completed
            ? 'Reabrir esta etapa para permitir alterações? A ação ficará registrada no histórico.'
            : 'Confirme a conferência dos dados desta etapa. Ao finalizar, os campos ficarão somente para leitura até a reabertura. Esta ação não encaminha o tratamento ao convênio.'
        }}
      </p>
      <div class="mt-5 flex justify-end gap-3">
        <button type="button" class="btn-secondary" :disabled="busy" @click="confirmOpen = false">
          Cancelar
        </button>
        <button type="button" class="btn" :disabled="busy" @click="confirm">
          {{ busy ? 'Salvando…' : completed ? 'Confirmar reabertura' : 'Confirmar finalização' }}
        </button>
      </div>
    </ListDetailDialog>
  </div>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { computed, ref } from 'vue'
import api from '@/plugins/axios'
import ListDetailDialog from './ListDetailDialog.vue'
import TreatmentSaveButton from './TreatmentSaveButton.vue'
import { treatmentStageClosed } from '@/utils/treatmentStages'
const props = defineProps<{
  process: any
  stage: string
  title: string
  canEdit: boolean
  canFinalize?: boolean
  disabled?: boolean
  saveDraftAction?: () => Promise<boolean | void>
  beforeFinalize?: () => Promise<boolean | void>
}>()
const emit = defineEmits(['updated'])
const completed = computed(() => treatmentStageClosed(props.process, props.stage))
const busy = ref(false),
  confirmOpen = ref(false),
  error = ref(false),
  message = ref('')
async function saveDraft() {
  if (busy.value || !props.canEdit || props.disabled || !props.saveDraftAction) return
  busy.value = true
  message.value = ''
  error.value = false
  try {
    if ((await props.saveDraftAction()) === false) {
      error.value = true
      message.value = 'Não foi possível salvar. Confira a mensagem da etapa.'
      return
    }
    message.value = 'Rascunho salvo com sucesso.'
  } catch (e: any) {
    error.value = true
    message.value = e.response?.data?.error || 'Não foi possível salvar os dados da etapa.'
  } finally {
    busy.value = false
  }
}
async function confirm() {
  if (busy.value || (!props.canEdit && (completed.value || !props.canFinalize)) || props.disabled) return
  busy.value = true
  message.value = ''
  error.value = false
  try {
    const reopening = completed.value
    if (!reopening && props.beforeFinalize && (await props.beforeFinalize()) === false) {
      confirmOpen.value = false
      return
    }
    const result = (
      await api.post(
        `/guide-processes/${props.process.id}/stages/${props.stage}/${reopening ? 'reopen' : 'complete'}`,
      )
    ).data
    emit('updated', result)
    confirmOpen.value = false
    message.value = reopening ? 'Etapa reaberta para edição.' : 'Etapa finalizada com sucesso.'
  } catch (e: any) {
    error.value = true
    message.value = e.response?.data?.error || 'Não foi possível atualizar a etapa.'
    confirmOpen.value = false
  } finally {
    busy.value = false
  }
}

useFeedback(() => unwrapNoticeValue(message), () => unwrapNoticeValue(error) ? 'error' : 'success')
</script>
<style scoped>
.stage-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
  gap: 0.75rem;
}
.stage-actions p {
  flex-basis: 100%;
}
.stage-completed-label {
  color: #067647;
  font-weight: 600;
}
</style>
