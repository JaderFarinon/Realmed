<template>
  <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
    <HeaderIconButtons
      :buttons="buttons"
      @novo="$emit('novo')"
      @editar="$emit('editar')"
      @visualizar="$emit('visualizar')"
      @ativar-inativar="$emit('ativar-inativar')"
      @cadastros="$emit('cadastros')"
      @excluir="$emit('excluir')"
      @salvar="$emit('salvar')"
      @anexos="$emit('anexos')"
      @copiar="$emit('copiar')"
      @colar="$emit('colar')"
      @timeline="$emit('timeline')"
    />
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
import HeaderIconButtons from '@/components/common/HeaderIconButtons.vue'

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
  'visualizar',
  'ativar-inativar',
  'cadastros',
  'excluir',
  'salvar',
  'anexos',
  'copiar',
  'colar',
  'timeline',
])
</script>
