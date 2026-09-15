<template>
  <PageShell title="Modelos de Documentos" subtitle="PDFs privados e posicionamento dos campos de geração">
    <section class="panel">
      <form class="grid gap-3 md:grid-cols-4" @submit.prevent="saveTemplate">
        <input v-model="form.name" class="input" placeholder="Nome" required>
        <select v-model="form.document_type" class="input" required><option value="" disabled>Tipo</option><option v-for="type in types" :key="type" :value="type">{{ documentTypeLabels[type as keyof typeof documentTypeLabels] }}</option></select>
        <select v-model="form.insurance_provider_id" class="input"><option value="">Genérico (todos)</option><option v-for="i in insurances" :key="i.id" :value="i.id">{{ i.name }}</option></select>
        <button class="btn">{{ editing ? 'Salvar' : 'Criar modelo' }}</button>
      </form>
    </section>
    <section class="panel overflow-x-auto">
      <table class="table"><thead><tr><th>Nome</th><th>Tipo</th><th>Convênio</th><th>Versão</th><th>PDF cadastrado</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        <tr v-for="item in templates" :key="item.id"><td>{{ item.name }}</td><td>{{ documentTypeLabels[item.document_type as keyof typeof documentTypeLabels] }}</td><td>{{ item.insurance_name || 'Genérico' }}</td><td>v{{ item.version }}</td><td>{{ item.template_file_path ? 'Sim' : 'Não' }}</td><td>{{ item.active ? 'Ativo' : 'Inativo' }}</td><td class="space-x-2"><button class="link" @click="edit(item)">Configurar</button><label class="link">Enviar PDF<input class="hidden" type="file" accept="application/pdf" @change="uploadTemplate($event,item.id)"></label><button class="link" @click="toggle(item)">{{ item.active ? 'Desativar' : 'Ativar' }}</button></td></tr>
      </tbody></table>
    </section>
    <section v-if="editing" class="panel">
      <h2 class="section-title">Campos do modelo</h2>
      <p class="mb-3 text-sm text-gray-500"><b>X:</b> distância da esquerda. <b>Y:</b> distância do topo. As medidas são pontos do PDF original.</p>
      <div class="overflow-x-auto"><table class="table"><thead><tr><th>Campo</th><th>Página</th><th>X</th><th>Y</th><th>Largura</th><th>Altura</th><th>Fonte</th><th>Alinhamento</th><th>Obrigatório</th><th></th></tr></thead><tbody>
        <tr v-for="(field,index) in fields" :key="index"><td><select v-model="field.field_key" class="input min-w-64"><optgroup v-for="category in keyCategories" :key="category.label" :label="category.label"><option v-for="key in category.keys" :key="key">{{ key }}</option></optgroup></select></td><td><input v-model.number="field.page" class="input w-20" type="number" min="1"></td><td><input v-model.number="field.x" class="input w-24" type="number"></td><td><input v-model.number="field.y" class="input w-24" type="number"></td><td><input v-model.number="field.width" class="input w-24" type="number"></td><td><input v-model.number="field.height" class="input w-24" type="number"></td><td><input v-model.number="field.font_size" class="input w-24" type="number"></td><td><select v-model="field.alignment" class="input"><option value="LEFT">Esquerda</option><option value="CENTER">Centro</option><option value="RIGHT">Direita</option></select></td><td class="text-center"><input v-model="field.options.required" type="checkbox"></td><td><button class="link" @click="fields.splice(index,1)">Remover</button></td></tr>
      </tbody></table></div>
      <div class="mt-3 flex gap-3"><button class="btn" @click="addField">Adicionar campo</button><button class="btn" @click="saveFields">Salvar campos</button></div>
    </section>
  </PageShell>
</template>
<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { onMounted, reactive, ref } from 'vue'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import { documentTypeLabels } from '@/utils/guideLabels'

const types = ['CONSULTATION_GUIDE', 'PHYSIOTHERAPY_GUIDE', 'ELECTROSTIMULATION', 'OTHER']
const keyCategories = [
  { label: 'Paciente', keys: ['PATIENT_NAME','PATIENT_BIRTH_DATE','PATIENT_CPF','PATIENT_CARD_NUMBER','PATIENT_CARD_EXPIRATION'] },
  { label: 'Convênio', keys: ['INSURANCE_NAME','INSURANCE_ANS_REGISTRATION','INSURANCE_LOGO'] },
  { label: 'Médico solicitante', keys: ['DOCTOR_NAME','DOCTOR_COUNCIL','DOCTOR_COUNCIL_NUMBER','DOCTOR_STATE','DOCTOR_CBO','DOCTOR_SIGNATURE'] },
  { label: 'Fisioterapeuta', keys: ['PHYSIOTHERAPIST_NAME','PHYSIOTHERAPIST_COUNCIL','PHYSIOTHERAPIST_COUNCIL_NUMBER','PHYSIOTHERAPIST_STATE','PHYSIOTHERAPIST_CBO'] },
  { label: 'Processo', keys: ['ASSESSMENT_DATE','EXPECTED_START_DATE','REQUESTED_SESSIONS','AUTHORIZED_SESSIONS'] },
  { label: 'Procedimentos (linhas 1–5)', keys: Array.from({ length: 5 }, (_, i) => ['CODE','DESCRIPTION','REQUESTED_QUANTITY','AUTHORIZED_QUANTITY'].map(column => `PROCEDURE_${i + 1}_${column}`)).flat() },
]
const templates=ref<any[]>([]),insurances=ref<any[]>([]),editing=ref<number|null>(null),fields=ref<any[]>([])
const form=reactive<any>({name:'',document_type:'',insurance_provider_id:''})
async function load(){[templates.value,insurances.value]=await Promise.all([(await api.get('/document-templates')).data,(await api.get('/insurance-providers')).data])}
async function saveTemplate(){const response=editing.value?await api.put(`/document-templates/${editing.value}`,form):await api.post('/document-templates',form);editing.value=response.data.id;await load()}
async function edit(item:any){const detail=(await api.get(`/document-templates/${item.id}`)).data;editing.value=item.id;Object.assign(form,detail);fields.value=detail.fields.map((field:any)=>({...field,options:typeof field.options==='string'?JSON.parse(field.options):field.options||{}}))}
function addField(){fields.value.push({field_key:'PATIENT_NAME',page:1,x:0,y:0,font_size:10,alignment:'LEFT',options:{required:false}})}
async function saveFields(){const response=await api.put(`/document-templates/${editing.value}/fields`,{fields:fields.value});editing.value=response.data.id;fields.value=response.data.fields;await load()}
async function uploadTemplate(event:Event,id:number){const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;const response=await api.post(`/document-templates/${id}/file`,file,{headers:{'Content-Type':'application/pdf','X-File-Name':encodeURIComponent(file.name)}});editing.value=response.data.id;await load()}
async function toggle(item:any){await api.put(`/document-templates/${item.id}`,{active:!item.active});await load()}
onMounted(load)
</script>
