<!-- eslint-disable vue/multi-word-component-names -->
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
          :style="{ width: parseFloat(logo[`${layoutColorMode}`].image.size.sidepanel.width) }"
          :src="logo[layoutColorMode].image.target ?? ''"
          alt="horas"
        />
        <img
          v-if="!getMenuModeStatus"
          class="panel-logo2"
          :style="{ width: logo[layoutColorMode].icon.size.sidepanel.width }"
          :src="logo[layoutColorMode].icon.target ?? ''"
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
          <RouterView v-slot="{ Component }">
            <transition name="scale" mode="out-in">
              <component :is="Component" />
            </transition>
          </RouterView>
        </div>
      </div>
      <!-- <perfect-scrollbar ref="scrollLoader">
      </perfect-scrollbar> -->
    </div>
  </div>
  <ConfirmDialog></ConfirmDialog>
</template>
<script lang="ts">
import { storeCore } from '@/store'
import { mapActions, mapState, mapStores } from 'pinia'
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      layoutMode: 'static',
      layoutColorMode: 'light' as 'light' | 'dark',
      staticMenuInactive: false,
      overlayMenuActive: false,
      mobileMenuActive: false,
      menu: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      breadcrumb: [] as any[],
      pageName: '',
      darkMode: false,
      logo: {
        light: {
          image: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
          icon: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
        },
        dark: {
          image: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
          icon: {
            target: '',
            size: {
              sidepanel: {
                width: '',
                height: '',
              },
            },
          },
        },
      },
    }
  },
  watch: {
    authToken(token) {
      if (!token && token == '') {
        this.$router.push({ name: 'Login' })
      }
    },
  },
  computed: {
    ...mapStores(storeCore),
    ...mapState(storeCore, {
      getMenuModeStatus: 'getSidePanel',
    }),
    authToken() {
      return this.coreStore.auth.token
    },
  },
  created() {
    this.coreStore.$subscribe((_mutation, state) => {
      const darkMode = state.setting.dark

      if (darkMode) {
        this.layoutColorMode = 'dark'
        document.body.classList.add('dark')
      } else {
        this.layoutColorMode = 'light'
        document.body.classList.remove('dark')
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
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }

    // TODO : How to set it on storeCore ???
    // this.$router.beforeRouteLeave(async () => {

    // })

    this.loadLanguage()

    this.updatePageInfo()
  },
  methods: {
    ...mapActions(storeCore, ['UIToggleEditingData']),
    updatePageInfo() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.breadcrumb = (this.$route.meta.breadcrumb as any[]) ?? []
      this.pageName = (this.$route.name as string) ?? ''
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
    // onMenuItemClick(event) {
    //   if (event.item && !event.item.items) {
    //     this.overlayMenuActive = false
    //     this.mobileMenuActive = false
    //   }
    // },
    // addClass(element: any, className: any) {
    //   if (element.classList) {
    //     element.classList.add(className)
    //   } else {
    //     element.className += ' ' + className
    //   }
    // },
    // removeClass(element: any, className: any) {
    //   if (element.classList) {
    //     element.classList.remove(className)
    //   } else {
    //     element.className = element.className.replace(
    //       new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'),
    //       ' ',
    //     )
    //   }
    // },
  },
})
</script>
