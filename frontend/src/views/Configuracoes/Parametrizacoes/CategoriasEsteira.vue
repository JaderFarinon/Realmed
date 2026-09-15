<template>
  <AdminLayout>
    <div class="p-6">
      <h1 class="text-xl font-semibold mb-4">Categorias da Esteira Cirúrgica</h1>
      <form @submit.prevent="addCategoria" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <input v-model="form.nome" type="text" placeholder="Categoria" class="border rounded px-3 py-2" />
        <select v-model="form.convenio_id" class="border rounded px-3 py-2">
          <option value="" disabled>Convênio</option>
          <option v-for="c in convenios" :key="c.id" :value="c.id">{{ c.nome }}</option>
        </select>
        <input v-model="form.unidade" type="text" placeholder="Unidade" class="border rounded px-3 py-2" />
        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Adicionar</button>
      </form>
      <table class="min-w-full text-left border">
        <thead class="bg-gray-50">
          <tr>
            <th class="p-2 border">Categoria</th>
            <th class="p-2 border">Convênio</th>
            <th class="p-2 border">Unidade</th>
            <th class="p-2 border"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in categorias" :key="cat.id" class="border-t">
            <td class="p-2 border">{{ cat.nome }}</td>
            <td class="p-2 border">{{ getConvenio(cat.convenio_id) }}</td>
            <td class="p-2 border">{{ cat.unidade }}</td>
            <td class="p-2 border text-right">
              <button @click="removeCategoria(cat.id)" class="text-red-600">Remover</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/plugins/axios'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { buscarConveniosIntegrados } from '@/services/convenios'

type Categoria = {
  id: number
  nome: string
  convenio_id: number
  unidade: string
}

type Convenio = {
  id: number | string
  nome: string
}

const categorias = ref<Categoria[]>([])
const convenios = ref<Convenio[]>([])

const form = ref({ nome: '', convenio_id: '', unidade: '' })

const loadData = async () => {
  const [catRes, conveniosIntegrados] = await Promise.all([
    api.get('/esteira-categorias'),
    buscarConveniosIntegrados(),
  ])
  categorias.value = catRes.data
  convenios.value = conveniosIntegrados.map((item) => ({
    id:
      typeof item.id === 'number'
        ? item.id
        : Number.isFinite(Number(item.id))
          ? Number(item.id)
          : String(item.id),
    nome: item.nome,
  }))
}

const addCategoria = async () => {
  if (!form.value.nome || !form.value.convenio_id || !form.value.unidade) return
  const { data } = await api.post('/esteira-categorias', form.value)
  categorias.value.unshift(data)
  form.value = { nome: '', convenio_id: '', unidade: '' }
}

const removeCategoria = async (id: number) => {
  await api.delete(`/esteira-categorias/${id}`)
  categorias.value = categorias.value.filter(c => c.id !== id)
}

const getConvenio = (id: number) => {
  const c = convenios.value.find(cv => cv.id === id)
  return c ? c.nome : id
}

onMounted(loadData)
</script>
