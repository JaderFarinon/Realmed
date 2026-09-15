<template>
  <ThemeProvider>
    <SidebarProvider>
      <ToastContainer />
      <PermissionDeniedModal />
      <RouterView />
    </SidebarProvider>
  </ThemeProvider>
</template>

<script setup lang="ts">
import ThemeProvider from './components/layout/ThemeProvider.vue'
import SidebarProvider from './components/layout/SidebarProvider.vue'
import ToastContainer from './components/ui/ToastContainer.vue'
import PermissionDeniedModal from './components/ui/PermissionDeniedModal.vue'
</script>
