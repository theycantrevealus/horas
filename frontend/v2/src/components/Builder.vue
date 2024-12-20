<template>
  <div></div>
</template>
<script lang="ts">
import TopPanelBar from '@/components/TopPanelBar.vue'

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
    ...mapState([
      'menuMode',
      'themeModeDark',
    ]),
    ...mapState({
      application: 'storeApplication/configuration'
    }),
    ...mapGetters({
      application: 'storeApplication/Getter___applicationConfig',
      getMenuModeStatus: 'storeApplication/Getter___sidePanelMode',
      getThemeMode: 'storeApplication/Getter___getThemeMode',
      geti18n: 'storei18n/Getter___getLanguageLib',
      refreshConfig: 'storeApplication/Getter___applicationConfig',
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
          for(const a in getData) {
            this.$i18n.setLocaleMessage(
              a,
              getData[a]
            )
          }
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
          this.logo.dark.image = getData['APPLICATION_LOGO'] ?? ''
          this.logo.dark.icon = getData['APPLICATION_ICON'] ?? ''

          this.logo.light.image = getData['APPLICATION_LOGO'] ?? ''
          this.logo.light.icon = getData['APPLICATION_ICON'] ?? ''
        }
      },
    },
  },
  mounted() {
    this.darkMode = this.themeModeDark
    if(this.application && this.application['APPLICATION_LOGO']) {
      this.logo.dark.image = this.application['APPLICATION_LOGO'].setter ?? this.logo.dark.image
      this.logo.dark.icon = this.application['APPLICATION_ICON'].setter ?? this.logo.dark.icon
      this.logo.light.image = this.application['APPLICATION_LOGO'].setter ?? this.logo.light.image
      this.logo.light.icon = this.application['APPLICATION_ICON'].setter ?? this.logo.light.icon
    }


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
      toogleMenuModeOn: 'storeApplication/Action___toggleMenuOn',
      toogleMenuModeOff: 'storeApplication/Action___toggleMenuOff',
      loadLanguage: 'storei18n/Action___setLanguange',
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
  }
}
</script>
