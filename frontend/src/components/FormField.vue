<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="labelFor" class="text-sm font-semibold text-gray-700 dark:text-gray-200">
      {{ label }}
    </label>
    <slot />
    <p v-if="help" class="text-xs text-gray-500 dark:text-gray-400">{{ help }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps({
  label: String,
  labelFor: String,
  help: String,
})
</script>
