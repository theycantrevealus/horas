<template>
  <div :class="(darkMode ? 'dark' : '') + ' main-container'">
    <div :class="(getMenuModeStatus ? 'open' : '') + ' topbar'">
      <TopPanelBar />
    </div>
    <div
      :class="(getMenuModeStatus ? 'open' : '') + ' sidepanel'"
      @mouseover="toogleMenuModeOn"
      @mouseleave="toogleMenuModeOff"
    >
      <div class="wrapper logo-container">
        <img
          v-if="getMenuModeStatus"
          class="panel-logo"
          :style="{ width: logo[layoutColorMode].image.size.sidepanel.width }"
          :src="logo[layoutColorMode].image.image ?? ''"
          alt="horas"
        />
        <img
          v-if="!getMenuModeStatus"
          class="panel-logo2"
          :style="{ width: logo[layoutColorMode].icon.size.sidepanel.width }"
          :src="logo[layoutColorMode].icon.image"
          alt="horas"
        />
      </div>
      <div class="wrapper sidepanel-menu">
        <SidePanelBar />
      </div>
      <!-- <perfect-scrollbar>

      </perfect-scrollbar> -->
    </div>
    <div :class="(getMenuModeStatus ? 'open' : '') + ' loadpanel'">
      <div class="wrapper">
        <div class="breadcrumb-container">
          <BreadCrumb :items="breadcrumb" :pageName="pageName" />
        </div>
        <div id="content-loader" class="content-loader">
          <router-view v-slot="{ Component }">
            <transition name="scale" mode="out-in">
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
<script lang="ts">
import TopPanelBar from '@/components/TopPanelBar.vue'
import SidePanelBar from '@/components/SidePanelBar.vue'
import BreadCrumb from '@/components/BreadCrumb.vue'
import { mapStores } from 'pinia'
import { storeCore } from '@/store'

export default {
  name: 'Builder',
  components: {
    TopPanelBar,
    SidePanelBar,
    BreadCrumb,
  },
  data() {
    return {
      getMenuModeStatus: true,
      layoutMode: 'static',
      layoutColorMode: 'light',
      staticMenuInactive: false,
      overlayMenuActive: false,
      mobileMenuActive: false,
      menu: [],
      breadcrumb: [],
      pageName: '',
      darkMode: false,
      logo: {
        light: {
          image: {
            size: {
              sidepanel: {
                width: '',
                height: ''
              }
            }
          },
          icon: {
            size: {
              sidepanel: {
                width: '',
                height: ''
              }
            }
          },
        },
        dark: {
          image: {
            size: {
              sidepanel: {
                width: '',
                height: ''
              }
            }
          },
          icon: {
            size: {
              sidepanel: {
                width: '',
                height: ''
              }
            }
          }
        }
      }
    }
  },
  computed: {
    ...mapStores(storeCore),
  },
  created() {
    this.coreStore.$subscribe((mutation, state) => {
      this.getMenuModeStatus = state.setting.sidePanel
      const darkMode = state.setting.dark
      const languageLib = state.setting.languageLib
      if (languageLib) {
        for(const a in languageLib) {
            this.$i18n.setLocaleMessage(
            a,
            languageLib[a]
          )
        }
      }

      if (darkMode) {
        this.layoutColorMode = 'dark'
        document.querySelector('body').classList.add('dark')
      } else {
        this.layoutColorMode = 'light'
        document.querySelector('body').classList.remove('dark')
      }

      this.darkMode = darkMode

    })
  },
  mounted() {
    // if(this.application && this.application['APPLICATION_LOGO']) {
    //   this.logo.dark.image = this.application['APPLICATION_LOGO'].setter ?? this.logo.dark.image
    //   this.logo.dark.icon = this.application['APPLICATION_ICON'].setter ?? this.logo.dark.icon
    //   this.logo.light.image = this.application['APPLICATION_LOGO'].setter ?? this.logo.light.image
    //   this.logo.light.icon = this.application['APPLICATION_ICON'].setter ?? this.logo.light.icon
    // }

    if (this.darkMode) {
      document.querySelector('body').classList.add('dark')
    } else {
      document.querySelector('body').classList.remove('dark')
    }

    this.loadLanguage()

    this.updatePageInfo()
  },
  methods: {
    updatePageInfo() {
      this.breadcrumb = this.$route.meta.breadcrumb
      this.pageName = this.$route.name
    },
    toogleMenuModeOn() {
      this.coreStore.toggleSideMenuOn()
    },
    toogleMenuModeOff() {
      this.coreStore.toggleSideMenuOff()
    },
    loadLanguage() {
      this.coreStore.setBrowserLanguage(true)
    },
    onMenuItemClick(event) {
      if (event.item && !event.item.items) {
        this.overlayMenuActive = false
        this.mobileMenuActive = false
      }
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
  }
}
</script>
