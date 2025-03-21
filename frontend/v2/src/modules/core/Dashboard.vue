<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>
    <h1>{{ $t('global.menu.dashboard') }}</h1>
  </div>
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
