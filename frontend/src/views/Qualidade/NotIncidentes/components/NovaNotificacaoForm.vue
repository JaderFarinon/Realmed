<template>
  <section>
    <div class="mb-8 flex flex-col gap-6">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-center">
        <template v-for="(step, index) in steps" :key="step.id">
          <div class="flex flex-1 items-start gap-3">
            <div
              :class="[
                'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition',
                currentStep > step.id
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : currentStep === step.id
                    ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-100'
                    : 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500',
              ]"
            >
              <span v-if="currentStep > step.id">✓</span>
              <span v-else>{{ step.id }}</span>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ step.title }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ step.description }}</p>
            </div>
          </div>
          <div
            v-if="index < steps.length - 1"
            class="hidden flex-1 items-center sm:flex"
          >
            <span
              :class="[
                'h-0.5 w-full rounded-full transition-colors',
                currentStep > step.id ? 'bg-brand-500 dark:bg-brand-400' : 'bg-gray-200 dark:bg-gray-700',
              ]"
            ></span>
          </div>
        </template>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="handleSubmit">
      <section v-if="currentStep === 1" class="space-y-5">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="form-label">Paciente</label>
            <input v-model="form.nmPaciente" type="text" class="form-input" placeholder="Nome do paciente" required />
          </div>
          <div>
            <label class="form-label">Profissional</label>
            <input v-model="form.nmMedico" type="text" class="form-input" placeholder="Profissional notificador" />
          </div>
        </div>
        <div>
          <label class="form-label">Email para contato</label>
          <input v-model="form.dsEmail" type="email" class="form-input" placeholder="exemplo@dominio.com" />
        </div>
      </section>

      <section v-else-if="currentStep === 2" class="space-y-5">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="form-label">Setor</label>
            <input v-model="form.dsSetor" type="text" class="form-input" placeholder="Setor de origem" required />
          </div>
          <div>
            <label class="form-label">Incidente</label>
            <select v-model="form.dsIncidente" class="form-input" required>
              <option disabled value="">Selecione um incidente</option>
              <option v-for="tipo in tipos" :key="tipo.id" :value="tipo.dsTipo">{{ tipo.dsTipo }}</option>
            </select>
          </div>
        </div>
        <div>
          <label class="form-label">Data do incidente</label>
          <input v-model="form.dtIncidente" type="datetime-local" class="form-input" required />
        </div>
      </section>

      <section v-else-if="currentStep === 3" class="space-y-5">
        <div>
          <label class="form-label">Descrição do fato</label>
          <textarea v-model="form.dsFato" rows="4" class="form-input" required></textarea>
        </div>
      </section>

      <section v-else class="space-y-5">
        <div>
          <label class="form-label">Consequência imediata</label>
          <textarea v-model="form.dsConseq" rows="3" class="form-input" required></textarea>
        </div>
        <div>
          <label class="form-label">Ação imediata</label>
          <textarea v-model="form.dsAcao" rows="3" class="form-input" required></textarea>
        </div>
        <div>
          <label class="form-label">Observações adicionais</label>
          <textarea v-model="form.dsConseqDet" rows="3" class="form-input"></textarea>
        </div>
      </section>

      <footer class="flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <Button
          v-if="showCancel"
          type="button"
          variant="outline"
          @click="emitCancel"
        >
          {{ cancelButtonLabel }}
        </Button>
        <div :class="['flex w-full justify-end gap-3 sm:w-auto', showCancel ? '' : 'ml-auto']">
          <Button
            v-if="currentStep > 1"
            type="button"
            variant="outline"
            @click="goToPreviousStep"
          >
            Voltar
          </Button>
          <Button type="submit" :disabled="isFinalStep && isSaving">
            {{ primaryButtonLabel }}
          </Button>
        </div>
      </footer>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import Button from '@/components/ui/Button.vue'
import type { CreateNotificacaoPayload } from '@/services/notIncidentes'
import { createNotificacao } from '@/services/notIncidentes'
import type { NotificacaoTipo } from '@/types/notIncidentes'
import { useToast } from '@/composables/useToast'

