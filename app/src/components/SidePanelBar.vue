<template>
  <div class="sidepanel-container">
    <div class="layout-menu-container">
      <SideMenuAutoGen
        :items="getSideMenu"
        class="layout-menu"
        :root="true"
        @menuitem-click="onMenuItemClick"
      />
      <ul class="layout-menu">
        <li
          class="layout-menuitem-category"
          role="none"
        >
          <div class="layout-menuitem-root-text">Account</div>
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
                <span class="material-icons-outlined">logout</span><span class="caption">Logout</span>
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
      sidemenu3: [
        {
          label: 'Home',
          items: [
            {
              label: 'Dashboard',
              icon: 'home',
              to: '/dashboard',
            },
            {
              label: 'About',
              icon: 'info',
              to: '/about',
            },
          ],
        },
        {
          label: 'Master Data',
          items: [
            { label: 'Form Layout', icon: 'api', to: '/form' },
            { label: 'Message', icon: 'api', to: '/message' },
          ],
        },
        {
          label: 'Setting',
          items: [
            {
              label: 'Module',
              icon: 'view_in_ar',
              to: '/core/menu',
            },
            {
              label: 'Module',
              icon: 'settings',
              items: [
                {
                  label: 'Submenu 1.1',
                  icon: 'api',
                  items: [
                    { label: 'Submenu 1.1.1', icon: 'api' },
                    { label: 'Submenu 1.1.2', icon: 'api' },
                    { label: 'Submenu 1.1.3', icon: 'api' },
                  ],
                },
                {
                  label: 'Submenu 1.2',
                  icon: 'api',
                  items: [
                    { label: 'Submenu 1.2.1', icon: 'pi pi-fw pi-bookmark' },
                    { label: 'Submenu 1.2.2', icon: 'pi pi-fw pi-bookmark' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Get Started',
          items: [
            {
              label: 'Documentation',
              icon: 'help_outline',
            },
            {
              label: 'Source',
              icon: 'code',
            },
          ],
        },
      ],
    }
  },
  computed: {
    ...mapGetters({
      getSideMenu: 'getSideMenu',
    }),
  },
  mounted() {
    this.rebuildMenu()
  },
  methods: {
    ...mapActions({
      sLogout: 'LOGOUT',
      rebuildMenu: 'UPDATE_MENU',
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
