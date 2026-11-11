<template>
  <section class="mt-5 border-t pt-4" aria-label="Documentos da liberação">
    <h3 class="font-semibold">Documentos da liberação</h3>
    <p class="mt-1 mb-3 text-sm text-gray-500">
      Anexe os PDFs emitidos pelo convênio para acompanhar o tratamento. Opcionais, até 10 MB por
      arquivo.
    </p>
    
    
    <DataList
      v-model:selected="selected"
      :items="filtered"
      :columns="columns"
      :actions="actions"
      :loading="busy"
      selection-key="original_name"
      embedded
      empty-text="Nenhum documento de liberação anexado."
    >
      <template #filters
        ><label
          >Pesquisar documento<input
            v-model="search"
            class="input"
            placeholder="Nome do arquivo" /></label
      ></template>
    </DataList>
    <ListDetailDialog :open="formOpen" title="Anexar documento da liberação" @close="closeForm">
      <form id="authorization-document-upload" class="grid gap-4" @submit.prevent="upload">
        <p>O arquivo será preservado junto ao tratamento, sem substituir as guias existentes.</p>
        <label
          ><FieldLabel required>Arquivo PDF</FieldLabel
          ><input
            class="input"
            type="file"
            accept=".pdf,application/pdf"
            required
            :disabled="busy"
            @change="chooseFile"
        /></label>
        <p class="text-sm text-gray-500">Limite de 10 MB por arquivo.</p>
        
      </form>
      <template #footer>
        <button class="btn-secondary" :disabled="busy" @click="closeForm">Cancelar</button>
        <button
          class="btn-primary"
          type="submit"
          form="authorization-document-upload"
          :disabled="busy || !file || !canEdit || closed"
        >
          {{ busy ? 'Anexando…' : 'Anexar PDF' }}
        </button>
      </template>
    </ListDetailDialog>
    <ListDetailDialog
      :open="Boolean(previewUrl)"
      title="Documento da liberação"
      wide
      @close="closePreview"
    >
      <p class="mb-3 break-words">{{ previewName }}</p>
      <iframe
        v-if="previewUrl"
        :src="previewUrl"
        :title="previewName"
        class="h-[60vh] w-full border-0"
      />
      <template #footer
        ><button class="btn-secondary" @click="closePreview">Fechar</button></template
      >
    </ListDetailDialog>
  </section>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import api from '@/plugins/axios'
import DataList, { type ListColumn } from './DataList.vue'
import type { TableAction } from './TableActionToolbar.vue'
import ListDetailDialog from './ListDetailDialog.vue'
import FieldLabel from './FieldLabel.vue'
const props = defineProps<{
  processId: number
  documents: any[]
  canEdit: boolean
  canRead: boolean
  closed: boolean
}>()
const emit = defineEmits(['updated'])
const selected = ref<any>(null),
  search = ref(''),
  busy = ref(false),
  formOpen = ref(false),
  file = ref<File | null>(null),
  formError = ref(''),
  error = ref(''),
  message = ref(''),
  previewUrl = ref(''),
  previewName = ref('')
const filtered = computed(() =>
  (props.documents || []).filter((d) =>
    d.original_name.toLocaleLowerCase('pt-BR').includes(search.value.toLocaleLowerCase('pt-BR')),
  ),
)
const columns: ListColumn[] = [
  { key: 'original_name', label: 'Arquivo' },
  {
    key: 'created_at',
    label: 'Anexado em',
    format: (v) => (v ? new Date(v).toLocaleString('pt-BR') : '—'),
  },
  { key: 'uploaded_by_name', label: 'Anexado por' },
  {
    key: 'file_size',
    label: 'Tamanho',
    format: (v) => `${Math.max(1, Math.ceil(Number(v) / 1024))} KB`,
  },
]
const actions = computed<TableAction[]>(() => [
  {
    label: 'Anexar documento da liberação',
    icon: 'add',
    variant: 'primary',
    disabled: !props.canEdit || props.closed,
    title: props.closed ? 'Reabra a etapa Liberação para anexar documentos.' : 'Anexar PDF',
    onClick: openForm,
  },
  {
    label: 'Visualizar documento da liberação',
    icon: 'open',
    disabled: !selected.value || !props.canRead,
    onClick: () => read(false),
  },
  {
    label: 'Baixar documento da liberação',
    icon: 'download',
    disabled: !selected.value || !props.canRead,
    onClick: () => read(true),
  },
])
watch(
  () => props.documents,
  (docs) => {
    if (selected.value)
      selected.value = (docs || []).find((d) => d.id === selected.value.id) || null
  },
)
function openForm() {
  if (busy.value || !props.canEdit || props.closed) return
  file.value = null
  formError.value = ''
  error.value = ''
  message.value = ''
  formOpen.value = true
}
function closeForm() {
  if (!busy.value) {
    formOpen.value = false
    file.value = null
    formError.value = ''
  }
}
function chooseFile(event: Event) {
  const input = event.target as HTMLInputElement,
    candidate = input.files?.[0]
  file.value = null
  formError.value = ''
  if (!candidate) return
  if (!/\.pdf$/i.test(candidate.name) || (candidate.type && candidate.type !== 'application/pdf'))
    formError.value = 'Selecione um arquivo PDF.'
  else if (!candidate.size || candidate.size > 10 * 1024 * 1024)
    formError.value = 'O PDF deve ter conteúdo e no máximo 10 MB.'
  else file.value = candidate
  if (formError.value) input.value = ''
}
async function upload() {
  if (busy.value || !file.value || !props.canEdit || props.closed) return
  busy.value = true
  formError.value = ''
  error.value = ''
  message.value = ''
  try {
    await api.post(`/guide-processes/${props.processId}/authorization-documents`, file.value, {
      headers: {
        'Content-Type': 'application/pdf',
        'X-File-Name': encodeURIComponent(file.value.name),
      },
    })
    formOpen.value = false
    file.value = null
    search.value = ''
    message.value = 'Documento da liberação anexado com sucesso.'
    emit('updated')
  } catch (e: any) {
    formError.value =
      e.response?.data?.error || 'Não foi possível anexar o documento. Tente novamente.'
  } finally {
    busy.value = false
  }
}
function closePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  previewName.value = ''
}
async function read(download: boolean) {
  if (busy.value || !selected.value || !props.canRead) return
  busy.value = true
  error.value = ''
  const document = selected.value
  try {
    const response = await api.get(
      `/guide-processes/${props.processId}/authorization-documents/${document.id}/download`,
      { responseType: 'blob', params: download ? { download: '1' } : undefined },
    )
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    if (download) {
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = document.original_name
      window.document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } else {
      closePreview()
      previewUrl.value = url
      previewName.value = document.original_name
    }
  } catch {
    error.value = 'Não foi possível abrir o documento da liberação.'
  } finally {
    busy.value = false
  }
}
onBeforeUnmount(closePreview)

useFeedback(() => unwrapNoticeValue(message), () => 'success')
useFeedback(() => unwrapNoticeValue(error), () => 'error')
useFeedback(() => unwrapNoticeValue(formError), () => 'error')
</script>
