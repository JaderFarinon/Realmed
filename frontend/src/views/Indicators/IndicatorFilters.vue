<template>
  <div class="indicator-filter-fields">
    <label
      >De<input
        v-model="model.start"
        type="date"
        class="input"
        min="2000-01-01"
        :max="today()"
        required
    /></label>
    <label
      >Até<input
        v-model="model.end"
        type="date"
        class="input"
        :min="model.start"
        :max="today()"
        required
    /></label>
    <label v-if="model.area === 'epidemiology'"
      >Origem<select v-model="model.source" class="input">
        <option value="combined">Stenci + Realmed</option>
        <option value="stenci">Agenda Stenci</option>
        <option value="local">Tratamentos Realmed</option>
      </select></label
    >
    <label
      >Convênio<select v-model="model.insurance" class="input">
        <option value="">Todos</option>
        <option
          v-if="model.insurance && !options.insurances.includes(model.insurance)"
          :value="model.insurance"
        >
          {{ model.insurance }}
        </option>
        <option v-for="name in options.insurances" :key="name">{{ name }}</option>
        <option value="Não informado">Não informado</option>
      </select></label
    >
    <template
      v-if="
        model.area !== 'billing' && !(model.area === 'epidemiology' && model.source === 'local')
      "
    >
      <label
        >Status da agenda<select v-model="model.status" class="input">
          <option value="active">Ativos (sem cancelados/remarcados)</option>
          <option value="all">Todos</option>
          <option value="finished">Finalizados</option>
          <option value="missed">Faltas</option>
          <option value="scheduled">Agendados</option>
          <option value="confirmed">Confirmados</option>
          <option value="patient_canceled">Cancelados pelo paciente</option>
          <option value="professional_canceled">Cancelados pelo profissional</option>
        </select></label
      >
      <label
        >Agenda<select v-model="model.scheduleId" class="input">
          <option value="all">Todas</option>
          <option
            v-if="
              model.scheduleId !== 'all' &&
              !options.schedules.some((x) => x.id === model.scheduleId)
            "
            :value="model.scheduleId"
          >
            Agenda selecionada
          </option>
          <option v-for="s in options.schedules" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select></label
      >
      <label
        >Unidade de atendimento<select v-model="model.placeId" class="input">
          <option value="all">Todas</option>
          <option value="unassigned">Não informada</option>
          <option
            v-if="
              !['all', 'unassigned'].includes(model.placeId) &&
              !options.places.some((x) => x.id === model.placeId)
            "
            :value="model.placeId"
          >
            Unidade selecionada
          </option>
          <option v-for="s in options.places" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select></label
      >
    </template>
    <p
      v-if="model.area === 'epidemiology' && model.source === 'combined'"
      class="indicator-filter-help"
    >
      Status, agenda e unidade filtram apenas a origem Stenci. Tratamentos locais usam período de
      criação e convênio.
    </p>
    <p v-if="model.area === 'billing'" class="indicator-filter-help">
      Situação atual dos ciclos criados no período, por guia. Não representa valores recebidos nem a
      situação passada dos ciclos.
    </p>
  </div>
</template>
<script setup lang="ts">
import type { Filters, Options } from './types'
import { today } from './types'
const model = defineModel<Filters>({ required: true })
defineProps<{ options: Options }>()
</script>
