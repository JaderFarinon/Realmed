<template>
  <PageShell title="Meu Perfil" subtitle="Dados da sua conta no Realmed">
    <section class="panel" aria-labelledby="profile-data-title">
      <h2 id="profile-data-title">Dados pessoais</h2>
      <form class="mt-4" @submit.prevent="saveProfile">
        <fieldset :disabled="busy" class="grid gap-4 sm:grid-cols-2">
          <label>Nome<input v-model="profile.name" class="input" autocomplete="name" maxlength="150" required /></label>
          <label>E-mail<input v-model="profile.email" class="input" type="email" autocomplete="email" maxlength="150" /></label>
          <label>Telefone<input v-model="profile.phone" class="input" type="tel" autocomplete="tel" maxlength="20" /></label>
          <div><span class="text-gray-500">Login</span><p class="mt-1 break-all">{{ authUser?.username || '—' }}</p></div>
          <div><span class="text-gray-500">Perfil de acesso</span><p class="mt-1">{{ roleLabels[authUser?.role || ''] || 'Usuário' }}</p></div>
          <div><span class="text-gray-500">Tipo de conta</span><p class="mt-1">{{ localAccount ? 'Realmed' : 'Stenci' }}</p></div>
        </fieldset>
        
        <div class="mt-4 flex justify-end"><button type="submit" class="btn" :disabled="busy">{{ savingProfile ? 'Salvando…' : 'Salvar dados' }}</button></div>
      </form>
    </section>
    <section v-if="localAccount" class="panel" aria-labelledby="password-title">
      <h2 id="password-title">Alterar senha</h2>
      <p class="mt-2 text-gray-500">Use pelo menos 12 caracteres. O limite é de 72 bytes.</p>
      <form class="mt-4" @submit.prevent="savePassword">
        <fieldset :disabled="busy" class="grid gap-4 sm:grid-cols-2">
          <label class="sm:col-span-2">Senha atual<input v-model="password.currentPassword" class="input" type="password" autocomplete="current-password" required /></label>
          <label>Nova senha<input v-model="password.newPassword" class="input" type="password" autocomplete="new-password" minlength="12" required /></label>
          <label>Confirmar nova senha<input v-model="password.confirmPassword" class="input" type="password" autocomplete="new-password" minlength="12" required /></label>
        </fieldset>
        
        <div class="mt-4 flex justify-end"><button type="submit" class="btn" :disabled="busy">{{ savingPassword ? 'Alterando…' : 'Alterar senha' }}</button></div>
      </form>
    </section>
    <section v-else class="panel"><h2>Senha de acesso</h2><p class="mt-2 text-gray-500">Esta conta utiliza o Stenci. Altere a senha diretamente no Stenci.</p></section>
  </PageShell>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { computed, reactive, ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
const { authUser, updateProfile } = useAuthUser()
const localAccount = computed(() => authUser.value?.authProvider === 'LOCAL')
const profile = reactive({ name: authUser.value?.name || '', email: authUser.value?.email || '', phone: authUser.value?.phone || '' })
const password = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const savingProfile = ref(false), savingPassword = ref(false), profileMessage = ref(''), passwordMessage = ref(''), profileError = ref(false), passwordError = ref(false)
const busy = computed(() => savingProfile.value || savingPassword.value)
const roleLabels: Record<string, string> = { user: 'Usuário', admin: 'Administrador', masteradmin: 'Administrador principal', doctor: 'Médico', nurse: 'Enfermagem', pharmacist: 'Farmacêutico', patient: 'Paciente' }
async function saveProfile() {
  if (busy.value) return
  savingProfile.value = true; profileMessage.value = ''; profileError.value = false
  try {
    const { user } = (await api.put('/auth/me', { ...profile })).data
    updateProfile(user)
    Object.assign(profile, { name: user.name || '', email: user.email || '', phone: user.phone || '' })
    profileMessage.value = 'Dados pessoais salvos com sucesso.'
  } catch (error: any) {
    profileError.value = true; profileMessage.value = error.response?.data?.error || 'Não foi possível salvar seus dados. Tente novamente.'
  } finally { savingProfile.value = false }
}
async function savePassword() {
  if (busy.value || !localAccount.value) return
  passwordError.value = false; passwordMessage.value = ''
  if (password.newPassword !== password.confirmPassword) { passwordError.value = true; passwordMessage.value = 'A confirmação da nova senha não confere.'; return }
  savingPassword.value = true
  try {
    await api.post('/auth/me/password', { ...password })
    Object.assign(password, { currentPassword: '', newPassword: '', confirmPassword: '' })
    passwordMessage.value = 'Senha alterada com sucesso.'
  } catch (error: any) {
    passwordError.value = true; passwordMessage.value = error.response?.data?.error || 'Não foi possível alterar a senha. Tente novamente.'
  } finally { savingPassword.value = false }
}

useFeedback(() => unwrapNoticeValue(profileMessage), () => unwrapNoticeValue(profileError) ? 'error' : 'success')
useFeedback(() => unwrapNoticeValue(passwordMessage), () => unwrapNoticeValue(passwordError) ? 'error' : 'success')
</script>
<style scoped>
label { display: flex; flex-direction: column; gap: 0.375rem; min-width: 0; }
label .input { width: 100%; min-width: 0; }
</style>
