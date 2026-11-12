<template>
  <main class="celebration">
    <div class="festive-lights" aria-hidden="true"><span v-for="n in 9" :key="n">✦</span></div>
    <header class="event-brand"><span class="brand-mark" aria-hidden="true">✦</span> REALMED <span class="event-year">JUNTOS EM 2026</span></header>
    <div class="event-layout">
      <section class="invitation" aria-labelledby="event-title">
        <p class="event-eyebrow">UM BRINDE À NOSSA EQUIPE</p>
        <h1 id="event-title">Confraternização<br>de fim de ano <em>Realmed</em></h1>
        <p class="event-lead">Um ano de dedicação merece uma boa comemoração!</p>
        <p class="event-message">Cada atendimento, cada desafio e cada conquista tiveram a participação de vocês. Agora é hora de reunir a equipe, compartilhar boas risadas e celebrar tudo o que construímos juntos!</p>
        <div class="event-details">
          <div class="event-detail"><span class="detail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h3m3 0h3m-9 3h3"/></svg></span><div><strong>10 de dezembro de 2026</strong><span>Quinta-feira · 19h30</span></div></div>
          <div class="event-detail"><span class="detail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><div><strong>Pizzaria La Piazza</strong><span>R. Chile, 2258 — Rebouças</span></div></div>
        </div>
        <p class="event-closing">Esperamos vocês para brindar esse ano e renovar as energias para o próximo!</p>
      </section>

      <section class="rsvp-card" aria-labelledby="rsvp-title">
        <template v-if="!confirmed">
          <p class="card-eyebrow">VAMOS CELEBRAR?</p>
          <h2 id="rsvp-title">Confirme sua presença</h2>
          <p class="card-description">Conte para nós quem vai estar nessa comemoração.</p>
          <form @submit.prevent="submit">
            <fieldset :disabled="sending">
              <label class="name-field" for="participant-name">Seu nome completo <span aria-hidden="true">*</span><input id="participant-name" v-model="name" name="name" autocomplete="name" required minlength="2" maxlength="120" placeholder="Como você se chama?" /></label>
              <div class="companions-control">
                <div><label id="companion-label">Acompanhante</label><p>No máximo 1 pessoa, além de você</p></div>
                <div class="quantity-control" role="group" aria-labelledby="companion-label" aria-describedby="companion-note">
                  <button type="button" aria-label="Remover acompanhante" :disabled="count === 0" @click="count--">−</button>
                  <output aria-live="polite" aria-label="Quantidade de acompanhantes">{{ count }}</output>
                  <button type="button" aria-label="Adicionar acompanhante" :disabled="count >= 1" @click="addCompanion">+</button>
                </div>
              </div>
              <p id="companion-note" class="companion-note"><strong>A sua parte já está garantida por nossa conta!</strong><span>Caso queiram levar acompanhante, vai ser ótimo, só lembre que a parte do acompanhante fica por conta de vocês.</span></p>
              <div v-if="count" class="companion-fields">
                <label v-for="(_, index) in activeCompanions" :key="index" class="name-field" :for="`companion-${index}`">Nome do acompanhante <span aria-hidden="true">*</span><input :id="`companion-${index}`" v-model="companionNames[index]" :name="`companion-${index}`" autocomplete="off" required minlength="2" maxlength="120" placeholder="Nome completo" /></label>
              </div>
              <div class="party-total"><span>Total de presenças</span><strong>{{ count + 1 }} {{ count ? 'pessoas' : 'pessoa' }}</strong></div>
              <button class="confirm-presence" type="submit" :aria-busy="sending">{{ sending ? 'Confirmando…' : 'Confirmar minha presença' }} <span v-if="!sending" aria-hidden="true">↗</span></button>
            </fieldset>
            <p class="form-note">Sua confirmação ajuda a preparar esse encontro especial.</p>
          </form>
        </template>
        <div v-else class="confirmation-success" role="status">
          <span class="success-mark" aria-hidden="true">✓</span>
          <p class="card-eyebrow">ENCONTRO MARCADO!</p>
          <h2 id="rsvp-title" tabindex="-1" ref="successHeading">Presença confirmada!</h2>
          <p>{{ name.trim() }}, esperamos você{{ count ? ' e seu acompanhante' : '' }} para celebrar com a gente.</p>
          <div class="confirmed-summary"><strong>{{ count + 1 }} {{ count ? 'presenças confirmadas' : 'presença confirmada' }}</strong><span>10 de dezembro · 19h30</span><span>Pizzaria La Piazza</span><ul v-if="count"><li v-for="(companion,index) in activeCompanions" :key="index">{{ companion }}</li></ul></div>
          <p class="success-footer">Até lá! <span aria-hidden="true">✦</span></p>
        </div>
      </section>
    </div>
    <footer class="event-footer">FEITO DE PESSOAS. CELEBRADO JUNTOS. <span aria-hidden="true">✦</span></footer>
  </main>
