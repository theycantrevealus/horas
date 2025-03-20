<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>Dashboard Page</div>
  <Select
    v-model="selectedCity"
    :options="cities"
    class="country-selector dark"
    optionLabel="name"
    placeholder="Select a City"
  ></Select>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      selectedCity: {},
      cities: [
        { name: 'United States', code: 'us', lang: 'en' },
        { name: 'Indonesia', code: 'id', lang: 'id' },
      ],
    }
  },
})
</script>
