<template>
  <div class="sidepanel-container">
    <div class="layout-menu-container">
      <a
        :class="(getMenuModeStatus ? 'open' : '') + ' menu-switch'"
        @click="toogleMenuStatus"
      ><span class="material-icons-outlined">tune</span></a>
      <SideMenuAutoGen
        :items="menuMeta"
        class="layout-menu"
        :root="true"
        @menuitem-click="onMenuItemClick"
      />
      <ul class="layout-menu">
        <li
          class="layout-menuitem-category"
          role="none"
        >
          <!-- <div class="layout-menuitem-root-text">Account</div> -->
          <ul>
            <li
              class=""
              role="none"
            >
              <a
                href="#"
                class=""
                role="menuitem"
                @click="logout"
              >
                <span class="material-icons-outlined">logout</span>
                <span
                  v-if="getMenuModeStatus"
                  class="caption"
                >Logout</span>
              </a>
              <ul style="display: none;"></ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</template>
<script>
import SideMenuAutoGen from './SideMenuAutoGen'
import { mapActions, mapGetters } from 'vuex'

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
      menuMeta: [],
    }
  },
  computed: {
    ...mapGetters({
      getSideMenu: 'getSideMenu',
      getMenuModeStatus: 'getMenuModeStatus',
    }),
  },
  watch: {
    getSideMenu: {
      handler(getData) {
        if (getData) {
          this.menuMeta = getData
        }
      },
    },
  },
  mounted() {
    this.rebuildMenu()
  },
  methods: {
    ...mapActions({
      sLogout: 'coreLogout',
      rebuildMenu: 'coreUpdateMenu',
      toogleMenuStatus: 'toggleMenu',
    }),
    logout() {
      this.sLogout().then(() => {
        this.$router.push('/login')
      })
    },
    onMenuItemClick(event) {
      this.$emit('menuitem-click', event)
    },
  },
}
</script>
