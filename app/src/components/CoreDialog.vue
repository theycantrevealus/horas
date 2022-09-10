<template>
  <div>
    <Dialog v-model:visible="display" title="{{ title }}" header="{{ title }}" :style="{width: '80vw'}" footer="Footer">
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
