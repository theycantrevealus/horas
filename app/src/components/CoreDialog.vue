<template>
  <div>
    <Dialog title="{{ title }}" header="{{ title }}" :style="{width: '80vw'}" footer="Footer" v-model:visible="display">
      <slot></slot>
    </Dialog>
  </div>
</template>
<script>
import Dialog from 'primevue/dialog'
export default {
  name: 'CoreDialog',
  components: {
    Dialog
  },
  props: {
    title: {
      required: true
    },
    display: false
  }
}
</script>
