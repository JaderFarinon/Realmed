<template>
  <div>
    <GuideContinuity
      :process="process"
      :can-edit="canEdit"
      @open-guide="emit('open-guide', $event)"
      @updated="emit('updated')"
    />
    <GuideAuthorization
      v-if="canRead"
      :process="process"
      :can-edit="canEdit"
      :closed="closed"
      @updated="emit('updated')"
    />
    <section v-else class="panel">
      <h3>Sem Permissão</h3>
      <p>Usuário sem permissão a essa função</p>
    </section>
    <slot name="requirements" />
    <div v-if="process.pendingItems?.length" class="mt-4 space-y-2">
      <h3>Pendências do convênio</h3>
      <p
        v-for="item in process.pendingItems"
        :key="item.id"
        class="rounded-lg bg-gray-50 p-3 text-sm"
      >
        {{ item.description }} · {{ item.status === 'OPEN' ? 'Em aberto' : 'Resolvida' }}
      </p>
    </div>
    <AuthorizationDocuments
      :process-id="process.id"
      :documents="process.authorization_documents || []"
      :can-edit="canEdit"
      :can-read="canRead"
      :closed="closed"
      @updated="emit('updated')"
    />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useAuthUser } from '@/composables/useAuthUser'
import GuideContinuity from './GuideContinuity.vue'
import GuideAuthorization from './GuideAuthorization.vue'
import AuthorizationDocuments from './AuthorizationDocuments.vue'
defineProps<{ process: any; canEdit: boolean; closed: boolean; missing: string[] }>()
const emit = defineEmits(['updated', 'open-guide'])
const { canOperational } = useAuthUser()
const canRead = computed(() => canOperational('authorizations', 'canView'))
</script>
