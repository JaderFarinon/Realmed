<template>
  <AdminLayout
    ><div
      class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="mb-5 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold dark:text-white">Usuários</h1>
          <p class="text-sm text-gray-500">Gerencie os acessos administrativos.</p>
        </div>
        <button class="rounded-lg bg-brand-500 px-4 py-2 text-white" @click="edit()">
          Novo usuário
        </button>
      </div>
      <p v-if="message" class="mb-4 text-sm text-red-600">{{ message }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b dark:border-gray-700">
            <tr>
              <th class="p-3">Nome</th>
              <th class="p-3">Login</th>
              <th class="p-3">Perfil</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="p-6 text-center">Carregando...</td>
            </tr>
            <tr v-for="user in users" :key="user.id" class="border-b dark:border-gray-800">
              <td class="p-3">
                {{ user.nome }}<small class="block text-gray-500">{{ user.email }}</small>
              </td>
              <td class="p-3">{{ user.login }}</td>
              <td class="p-3">{{ user.role }}</td>
              <td class="p-3">{{ user.status }}</td>
              <td class="p-3 text-right">
                <button class="mr-3 text-brand-500" @click="edit(user)">Editar</button
                ><button class="text-red-600" @click="remove(user)">Excluir</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="show" class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form
        class="grid w-full max-w-2xl grid-cols-1 gap-4 rounded-2xl bg-white p-6 dark:bg-gray-900 sm:grid-cols-2"
        @submit.prevent="save"
      >
        <h2 class="text-xl font-semibold dark:text-white sm:col-span-2">
          {{ form.id ? 'Editar' : 'Novo' }} usuário
        </h2>
        <label v-for="field in fields" :key="field.key" class="text-sm dark:text-gray-200"
          >{{ field.label
          }}<input
            v-model="form[field.key]"
            :type="field.type || 'text'"
            :required="field.required"
            class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950" /></label
        ><label class="text-sm dark:text-gray-200"
          >Perfil<select
            v-model="form.role"
            class="mt-1 h-10 w-full rounded-lg border px-3 dark:bg-gray-950"
          >
            <option v-for="role in roles" :key="role">{{ role }}</option>
          </select></label
        ><label class="text-sm dark:text-gray-200"
          >Status<select
            v-model="form.status"
            class="mt-1 h-10 w-full rounded-lg border px-3 dark:bg-gray-950"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="blocked">Bloqueado</option>
          </select></label
        >
        <div class="flex justify-end gap-3 sm:col-span-2">
          <button type="button" class="rounded-lg border px-4 py-2" @click="show = false">
            Cancelar</button
          ><button class="rounded-lg bg-brand-500 px-4 py-2 text-white">Salvar</button>
        </div>
      </form>
    </div></AdminLayout
  >
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import {
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
  removerUsuario,
  type Usuario,
  type UsuarioPayload,
  type UsuarioRole,
} from '@/services/usuarios'
const users = ref<Usuario[]>([]),
  loading = ref(false),
  show = ref(false),
  message = ref('')
const roles: UsuarioRole[] = ['admin', 'user', 'doctor', 'nurse', 'pharmacist', 'patient']
type Form = UsuarioPayload & { id?: number }
const blank = (): Form => ({
  nome: '',
  email: '',
  telefone: '',
  documento: '',
  login: '',
  senha: '',
  role: 'user',
  status: 'active',
})
const form = reactive<Form>(blank())
const fields: Array<{
  key: 'nome' | 'email' | 'telefone' | 'documento' | 'login' | 'senha'
  label: string
  type?: string
  required?: boolean
}> = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'email', label: 'E-mail', type: 'email', required: true },
  { key: 'telefone', label: 'Telefone' },
  { key: 'documento', label: 'Documento', required: true },
  { key: 'login', label: 'Login', required: true },
  { key: 'senha', label: 'Senha (mínimo 8 caracteres)', type: 'password' },
]
const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
const load = async () => {
  loading.value = true
  try {
    users.value = await listarUsuarios()
  } catch (error) {
    message.value = errorMessage(error, 'Erro ao carregar usuários.')
  } finally {
    loading.value = false
  }
}
const edit = (u?: Usuario) => {
  Object.assign(form, u ? { ...u, senha: '' } : blank())
  show.value = true
}
const save = async () => {
  try {
    if (form.id) await atualizarUsuario(form.id, form)
    else await criarUsuario(form)
    show.value = false
    await load()
  } catch (error) {
    message.value = errorMessage(error, 'Erro ao salvar usuário.')
  }
}
const remove = async (u: Usuario) => {
  if (!confirm(`Excluir ${u.nome}?`)) return
  try {
    await removerUsuario(u.id)
    await load()
  } catch (error) {
    message.value = errorMessage(error, 'Erro ao excluir usuário.')
  }
}
onMounted(load)
</script>
