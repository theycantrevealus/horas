<template>
  <div>
    <Dialog
      v-model:visible="displayDialog"
      title="{{ title }}"
      header="{{ title }}"
      :style="{width: '80vw'}"
      footer="Footer"
    >
      <slot></slot>
    </Dialog>
  </div>
</template>
<script>
import Dialog from 'primevue/dialog'
export default {
  name: 'CoreDialog',
  components: {
    Dialog,
  },
  props: {
    title: {
      type: String,
      default: '',
      required: true,
    },
    display: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['display'],
  data() {
    return {
      displayDialog: this.display,
    }
  },
}
</script>
