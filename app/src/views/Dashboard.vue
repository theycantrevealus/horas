<template>
  <div class="grid">
    <div class="col-12"></div>
    <div class="col-12">Test Change</div>
    <div class="col-4">
      <card />
    </div>
    <div class="col-8">
      <card />
    </div>

    <div class="col-2">
      <card />
    </div>
    <div class="col-2">
      <card />
    </div>
    <div class="col-8">
      <card />
    </div>

    <div class="col-8">
      <card />
    </div>
    <div class="col-4">
      <card />
    </div>

    <div class="col-4">
      <card />
    </div>
    <div class="col-4">
      <card />
    </div>
    <div class="col-4">
      <card />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Card from 'primevue/card';

export default defineComponent({
  name: 'Dashboard',
  components: {
    Card,
  },
});
</script>
