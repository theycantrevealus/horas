<template>
  <router-view v-slot="{ Component }">
    <transition name="scale" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
  <Toast />
</template>
<script>
import {mapActions, mapGetters, mapState} from "vuex"
import Toast from 'primevue/toast'

export default {
  name: 'Builder',
  components: {
    Toast
  },
  computed: {
    ...mapState('storeApplication', {
      application: state => state
    }),
    ...mapGetters(['storeApplication/Getter___getToast']),
  },
  watch: {
    'storeApplication/Getter___getToast': {
      handler(getData) {
        this.$toast.add(this.application.toast)
      }
    }
  },
  async mounted() {
    // await this.generateLocalization()
  },
  methods: {
    ...mapActions({
      generateLocalization: 'storei18n/Action___getLanguage'
    })
  }
}
</script>
