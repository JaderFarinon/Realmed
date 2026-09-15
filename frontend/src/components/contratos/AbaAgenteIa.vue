<template>
  <CardBox class="flex flex-col flex-1" body-class="flex flex-col flex-1 gap-4">
    <NotificationBar color="info" :icon="InfoIcon">
      Configure o agente de IA para apoiar a análise contratual, definição de cláusulas e geração de resumos.
    </NotificationBar>

    <form class="space-y-4" @submit.prevent="salvar">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Ativar agente de IA" label-for="agente_ativo">
          <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input id="agente_ativo" v-model="config.agenteAtivo" type="checkbox" />
            Habilitar análises automáticas
          </label>
        </FormField>

        <FormField label="Provedor" label-for="provedor">
          <select
            id="provedor"
            v-model="config.provedor"
            class="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/80 dark:focus:border-brand-800"
          >
            <option value="openai">OpenAI</option>
            <option value="azure-openai">Azure OpenAI</option>
            <option value="ollama">Ollama</option>
          </select>
        </FormField>

        <FormField label="Modelo" label-for="modelo">
          <FormControl id="modelo" v-model="config.modelo" placeholder="ex: gpt-4o" />
        </FormField>

        <FormField label="Temperatura" label-for="temperatura">
          <FormControl
            id="temperatura"
            v-model.number="config.temperatura"
            type="number"
            min="0"
            max="1"
            step="0.1"
          />
        </FormField>

        <FormField label="Idioma preferencial" label-for="idioma">
          <FormControl id="idioma" v-model="config.idioma" placeholder="pt-BR" />
        </FormField>

        <FormField label="E-mails para notificações do agente" label-for="emails">
          <FormControl
            id="emails"
            v-model="emailsTexto"
            placeholder="emails separados por vírgula"
          />
        </FormField>
      </div>

      <FormField label="Contexto da organização" label-for="contexto">
        <FormControl
          id="contexto"
          v-model="config.contexto"
          type="textarea"
          rows="4"
          placeholder="Descreva objetivos, políticas e restrições que o agente deve seguir"
        />
      </FormField>

      <FormField label="Regras do agente" label-for="regras">
        <FormControl
          id="regras"
          v-model="config.regras"
          type="textarea"
          rows="4"
          placeholder="Instruções adicionais para análises e geração de cláusulas"
        />
      </FormField>

      <div class="flex justify-end gap-2">
        <Button type="button" color="light" @click="restaurarPadrao">Restaurar padrão</Button>
        <Button type="submit" color="info" :disabled="salvando">
          {{ salvando ? 'Salvando...' : 'Salvar configurações' }}
        </Button>
      </div>

      <p v-if="mensagem" class="text-sm text-green-600 dark:text-green-400">{{ mensagem }}</p>
    </form>
  </CardBox>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import Button from '@/components/ui/Button.vue'
import CardBox from '@/components/layout/CardBox.vue'
import FormControl from '@/components/FormControl.vue'
import FormField from '@/components/FormField.vue'
import NotificationBar from '@/components/layout/NotificationBar.vue'
import { InfoIcon } from '@/icons'

interface ConfigAgenteIa {
  agenteAtivo: boolean
  provedor: string
  modelo: string
  temperatura: number
  idioma: string
  emails: string[]
  contexto: string
  regras: string
}

const salvando = ref(false)
const mensagem = ref('')

const config = reactive<ConfigAgenteIa>({
  agenteAtivo: false,
  provedor: 'openai',
  modelo: 'gpt-4o-mini',
  temperatura: 0.2,
  idioma: 'pt-BR',
  emails: [],
  contexto: '',
  regras: '',
})

const emailsTexto = computed({
  get: () => config.emails.join(', '),
  set: (valor: string) => {
    config.emails = valor
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  },
})

const carregarConfiguracao = () => {
  if (typeof window === 'undefined') return
  const salvo = window.localStorage.getItem('contratos:agente-ia')
  if (salvo) {
    try {
      Object.assign(config, JSON.parse(salvo))
    } catch (error) {
      console.error('Não foi possível restaurar configuração do agente', error)
    }
  }
}

const salvar = () => {
  salvando.value = true
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('contratos:agente-ia', JSON.stringify(config))
    }
    mensagem.value = 'Configurações salvas com sucesso.'
  } catch (error) {
    console.error('Erro ao salvar configuração do agente', error)
    mensagem.value = 'Não foi possível salvar as configurações.'
  } finally {
    salvando.value = false
  }
}

const restaurarPadrao = () => {
  Object.assign(config, {
    agenteAtivo: false,
    provedor: 'openai',
    modelo: 'gpt-4o-mini',
    temperatura: 0.2,
    idioma: 'pt-BR',
    emails: [],
    contexto: '',
    regras: '',
  })
  mensagem.value = 'Configurações restauradas para o padrão.'
}

carregarConfiguracao()
</script>
