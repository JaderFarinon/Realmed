<template>
  <div class="flex flex-wrap gap-2">
    <IconButton
      v-if="isVisible(buttons.novo)"
      class="mr-1"
      title="Novo"
      aria-label="Novo"
      :disabled="isDisabled(buttons.novo)"
      @click="$emit('novo')"
    >
      <NewIcon />
    </IconButton>
    <template v-if="isVisible(buttons.editar)">
      <IconButton
        v-if="!isDisabled(buttons.editar)"
        class="mr-1"
        title="Editar"
        aria-label="Editar"
        @click="$emit('editar')"
      >
        <EditIcon />
      </IconButton>
      <IconButton
        v-else
        class="mr-1"
        title="Visualizar"
        aria-label="Visualizar"
        @click="$emit('visualizar')"
      >
        <EyeIcon />
      </IconButton>
    </template>
    <IconButton
      v-if="isVisible(buttons.excluir)"
      class="text-red-600"
      title="Excluir"
      aria-label="Excluir"
      :disabled="isDisabled(buttons.excluir)"
      @click="$emit('excluir')"
    >
      <TrashIcon />
    </IconButton>
    <Button
      v-if="isVisible(buttons.cadastros)"
      size="sm"
      variant="outline"
      :startIcon="SettingsIcon"
      :disabled="isDisabled(buttons.cadastros)"
      @click="$emit('cadastros')"
    >
      Cadastros
    </Button>
    <Button
      v-if="isVisible(buttons.ativarInativar)"
      size="sm"
      variant="primary"
      :startIcon="RefreshIcon"
      :disabled="isDisabled(buttons.ativarInativar)"
      @click="$emit('ativar-inativar')"
    >
      Inativar/Ativar
    </Button>
    <Button
      v-if="isVisible(buttons.salvar)"
      size="sm"
      variant="primary"
      :startIcon="CheckIcon"
      :disabled="isDisabled(buttons.salvar)"
      @click="$emit('salvar')"
    >
      Salvar
    </Button>
    <IconButton
      v-if="isVisible(buttons.timeline)"
      class="mr-1"
      title="Visualizar cirurgia"
      aria-label="Visualizar cirurgia"
      :disabled="isDisabled(buttons.timeline)"
      @click="$emit('timeline')"
    >
      <EyeIcon />
    </IconButton>
    <Button
      v-if="isVisible(buttons.anexos)"
      size="sm"
      variant="primary"
      :startIcon="PaperclipIcon"
      :disabled="isDisabled(buttons.anexos)"
      @click="$emit('anexos')"
    >
      Anexos
    </Button>
    <Button
      v-if="isVisible(buttons.copiar)"
      size="sm"
      variant="primary"
      :startIcon="DocsIcon"
      :disabled="isDisabled(buttons.copiar)"
      @click="$emit('copiar')"
    >
      Copiar
    </Button>
    <Button
      v-if="isVisible(buttons.colar)"
      size="sm"
      variant="primary"
      :startIcon="PageIcon"
      :disabled="isDisabled(buttons.colar)"
      @click="$emit('colar')"
    >
      Colar
    </Button>
  </div>
</template>

<script setup lang="ts">
import { withDefaults, defineProps } from 'vue'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import {
  CheckIcon,
  DocsIcon,
  EditIcon,
  NewIcon,
  EyeIcon,
  PageIcon,
  PaperclipIcon,
  RefreshIcon,
  SettingsIcon,
  TrashIcon,
} from '@/icons'

type ButtonConfig = boolean | { visible?: boolean; disabled?: boolean }

interface ButtonsVisibility {
  novo?: ButtonConfig
  editar?: ButtonConfig
  ativarInativar?: ButtonConfig
  excluir?: ButtonConfig
  cadastros?: ButtonConfig
  salvar?: ButtonConfig
  anexos?: ButtonConfig
  copiar?: ButtonConfig
  colar?: ButtonConfig
  timeline?: ButtonConfig
}

withDefaults(defineProps<{ buttons: ButtonsVisibility }>(), {
  buttons: () => ({})
})

const isVisible = (config?: ButtonConfig) => {
  if (typeof config === 'object') {
    return config.visible !== false
  }
  return Boolean(config)
}

const isDisabled = (config?: ButtonConfig) =>
  typeof config === 'object' ? Boolean(config.disabled) : false
</script>