</template>

<script setup lang="ts">
import {computed,nextTick,ref} from 'vue'
import axios from 'axios'
import {notify} from '@/composables/useNotifications'

const name=ref(''),count=ref(0),companionNames=ref<string[]>([]),sending=ref(false),confirmed=ref(false)
const successHeading=ref<HTMLElement|null>(null)
const activeCompanions=computed(()=>Array.from({length:count.value},(_,index)=>companionNames.value[index] || ''))
const submissionKey=crypto.randomUUID()
const origin=(import.meta.env.VITE_API_URL || 'http://localhost:3005').replace(/\/+$/,'')
const apiBase=/\/api$/i.test(origin) ? origin : `${origin}/api`
function addCompanion(){ if(count.value<1){if(companionNames.value[count.value]===undefined)companionNames.value[count.value]='';count.value++} }
async function submit(){
  if(sending.value || confirmed.value)return
  if(name.value.trim().length<2 || activeCompanions.value.some(value=>value.trim().length<2)){notify('Preencha seu nome e o nome de cada acompanhante.','warning');return}
  sending.value=true
  try{
    const {data}=await axios.post(`${apiBase}/public/events/realmed-2026/confirmations`,{name:name.value,companions:activeCompanions.value,submission_key:submissionKey},{timeout:20000})
    if(data.confirmed!==true)throw new Error('Confirmação não recebida')
    confirmed.value=true
    notify('Sua presença foi confirmada. Esperamos você!','success')
    await nextTick();successHeading.value?.focus({preventScroll:true});successHeading.value?.scrollIntoView({behavior:'smooth',block:'center'})
  }catch(error){notify(axios.isAxiosError(error) && typeof error.response?.data?.error==='string' ? error.response.data.error : 'Não foi possível confirmar agora. Seus dados continuam aqui; tente novamente.','error')}
  finally{sending.value=false}
}
</script>

