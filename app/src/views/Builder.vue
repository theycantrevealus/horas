<template>
  <div class="main-container">
    <div class="topbar">
      <TopPanelBar />
    </div>
    <div class="sidepanel">
      <div class="wrapper logo-container">
        <img
          class="panelLogo"
          :src="require('../assets/logo-white.png')"
          alt="horas"
        />
      </div>
      <div class="wrapper sidepanel-menu">
        <SidePanelBar />
      </div>
      <!-- <perfect-scrollbar>
        
      </perfect-scrollbar> -->
    </div>
    <div class="loadpanel">
      <div class="wrapper">
        <div class="breadcrumb-container">
          <BreadCrumb
            :items="breadcrumb"
            :pageName="pageName"
          />
        </div>
        <div
          id="content-loader"
          class="content-loader"
        >
          <router-view v-slot="{ Component }">
            <transition
              name="scale"
              mode="out-in"
            >
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </div>
      <!-- <perfect-scrollbar ref="scrollLoader">
      </perfect-scrollbar> -->
    </div>
  </div>
</template>
<script>
import '@/assets/sakai/layout.scss'
import TopPanelBar from '@/components/TopPanelBar'
import SidePanelBar from '@/components/SidePanelBar'
import BreadCrumb from '@/components/BreadCrumb'

export default {
  name: 'Builder',
  components: {
    TopPanelBar,
    SidePanelBar,
    BreadCrumb,
  },
  data() {
    return {
      layoutMode: 'static',
      layoutColorMode: 'light',
      staticMenuInactive: false,
      overlayMenuActive: false,
      mobileMenuActive: false,
      menu: [],
      breadcrumb: [],
      pageName: '',
    }
  },
  computed: {
    containerClass() {
      return [
        'layout-wrapper',
        {
          'layout-overlay': this.layoutMode === 'overlay',
          'layout-static': this.layoutMode === 'static',
          'layout-static-sidebar-inactive':
            this.staticMenuInactive && this.layoutMode === 'static',
          'layout-overlay-sidebar-active':
            this.overlayMenuActive && this.layoutMode === 'overlay',
          'layout-mobile-sidebar-active': this.mobileMenuActive,
          'input-filled': this.$primevue.config.inputStyle === 'filled',
          'ripple-disabled': this.$primevue.config.ripple === false,
          'layout-theme-light': this.$appState.theme.startsWith('saga'),
        },
      ]
    },
    logo() {
      return this.layoutColorMode === 'dark'
        ? 'images/logo-white.svg'
        : 'images/logo.svg'
    },
  },
  watch: {
    $route() {
      this.breadcrumb = this.$route.meta.breadcrumb
      this.pageName = this.$route.meta.pageTitle
      this.$refs.scrollLoader.$el.scrollTop = 0
    },
  },
  mounted() {
    this.updatePageInfo()
  },
  beforeUpdate() {
    if (this.mobileMenuActive) {
      this.addClass(document.body, 'body-overflow-hidden')
    } else {
      this.removeClass(document.body, 'body-overflow-hidden')
    }
  },
  methods: {
    updatePageInfo() {
      this.breadcrumb = this.$route.meta.breadcrumb
      this.pageName = this.$route.name
    },
    onWrapperClick() {
      if (!this.menuClick) {
        this.overlayMenuActive = false
        this.mobileMenuActive = false
      }

      this.menuClick = false
    },
    onMenuToggle() {
      this.menuClick = true

      if (this.isDesktop()) {
        if (this.layoutMode === 'overlay') {
          if (this.mobileMenuActive === true) {
            this.overlayMenuActive = true
          }

          this.overlayMenuActive = !this.overlayMenuActive
          this.mobileMenuActive = false
        } else if (this.layoutMode === 'static') {
          this.staticMenuInactive = !this.staticMenuInactive
        }
      } else {
        this.mobileMenuActive = !this.mobileMenuActive
      }

      event.preventDefault()
    },
    onSidebarClick() {
      this.menuClick = true
    },
    onMenuItemClick(event) {
      if (event.item && !event.item.items) {
        this.overlayMenuActive = false
        this.mobileMenuActive = false
      }
    },
    onLayoutChange(layoutMode) {
      this.layoutMode = layoutMode
    },
    onLayoutColorChange(layoutColorMode) {
      this.layoutColorMode = layoutColorMode
    },
    addClass(element, className) {
      if (element.classList) {
        element.classList.add(className)
      } else {
        element.className += ' ' + className
      }
    },
    removeClass(element, className) {
      if (element.classList) {
        element.classList.remove(className)
      } else {
        element.className = element.className.replace(
          new RegExp(
            '(^|\\b)' + className.split(' ').join('|') + '(\\b|$)',
            'gi'
          ),
          ' '
        )
      }
    },
    isDesktop() {
      return window.innerWidth >= 992
    },
    isSidebarVisible() {
      if (this.isDesktop()) {
        if (this.layoutMode === 'static') {
          return !this.staticMenuInactive
        } else if (this.layoutMode === 'overlay') {
          return this.overlayMenuActive
        }
      }

      return true
    },
  },
}
</script>
