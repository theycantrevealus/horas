<template>
  <router-view v-slot="{ Component }">
    <transition name="scale" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>
<script>
import {mapActions, mapGetters} from "vuex"

export default {
  name: 'Builder',
  computed: {
    ...mapGetters({
      refreshConfig: 'getSystemConfig'
    }),
  },
  watch: {
    refreshConfig: {
      handler(getData) {
        //
      },
    },
  },
  async mounted() {
    await this.sockets.subscribe('configuration_update', async (request) => {
      await this.getAppsConfig()
    })
  },
  methods: {
    ...mapActions(['getAppsConfig']),
  },
}
</script>
