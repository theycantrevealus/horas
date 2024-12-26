<template>
  <div class="sidepanel-container">
    <div class="layout-menu-container">
      <SideMenuAutoGen
        :items="menuMeta"
        class="layout-menu"
        :root="true"
        @menuitem-click="onMenuItemClick"
      />
      <ul class="layout-menu">
        <li class="layout-menuitem-category" role="none">
          <!-- <div class="layout-menuitem-root-text">Account</div> -->
          <ul>
            <li class="" role="none">
              <a href="#" class="" role="menuitem" @click="logout">
                <span class="material-icons-outlined material-symbols-outlined">logout</span>
                <span :class="(getMenuModeStatus ? 'open' : '') + ' caption'">Logout</span>
              </a>
              <ul style="display: none"></ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</template>
<script lang="ts">
import SideMenuAutoGen from './SideMenuAutoGen.vue'
import { mapState, mapStores } from 'pinia'
import { storeCore } from '@/store'

export default {
  name: 'SidePanelMenu',
  components: {
    SideMenuAutoGen,
  },
  props: {
    model: {
      type: Array,
      default: [],
    },
  },
  emits: ['menuitem-click'],
  data() {
    return {
      menuMeta: [] as any [],
    }
  },
  computed: {
    ...mapStores(storeCore),
    ...mapState(storeCore, {
      getMenuModeStatus: 'getSidePanel'
    })
  },
  mounted() {
    this.rebuildMenu()
  },
  created() {
    this.coreStore.$subscribe((mutation, state) => {
      this.menuMeta = state.setting.menu ?? []
    })
  },
  methods: {
    logout() {
      this.coreStore.signOut().then(() => {
        // this.$socket.disconnect()
        this.$router.push('/login')
      })
    },
    onMenuItemClick(event: any) {
      this.$emit('menuitem-click', event)
    },
    rebuildMenu() {
      this.coreStore.generateMenu()
    }
  },
}
</script>
