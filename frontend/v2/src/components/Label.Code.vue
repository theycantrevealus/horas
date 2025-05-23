<template>
  <Button
    v-if="showText"
    type="button"
    :label="text"
    icon="pi pi-copy"
    severity="secondary"
    class="p-button-rounded p-button-raised text-left"
    style="min-width: 150px"
    variant="outlined"
    @click="copy(text)"
  />
  <Button
    v-else
    type="button"
    icon="pi pi-copy"
    severity="secondary"
    class="p-button-rounded p-button-raised icon-only"
    variant="outlined"
    @click="copy(text)"
  />
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import { storeCore } from '@/store/index'
export default defineComponent({
  name: 'LabelCode',
  props: {
    text: {
      type: String,
      required: true,
    },
    showText: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  computed: {
    ...mapStores(storeCore),
  },
  methods: {
    copy(text: string) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          this.coreStore.setToast({
            severity: 'info',
            summary: 'Copy Code',
            detail: `${text} is copied to clipboard`,
            life: 5000,
          })
        })
        .catch((error) => {
          console.error('Error copying text:', error)
        })
    },
  },
})
</script>
