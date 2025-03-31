<template>
  <div class="grid">
    <div class="col-4">
      Tol
      <Card />
    </div>
    <div class="col-8">
      <Card />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Card from 'primevue/card'

export default defineComponent({
  name: 'Home',
  components: {
    Card
  }
})
</script>
