<!-- eslint-disable vue/require-toggle-inside-transition -->
<template>
  <router-view v-slot="{ Component }">
    <transition name="scale" mode="out-in">
      <div>
        <component :is="Component" />
      </div>
    </transition>
  </router-view>
  <Toast :position="'top-right'" />
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'pinia'
import { storeCore } from '@/store'

export default defineComponent({
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Builder',
  computed: {
    ...mapState(storeCore, ['toast']),
  },
  watch: {
    toast: {
      handler() {
        this.$toast.add(this.toast)
      },
    },
  },
})
</script>
