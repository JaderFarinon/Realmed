<template>
  <div role="alert" class="my-4 rounded-xl border border-warning-300 bg-warning-50 p-4 text-warning-900">
    <p class="font-semibold">Etapa finalizada — alterações bloqueadas.</p>
    <p v-if="inherited" class="mt-1">Esta continuidade usa a avaliação do tratamento original. Os campos estão disponíveis apenas para consulta.</p>
    <p v-else class="mt-1">Todos os campos estão em somente leitura. Para alterar qualquer dado, é necessário <strong>reabrir a etapa primeiro</strong>, usando o botão <strong>{{ reopenLabel }}</strong>.<span v-if="tabbed"> Se o botão não aparecer, clique primeiro em <strong>Editar aba</strong>. A reabertura depende da sua permissão e da liberação da aba.</span></p>
  </div>
</template>
<script setup lang="ts">
withDefaults(defineProps<{tabbed?:boolean;inherited?:boolean;reopenLabel?:string}>(),{reopenLabel:'Reabrir etapa'})
</script>
