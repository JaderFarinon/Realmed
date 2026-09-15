declare module '@tinymce/tinymce-vue' {
  import type { DefineComponent } from 'vue'

  export const Editor: DefineComponent<{ modelValue?: string }>
  const component: typeof Editor
  export default component
}
