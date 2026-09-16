<template>
  <PageShell :title="config.title" subtitle="Cadastros auxiliares da Central de Guias">
    <div class="panel">
      <form class="grid gap-4 md:grid-cols-3" @submit.prevent="save">
        <template v-for="field in config.fields" :key="field.key">
          <select v-if="field.options" v-model="form[field.key]" class="input" :required="field.required">
            <option value="">{{ field.label }}</option>
            <option v-for="fieldOption in field.options" :key="fieldOption.value" :value="fieldOption.value">{{ fieldOption.label }}</option>
          </select>
          <input v-else v-model="form[field.key]" class="input" :placeholder="field.label" :required="field.required" />
        </template>

        <section v-if="isInsurance" class="logo-editor md:col-span-3" aria-labelledby="insurance-logo-title">
          <div class="logo-preview">
            <img v-if="previewUrl" :src="previewUrl" alt="Prévia da logo do convênio" />
            <span v-else>Sem logo cadastrada</span>
          </div>
          <div class="min-w-0">
            <h2 id="insurance-logo-title" class="font-semibold text-gray-800">Logo do convênio</h2>
            <p class="mt-1 text-sm text-gray-500">Utilizada na identificação do convênio e na geração de documentos quando aplicável.</p>
            <label v-if="canEditLogo" class="btn-secondary mt-3 inline-block cursor-pointer">
              {{ previewUrl ? 'Substituir imagem' : 'Selecionar imagem' }}
              <input class="hidden" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" @change="selectLogo" />
            </label>
            <p class="mt-2 text-xs text-gray-500">PNG, JPG ou JPEG, até 5 MB.</p>
          </div>
        </section>

        <p v-if="message" class="text-sm text-red-600 md:col-span-3" role="alert">{{ message }}</p>
        <button class="btn" :disabled="saving">{{ saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar' }}</button>
        <button v-if="editing" type="button" class="input" @click="reset">Cancelar</button>
      </form>
    </div>

    <div class="panel overflow-x-auto">
      <table class="table">
        <thead><tr><th>Nome / descrição</th><th>Tipo</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><div class="flex items-center gap-2"><img v-if="isInsurance && logoUrls[item.id]" :src="logoUrls[item.id]" class="logo-thumb" alt="" /><span v-else-if="isInsurance" class="logo-empty">—</span><span>{{ item.name || item.full_name || `${item.code} — ${item.description}` }}</span></div></td>
            <td>{{ enumLabel(item.authorization_type || item.type) }}</td>
            <td>{{ item.active ? 'Ativo' : 'Inativo' }}</td>
            <td class="space-x-2 text-right"><button class="link" @click="edit(item)">Editar</button><button class="link" @click="toggle(item)">{{ item.active ? 'Desativar' : 'Ativar' }}</button><label v-if="config.asset && !isInsurance && canEditLogo" class="link">{{ config.asset.label }}<input class="hidden" type="file" :accept="config.asset.accept" @change="uploadAsset($event,item.id)" /></label><button v-if="config.asset && !isInsurance" class="link" @click="viewAsset(item.id)">Visualizar</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import { useAuthUser } from '@/composables/useAuthUser'
import { authorizationTypeLabels, professionalTypeLabels, procedureTypeLabels } from '@/utils/guideLabels'

type Item = Record<string, any>
const route = useRoute(), { authUser } = useAuthUser()
const items = ref<Item[]>([]), editing = ref<number | null>(null), form = reactive<Item>({})
const selectedLogo = ref<File | null>(null), previewUrl = ref(''), currentLogoUrl = ref(''), saving = ref(false), message = ref('')
const logoUrls = reactive<Record<number, string>>({})
const option = (map: Record<string, string>) => Object.entries(map).map(([value, label]) => ({ value, label }))
const enumLabels = { ...authorizationTypeLabels, ...professionalTypeLabels, ...procedureTypeLabels }
const configs: Record<string, any> = {
  insurance: { title: 'Convênios', endpoint: 'insurance-providers', fields: [{key:'name',label:'Nome',required:true},{key:'internal_code',label:'Código interno'},{key:'ans_registration',label:'Registro ANS'},{key:'authorization_type',label:'Tipo de liberação',required:true,options:option(authorizationTypeLabels)}], asset: {path:'insurance-providers',name:'logo'} },
  professionals: { title: 'Profissionais', endpoint: 'professionals', fields: [{key:'full_name',label:'Nome completo',required:true},{key:'type',label:'Tipo de profissional',required:true,options:option(professionalTypeLabels)},{key:'council',label:'Conselho',required:true},{key:'council_number',label:'Número',required:true},{key:'state',label:'UF',required:true},{key:'cbo',label:'CBO'}], asset: {path:'professionals',name:'signature',label:'Enviar assinatura',accept:'.png'} },
  procedures: { title: 'Procedimentos', endpoint: 'procedures', fields: [{key:'code',label:'Código',required:true},{key:'description',label:'Descrição',required:true},{key:'table_name',label:'Tabela'},{key:'type',label:'Tipo',required:true,options:option(procedureTypeLabels)}] },
}
const config = computed(() => configs[String(route.meta.catalog)])
const isInsurance = computed(() => String(route.meta.catalog) === 'insurance')
const canEditLogo = computed(() => authUser.value?.role === 'masteradmin' || Boolean(authUser.value?.permissions?.find(permission => permission.moduleKey === config.value.endpoint.replace('-', '_'))?.canEdit))
const enumLabel = (value: string) => enumLabels[value as keyof typeof enumLabels] || value

function revoke(url: string) { if (url.startsWith('blob:')) URL.revokeObjectURL(url) }
function clearPreview() { revoke(previewUrl.value); if (previewUrl.value !== currentLogoUrl.value) revoke(currentLogoUrl.value); previewUrl.value='';currentLogoUrl.value='';selectedLogo.value=null }
async function fetchLogo(id: number) { const response=await api.get(`/insurance-providers/${id}/logo`,{responseType:'blob'});return URL.createObjectURL(response.data) }
async function load() { Object.values(logoUrls).forEach(revoke);Object.keys(logoUrls).forEach(key=>delete logoUrls[Number(key)]);items.value=(await api.get(`/${config.value.endpoint}`)).data;if(isInsurance.value)await Promise.all(items.value.filter(item=>Boolean(item.has_logo)).map(async item=>{logoUrls[item.id]=await fetchLogo(item.id)})) }
function reset() { editing.value=null;Object.keys(form).forEach(key=>delete form[key]);form.active=true;message.value='';clearPreview() }
async function save() { saving.value=true;message.value='';try { let id=editing.value;if(id)await api.put(`/${config.value.endpoint}/${id}`,form);else id=(await api.post(`/${config.value.endpoint}`,form)).data.id;if(selectedLogo.value&&id)await sendAsset(selectedLogo.value,id);reset();await load() } catch(error:any) { message.value=error.response?.data?.error||'Não foi possível salvar o cadastro.' } finally { saving.value=false } }
async function edit(item: Item) { reset();editing.value=item.id;Object.assign(form,item);if(isInsurance.value&&item.has_logo){currentLogoUrl.value=await fetchLogo(item.id);previewUrl.value=currentLogoUrl.value} }
async function toggle(item: Item) { await api.patch(`/${config.value.endpoint}/${item.id}/active`,{active:!item.active});await load() }
function selectLogo(event: Event) { const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;message.value='';if(!['image/png','image/jpeg'].includes(file.type)||!/^.+\.(png|jpe?g)$/i.test(file.name)){message.value='Selecione uma imagem PNG, JPG ou JPEG.';input.value='';return}if(file.size>5*1024*1024){message.value='A imagem deve ter no máximo 5 MB.';input.value='';return}if(previewUrl.value!==currentLogoUrl.value)revoke(previewUrl.value);selectedLogo.value=file;previewUrl.value=URL.createObjectURL(file);input.value='' }
async function sendAsset(file: File,id:number){await api.post(`/${config.value.asset.path}/${id}/${config.value.asset.name}`,file,{headers:{'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name)}})}
async function uploadAsset(event:Event,id:number){const input=event.target as HTMLInputElement,file=input.files?.[0];if(file)await sendAsset(file,id);input.value=''}
async function viewAsset(id:number){const response=await api.get(`/${config.value.asset.path}/${id}/${config.value.asset.name}`,{responseType:'blob'});window.open(URL.createObjectURL(response.data),'_blank')}
watch(()=>route.path,async()=>{reset();await load()})
onMounted(async()=>{reset();try{await load()}catch(error:any){message.value=error.response?.data?.error||'Não foi possível carregar o cadastro.'}})
onBeforeUnmount(()=>{clearPreview();Object.values(logoUrls).forEach(revoke)})
</script>

<style scoped>
.logo-editor{display:flex;align-items:center;gap:1rem;padding:1rem;border:1px solid #e5e7eb;border-radius:.75rem;background:#f9fafb}.logo-preview{display:flex;width:8rem;height:6rem;flex:0 0 8rem;align-items:center;justify-content:center;overflow:hidden;border:1px dashed #d1d5db;border-radius:.5rem;background:white;color:#6b7280;font-size:.75rem;text-align:center;padding:.5rem}.logo-preview img{width:100%;height:100%;object-fit:contain}.logo-thumb{width:2rem;height:2rem;object-fit:contain;border-radius:.25rem;border:1px solid #e5e7eb}.logo-empty{display:inline-flex;width:2rem;height:2rem;align-items:center;justify-content:center;color:#9ca3af}@media(max-width:640px){.logo-editor{align-items:flex-start;flex-direction:column}.logo-preview{width:100%;height:7rem;flex-basis:auto}}
</style>
