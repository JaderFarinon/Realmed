<template>
  <div class="flex flex-wrap gap-2">
    <Button
      v-if="buttons.novo"
      size="sm"
      variant="primary"
      :startIcon="NewIcon"
      @click="$emit('novo')"
    >
      Novo
    </Button>
    <Button
      v-if="buttons.editar"
      size="sm"
      variant="primary"
      :startIcon="EditIcon"
      @click="$emit('editar')"
    >
      Editar
    </Button>
    <Button
      v-if="buttons.cancelar"
      size="sm"
      variant="outline"
      :startIcon="ErrorIcon"
      @click="$emit('cancelar')"
    >
      Cancelar
    </Button>
    <Button
      v-if="buttons.ativarInativar"
      size="sm"
      variant="primary"
      :startIcon="RefreshIcon"
      @click="$emit('ativar-inativar')"
    >
      Inativar/Ativar
    </Button>
    <Button
      v-if="buttons.excluir"
      size="sm"
      variant="primary"
      :startIcon="TrashIcon"
      @click="$emit('excluir')"
    >
      Excluir
    </Button>
    <Button
      v-if="buttons.salvar"
      size="sm"
      variant="primary"
      :startIcon="CheckIcon"
      @click="$emit('salvar')"
    >
      Salvar
    </Button>
    <Button
      v-if="buttons.timeline"
      size="sm"
      variant="outline"
      :startIcon="EyeIcon"
      @click="$emit('timeline')"
    >
      Visualizar cirurgia
    </Button>
    <Button
      v-if="buttons.anexos"
      size="sm"
      variant="primary"
      :startIcon="PaperclipIcon"
      @click="$emit('anexos')"
    >
      Anexos
    </Button>
    <Button
      v-if="buttons.copiar"
      size="sm"
      variant="primary"
      :startIcon="DocsIcon"
      @click="$emit('copiar')"
    >
      Copiar
    </Button>
    <Button
      v-if="buttons.colar"
      size="sm"
      variant="primary"
      :startIcon="PageIcon"
      @click="$emit('colar')"
    >
      Colar
    </Button>
  </div>
</template>

<script setup lang="ts">
import { withDefaults, defineProps } from 'vue'
import Button from '@/components/ui/Button.vue'
import {
  CheckIcon,
  DocsIcon,
  EditIcon,
  ErrorIcon,
  NewIcon,
  EyeIcon,
  PageIcon,
  PaperclipIcon,
  RefreshIcon,
  TrashIcon,
} from '@/icons'

interface ButtonsVisibility {
  novo?: boolean
  editar?: boolean
  cancelar?: boolean
  ativarInativar?: boolean
  excluir?: boolean
  salvar?: boolean
  timeline?: boolean
  anexos?: boolean
  copiar?: boolean
  colar?: boolean
}

withDefaults(defineProps<{ buttons: ButtonsVisibility }>(), {
  buttons: () => ({})
})
</script>
