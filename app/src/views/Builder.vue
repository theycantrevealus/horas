<template>
  <div :class="(getThemeMode ? 'dark' : '') + ' main-container'">
    <div :class="(getMenuModeStatus ? 'open' : '') + ' topbar'">
      <TopPanelBar />
    </div>
    <div
      :class="(getMenuModeStatus ? 'open' : '') + ' sidepanel'"
      @mouseover="toogleMenuStatusOn"
      @mouseleave="toogleMenuStatusOff"
    >
      <div class="wrapper logo-container">
        <img
          v-if="getMenuModeStatus"
          class="panel-logo"
          :style="{ width: logo[layoutColorMode].image.size.sidepanel.width }"
          :src="logo[layoutColorMode].image.image"
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
import { mapState, mapGetters, mapActions } from 'vuex'

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
          image: '',
          icon: '',
        }
      }
    }
  },
  computed: {
    ...mapState(['menuMode', 'themeModeDark', 'application']),
    ...mapGetters({
      getMenuModeStatus: 'getMenuModeStatus',
      getThemeMode: 'getThemeMode',
      geti18n: 'mCorei18n/getData',
      refreshConfig: 'getSystemConfig',
    }),
  },
  watch: {
    getMenuModeStatus: {
      handler(getData) {
        //
      },
    },
    geti18n: {
      handler(getData) {
        if (getData) {
          getData.map((e) => {
            const messageCompound = {}

            const componentMessage = e.components
            componentMessage.map((f) => {
              if (!messageCompound[f.component]) {
                messageCompound[f.component] = ''
              }
              messageCompound[f.component] = f.translation
            })

            this.$i18n.setLocaleMessage(
              e.language_code.toLowerCase(),
              messageCompound
            )
          })
        }
      },
    },
    getThemeMode: {
      handler() {
        if (this.themeModeDark) {
          this.layoutColorMode = 'dark'
          document.querySelector('body').classList.add('dark')
        } else {
          this.layoutColorMode = 'light'
          document.querySelector('body').classList.remove('dark')
        }
      },
    },
    refreshConfig: {
      handler(getData) {
        if(getData) {
          this.logo.dark.image = getData['APPLICATION_LOGO']
          this.logo.dark.icon = getData['APPLICATION_ICON']

          this.logo.light.image = getData['APPLICATION_LOGO']
          this.logo.light.icon = getData['APPLICATION_ICON']
        }
      },
    },
  },
  mounted() {
    this.darkMode = this.themeModeDark
    this.logo.dark.image = this.application['APPLICATION_LOGO']
    this.logo.dark.icon = this.application['APPLICATION_ICON']
    this.logo.light.image = this.application['APPLICATION_LOGO']
    this.logo.light.icon = this.application['APPLICATION_ICON']

    this.updatePageInfo()
    if (this.darkMode) {
      document.querySelector('body').classList.add('dark')
    } else {
      document.querySelector('body').classList.remove('dark')
    }
    this.loadLanguage()
  },
  methods: {
    ...mapActions({
      toogleMenuStatusOn: 'toggleMenuOn',
      toogleMenuStatusOff: 'toggleMenuOff',
      loadLanguage: 'mCorei18n/get_all_i18n',
    }),
    updatePageInfo() {
      this.breadcrumb = this.$route.meta.breadcrumb
      this.pageName = this.$route.name
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
  },
}
</script>
