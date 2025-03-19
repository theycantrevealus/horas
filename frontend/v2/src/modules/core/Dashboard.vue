<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>Dashboard Page</div>
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
