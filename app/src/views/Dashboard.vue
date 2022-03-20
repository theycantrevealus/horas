<template>
  <div class="p-grid">
    <div class="p-col-12"></div>
    <div class="p-col-12">Test Change</div>
    <div class="p-col-4">
      <Card />
    </div>
    <div class="p-col-8">
      <Card />
    </div>

    <div class="p-col-2">
      <Card />
    </div>
    <div class="p-col-2">
      <Card />
    </div>
    <div class="p-col-8">
      <Card />
    </div>

    <div class="p-col-8">
      <Card />
    </div>
    <div class="p-col-4">
      <Card />
    </div>

    <div class="p-col-4">
      <Card />
    </div>
    <div class="p-col-4">
      <Card />
    </div>
    <div class="p-col-4">
      <Card />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Card from 'primevue/card'

export default defineComponent({
  name: 'Dashboard',
  components: {
    Card
  }
})
</script>