const props = withDefaults(
  defineProps<{
    tipos: NotificacaoTipo[]
    showCancel?: boolean
    cancelLabel?: string
  }>(),
  {
    showCancel: false,
    cancelLabel: 'Cancelar',
  },
)

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'created'): void
}>()

const toast = useToast()
const isSaving = ref(false)

const steps = [
  { id: 1, title: 'Identificação', description: 'Paciente e contato' },
  { id: 2, title: 'Incidente', description: 'Detalhes do registro' },
  { id: 3, title: 'Descrição', description: 'Resumo do fato' },
  { id: 4, title: 'Ações', description: 'Consequências e ações' },
] as const

const currentStep = ref<number>(1)

const form = reactive<CreateNotificacaoPayload>({
  nmCriador: '',
  dsSetor: '',
  dsFato: '',
  dsConseq: '',
  dsAcao: '',
  dsConseqDet: '',
  dtIncidente: new Date().toISOString().slice(0, 16),
  dsMaquina: '',
  nmMedico: '',
  nmPaciente: '',
  dsIncidente: '',
  dsSubtipoIncidente: '',
  nrAtendimento: '',
  dsEmail: '',
})

const cancelButtonLabel = computed(() => props.cancelLabel || 'Cancelar')
const isFinalStep = computed(() => currentStep.value === steps.length)

const primaryButtonLabel = computed(() => {
  if (isFinalStep.value) {
    return isSaving.value ? 'Salvando...' : 'Registrar notificação'
  }
  return 'Avançar'
})

const goToPreviousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value -= 1
  }
}

const resetForm = () => {
  form.dsFato = ''
  form.dsConseq = ''
  form.dsAcao = ''
  form.dsConseqDet = ''
  form.dsIncidente = ''
  form.dsSetor = ''
  form.nmPaciente = ''
  form.nmMedico = ''
  form.dsEmail = ''
  form.dtIncidente = new Date().toISOString().slice(0, 16)
  currentStep.value = 1
}

const validateStep = (step: number) => {
  if (step === 1) {
    if (!form.nmPaciente || !form.nmPaciente.trim()) {
      toast.error('Informe o nome do paciente')
      return false
    }
  }

  if (step === 2) {
    if (!form.dsSetor || !form.dsSetor.trim()) {
      toast.error('Informe o setor do incidente')
      return false
    }
    if (!form.dsIncidente || !form.dsIncidente.trim()) {
      toast.error('Selecione o tipo de incidente')
      return false
    }
    if (!form.dtIncidente) {
      toast.error('Informe a data do incidente')
      return false
    }
  }

  if (step === 3) {
    if (!form.dsFato || !form.dsFato.trim()) {
      toast.error('Descreva o fato ocorrido')
      return false
    }
  }

  if (step === 4) {
    if (!form.dsConseq || !form.dsConseq.trim()) {
      toast.error('Informe a consequência imediata')
      return false
    }
    if (!form.dsAcao || !form.dsAcao.trim()) {
      toast.error('Informe a ação imediata')
      return false
    }
  }

  return true
}

const salvar = async () => {
  if (isSaving.value) return
  try {
    isSaving.value = true
    await createNotificacao({
      ...form,
      dtIncidente: new Date(form.dtIncidente || new Date().toISOString()).toISOString(),
    })
    toast.success('Notificação registrada com sucesso')
    resetForm()
    emit('created')
  } catch (error) {
    console.error('Erro ao cadastrar notificação', error)
    toast.error('Não foi possível registrar a notificação')
  } finally {
    isSaving.value = false
  }
}

const handleSubmit = async () => {
  if (!validateStep(currentStep.value)) {
    return
  }

  if (isFinalStep.value) {
    await salvar()
    return
  }

  currentStep.value += 1
}

const emitCancel = () => {
  emit('cancel')
}

defineExpose({ resetForm })
</script>

<style scoped>
.form-label {
  @apply mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300;
}
.form-input {
  @apply w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200;
}
</style>
