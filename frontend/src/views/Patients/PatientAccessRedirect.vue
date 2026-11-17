<template><main class="p-8 text-center"><p role="status">{{ error || 'Abrindo o app do paciente…' }}</p><button v-if="error" class="btn-secondary mt-4" @click="open">Tentar novamente</button></main></template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { patientPortalUrl } from '@/utils/patientPortal'
const route = useRoute(), error = ref('')
async function open() { error.value = ''; try { window.location.replace(await patientPortalUrl(String(route.params.id))) } catch (e: any) { error.value = e.response?.data?.error || 'Não foi possível abrir o app do paciente.' } }
onMounted(open)
</script>