<style scoped>
.companion-note{margin:-8px 0 22px;font-size:13px;line-height:1.7;color:#52644f}.companion-note strong{display:block;color:#284e3e;margin-bottom:5px}.companion-note span{display:block}
.celebration{min-height:100svh;background:#f9f6ef;color:#203f34;padding:0 24px 26px;position:relative;isolation:isolate;overflow:hidden}.celebration::before{content:'';position:absolute;z-index:-1;width:640px;height:640px;border:1px solid #bfa36830;border-radius:50%;left:-380px;top:230px;box-shadow:0 0 0 55px #bfa3680a,0 0 0 110px #bfa36808;pointer-events:none}.festive-lights{display:flex;justify-content:space-around;max-width:1220px;margin:auto;height:54px;color:#b28a45;align-items:flex-start;border-top:1px solid #c9b47c}.festive-lights span{font-size:18px;padding-top:16px;position:relative}.festive-lights span::before{content:'';position:absolute;height:14px;width:1px;background:#c9b47c;top:0;left:50%}.festive-lights span:nth-child(3n){padding-top:29px;font-size:13px}.festive-lights span:nth-child(3n)::before{height:27px}.event-brand{max-width:1110px;margin:8px auto 44px;display:flex;align-items:center;gap:10px;font-size:19px;font-weight:750;letter-spacing:.03em}.brand-mark{color:#a7803d;font-size:28px}.event-year{margin-left:auto;font-size:10px;font-weight:600;letter-spacing:.18em;color:#7b806e}.event-layout{max-width:1110px;margin:auto;display:grid;grid-template-columns:1.1fr 1fr;gap:78px;align-items:start}.invitation{padding-top:16px}.event-eyebrow,.card-eyebrow{font-size:10px;font-weight:700;letter-spacing:.16em;color:#9a7437;margin-bottom:16px}.celebration h1{font-family:Georgia,'Times New Roman',serif;font-size:50px;line-height:1.08;letter-spacing:-.04em;font-weight:400;color:#203f34;margin:0 0 23px}.celebration h1 em{display:block;color:#9b773e;font-style:italic}.event-lead{font-size:18px;line-height:1.5;font-weight:600;margin-bottom:14px;max-width:390px}.event-message,.event-closing{font-size:14px;line-height:1.8;color:#677166}.event-details{display:grid;gap:20px;margin:27px 0;padding:23px 0;border-block:1px solid #dedccd}.event-detail{display:flex;gap:14px;align-items:center}.detail-icon{width:43px;height:43px;flex:none;border:1px solid #d9d5c2;border-radius:12px;display:grid;place-items:center;background:#f2eee1;color:#90703b}.detail-icon svg{width:23px;height:23px}.event-detail strong{display:block;font-size:15px;font-weight:650}.event-detail div>span{display:block;font-size:13px;color:#717565;margin-top:4px}.event-closing{font-style:italic}.rsvp-card{background:#fffefb;border:1px solid #e2dfd1;border-radius:23px;padding:34px;box-shadow:0 15px 45px #31443809;border-top:4px solid #284e3e}.card-eyebrow{margin-bottom:9px}.celebration h2{font-size:26px;line-height:1.25;letter-spacing:-.03em;font-weight:650;margin:0 0 10px}.card-description{font-size:13px;line-height:1.6;color:#758073;margin-bottom:26px}.rsvp-card fieldset{border:0;min-width:0;padding:0;margin:0}.name-field{display:block;font-size:13px;font-weight:600;color:#314b3e}.name-field>span{color:#a7803d}.name-field input{display:block;width:100%;min-height:50px;margin-top:8px;border:1px solid #dcded2;border-radius:10px;padding:12px 14px;font:inherit;font-size:16px;font-weight:400;color:#203f34;background:#fff;box-sizing:border-box;outline:none}.name-field input::placeholder{color:#9a9f93}.name-field input:focus{border-color:#547f65;box-shadow:0 0 0 3px #547f651b}.companions-control{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:25px 0}.companions-control label{font-size:14px;font-weight:600}.companions-control p{font-size:12px;color:#7d8477;margin:4px 0 0}.quantity-control{display:flex;align-items:center;gap:4px;background:#f4f5ef;padding:4px;border:1px solid #e1e3d7;border-radius:12px}.quantity-control button{width:44px;min-height:44px;border:1px solid #dce0d2;border-radius:9px;background:#fffefb;color:#284e3e;font-size:23px;line-height:1;cursor:pointer}.quantity-control button:disabled{opacity:.35;cursor:default}.quantity-control output{min-width:32px;text-align:center;font-weight:650;font-size:18px}.companion-fields{display:grid;gap:16px;padding:0 0 22px}.party-total{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:15px 0 21px;border-top:1px solid #e9e9df;font-size:13px;color:#6d796c}.party-total strong{color:#284e3e;font-size:14px}.confirm-presence{display:flex;align-items:center;justify-content:center;gap:18px;width:100%;min-height:53px;padding:13px 16px;border:0;border-radius:11px;background:#284e3e;color:#fffef7;font-size:14px;font-weight:600;cursor:pointer}.confirm-presence:hover{background:#193d2e}.confirm-presence span{font-size:21px}.rsvp-card :is(button,input):focus-visible{outline:3px solid #a7803d;outline-offset:3px}.rsvp-card fieldset:disabled{opacity:.7}.form-note{font-size:11px;text-align:center;color:#858b7f;line-height:1.6;margin:15px 0 0}.event-footer{max-width:1110px;margin:50px auto 0;display:flex;align-items:center;justify-content:center;gap:13px;color:#8b907e;font-size:9px;letter-spacing:.18em}.event-footer span{font-size:17px;color:#b28a45}.confirmation-success{text-align:center;padding:10px 0}.success-mark{display:grid;place-items:center;margin:0 auto 25px;width:66px;height:66px;border:1px solid #bfd1bf;border-radius:50%;background:#edf4e9;color:#2a623e;font-size:32px}.confirmation-success>p:not(.card-eyebrow){font-size:14px;line-height:1.7;color:#697765;overflow-wrap:anywhere}.confirmed-summary{display:grid;gap:8px;background:#f3f5ee;border-radius:13px;padding:22px 14px;margin-top:25px;font-size:14px}.confirmed-summary>span{color:#6e7969;font-size:13px}.confirmed-summary ul{border-top:1px solid #dce2d5;margin-top:8px;padding-top:12px;list-style:none;font-size:13px;color:#62715c;overflow-wrap:anywhere}.confirmed-summary li+li{margin-top:5px}.success-footer{margin-top:25px}.success-footer span{color:#b28a45}
@media(max-width:900px){.event-layout{gap:34px}.celebration h1{font-size:42px}.rsvp-card{padding:25px}.event-brand{margin-bottom:27px}}
@media(max-width:640px){.celebration{padding:0 18px 22px}.festive-lights{height:41px}.event-brand{font-size:17px;margin:5px auto 26px}.event-year{font-size:8px}.brand-mark{font-size:24px}.event-layout{grid-template-columns:minmax(0,1fr);gap:27px;max-width:460px}.invitation{padding-top:0}.event-eyebrow{font-size:9px;margin-bottom:13px}.celebration h1{font-size:39px;margin-bottom:19px}.event-lead{font-size:16px;max-width:340px;margin-bottom:12px}.event-message,.event-closing{font-size:13px;line-height:1.7}.event-details{margin:20px 0;padding:18px 0;gap:17px}.event-detail strong{font-size:14px}.event-detail div>span{font-size:12px}.detail-icon{width:39px;height:39px}.rsvp-card{padding:24px 20px;border-radius:18px}.celebration h2{font-size:24px}.card-description{margin-bottom:23px}.event-footer{margin-top:30px;font-size:8px;letter-spacing:.12em}.companions-control{margin-block:23px}.quantity-control{gap:0}.quantity-control button{width:44px}.quantity-control output{min-width:29px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style>
