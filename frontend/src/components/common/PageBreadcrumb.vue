<template>
  <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
    <div class="flex flex-wrap items-center gap-2">
      <HeaderButtons
        :buttons="buttons"
        @novo="$emit('novo')"
        @editar="$emit('editar')"
        @cancelar="$emit('cancelar')"
        @ativar-inativar="$emit('ativar-inativar')"
        @excluir="$emit('excluir')"
        @salvar="$emit('salvar')"
        @anexos="$emit('anexos')"
        @copiar="$emit('copiar')"
        @colar="$emit('colar')"
      />
      <slot name="actions" />
    </div>
    <nav>
      <ol class="flex items-center gap-1.5">
        <li>
          <router-link
            class="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
            to="/"
          >
            Home
            <svg
              class="stroke-current"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                stroke=""
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </router-link>
        </li>
        <li class="text-sm text-gray-800 dark:text-white/90">
          {{ pageTitle }}
        </li>
      </ol>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { withDefaults, defineProps, defineEmits } from 'vue'
import HeaderButtons from '@/components/common/HeaderButtons.vue'

interface ButtonsVisibility {
  novo?: boolean
  editar?: boolean
  cancelar?: boolean
  ativarInativar?: boolean
  excluir?: boolean
  salvar?: boolean
  anexos?: boolean
  copiar?: boolean
  colar?: boolean
}

interface BreadcrumbProps {
  pageTitle: string
  buttons?: ButtonsVisibility
}

withDefaults(defineProps<BreadcrumbProps>(), {
  buttons: () => ({})
})

defineEmits([
  'novo',
  'editar',
  'cancelar',
  'ativar-inativar',
  'excluir',
  'salvar',
  'anexos',
  'copiar',
  'colar'
])
</script>
