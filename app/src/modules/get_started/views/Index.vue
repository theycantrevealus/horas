<template>
  <div class="grid">
    <div class="col-12">
      <Card>
        <template #title>Get Started</template>
        <template #content>

        </template>
      </Card>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import Card from 'primevue/card'
import { mapActions, mapGetters } from 'vuex'
import store from '@/store'

export default defineComponent({
  name: 'GetStartedIndex',
  components: { Card },
  setup() {},
  // computed: {
  //   ...mapGetters({
  //     getPrivileges: 'getPrivileges',
  //   }),
  // },
  // watch: {
  //   getPrivileges: {
  //     handler(getData) {
  //       //
  //     },
  //   },
  // },
  async mounted() {
    // await this.rebuildMenu()
    // await this.rebuildAccess()
  },
  // methods: {
  //   ...mapActions({
  //     sLogout: 'coreLogout',
  //     rebuildMenu: 'coreUpdateMenu',
  //     rebuildAccess: 'coreRefreshAccess',
  //   }),
  //   ...mapActions('accountModule', ['updateAccount', 'updatePermission']),
  // },
})
</script>

