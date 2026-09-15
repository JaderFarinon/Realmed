<template>
  <div
    :class="[
      'rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]',
      props.className,
    ]"
  >
    <!-- Card Header -->
    <div class="px-6 py-5">
      <h3 class="text-base font-medium text-gray-800 dark:text-white/90">
        {{ props.title }}
      </h3>
      <p v-if="props.desc" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ props.desc }}
      </p>
    </div>

    <!-- Card Body -->
    <div
      class="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6"
      :class="props.bodyClass"
    >
      <div :class="props.contentClass">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  className?: string
  desc?: string
  bodyClass?: string
  contentClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  contentClass: 'space-y-5',
})
</script>
