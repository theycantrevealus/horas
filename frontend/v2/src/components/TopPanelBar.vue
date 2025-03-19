<template>
  <div class="head_wrapper">
    <Menubar :model="items">
      <template #start>
        <span
          v-if="getThemeMode"
          class="material-icons-outlined dark-mode-switch"
          @click="toggleDarkMode"
        >
          dark_mode
        </span>
        <span
          v-if="!getThemeMode"
          class="material-icons-outlined dark-mode-switch"
          @click="toggleDarkMode"
        >
          wb_sunny
        </span>
      </template>
      <template #end>
        <div class="p-menubar-root-list">
          <div class="socket-status-container">
            <div v-if="socket.status.connect" class="socket-status-label connected">
              <span class="material-icons">import_export</span> Connected
            </div>
            <div v-if="socket.status.disconnect" class="socket-status-label disconnected">
              <span class="material-icons">mobiledata_off</span> Disconnected
            </div>
            <div v-if="socket.status.reconnecting" class="socket-status-label hold">
              <span class="material-icons">cached</span> Reconnecting
            </div>
          </div>

          <Select
            v-if="selectedLanguage"
            v-model="selectedLanguage"
            :filter="true"
            :options="countries"
            class="country-selector dark"
            optionLabel="name"
            placeholder="Select a Country"
            @change="changeLanguage()"
          >
            <template #value="slotProps">
              <div v-if="slotProps.value" class="country-item country-item-value">
                <div>{{ slotProps.value.name }}</div>
              </div>
              <span v-else>
                {{ slotProps.placeholder }}
              </span>
            </template>
            <template #option="slotProps">
              <div class="country-item">
                <!--img
                  :class="'flag flag-' + slotProps.value.code.toLowerCase() ?? ''"
                  :src="require('@/assets/flag_placeholder.png')"
                  width="18"
                /-->
                <div>{{ slotProps.option.name }}</div>
              </div>
            </template>
          </Select>
        </div>
      </template>
    </Menubar>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import { storeCore } from '@/store'
import type { Language } from '@/interfaces/language'

export default defineComponent({
  name: 'TopPanelMenu',
  data() {
    return {
      getThemeMode: false,
      socket: {
        status: {
          connect: false,
          connect_error: false,
          connect_timeout: false,
          connecting: false,
          disconnect: false,
          reconnect: false,
          reconnect_attempt: false,
          reconnecting: false,
          reconnect_error: false,
          reconnect_failed: false,
          error: false,
          ping: false,
          pong: false,
        },
        message: '',
      },
      darkMode: false,
      selectedLanguage: {
        code: '',
        lang: '',
        name: '',
      } as Language,
      countries: [
        { name: 'United States', code: 'us', lang: 'en' },
        { name: 'Indonesia', code: 'id', lang: 'id' },
      ],
      sidemenu: [
        {
          label: 'File',
          icon: 'pi pi-fw pi-file',
          items: [
            {
              label: 'New',
              icon: 'pi pi-fw pi-plus',
              items: [
                {
                  label: 'Bookmark',
                  icon: 'pi pi-fw pi-bookmark',
                },
                {
                  label: 'Video',
                  icon: 'pi pi-fw pi-video',
                },
              ],
            },
            {
              label: 'Delete',
              icon: 'pi pi-fw pi-trash',
            },
            {
              separator: true,
            },
            {
              label: 'Export',
              icon: 'pi pi-fw pi-external-link',
            },
          ],
        },
      ],
      items: [
        {
          label: 'File',
          icon: 'pi pi-fw pi-file',
          items: [
            {
              label: 'New',
              icon: 'pi pi-fw pi-plus',
              items: [
                {
                  label: 'Bookmark',
                  icon: 'pi pi-fw pi-bookmark',
                },
                {
                  label: 'Video',
                  icon: 'pi pi-fw pi-video',
                },
              ],
            },
            {
              label: 'Home',
              icon: 'pi pi-fw pi-trash',
              to: '/dashboard',
            },
            {
              separator: true,
            },
            {
              label: 'About',
              icon: 'pi pi-fw pi-external-link',
              to: '/about',
            },
          ],
        },
        {
          label: 'Edit',
          icon: 'pi pi-fw pi-pencil',
          items: [
            {
              label: 'Left',
              icon: 'pi pi-fw pi-align-left',
            },
            {
              label: 'Right',
              icon: 'pi pi-fw pi-align-right',
            },
            {
              label: 'Center',
              icon: 'pi pi-fw pi-align-center',
            },
            {
              label: 'Justify',
              icon: 'pi pi-fw pi-align-justify',
            },
          ],
        },
        {
          label: 'Users',
          icon: 'pi pi-fw pi-user',
          items: [
            {
              label: 'New',
              icon: 'pi pi-fw pi-user-plus',
            },
            {
              label: 'Delete',
              icon: 'pi pi-fw pi-user-minus',
            },
            {
              label: 'Search',
              icon: 'pi pi-fw pi-users',
              items: [
                {
                  label: 'Filter',
                  icon: 'pi pi-fw pi-filter',
                  items: [
                    {
                      label: 'Print',
                      icon: 'pi pi-fw pi-print',
                    },
                  ],
                },
                {
                  icon: 'pi pi-fw pi-bars',
                  label: 'List',
                },
              ],
            },
          ],
        },
        {
          label: 'Events',
          icon: 'pi pi-fw pi-calendar',
          items: [
            {
              label: 'Edit',
              icon: 'pi pi-fw pi-pencil',
              items: [
                {
                  label: 'Save',
                  icon: 'pi pi-fw pi-calendar-plus',
                },
                {
                  label: 'Delete',
                  icon: 'pi pi-fw pi-calendar-minus',
                },
              ],
            },
            {
              label: 'Archieve',
              icon: 'pi pi-fw pi-calendar-times',
              items: [
                {
                  label: 'Remove',
                  icon: 'pi pi-fw pi-calendar-minus',
                },
              ],
            },
          ],
        },
      ],
    }
  },
  computed: {
    ...mapStores(storeCore),
  },
  created() {
    this.coreStore.$subscribe((mutation, state) => {
      const darkMode = state.setting.dark
      const language: Language = state.setting.language

      if (darkMode) {
        document.body.classList.add('dark')
      } else {
        document.body.classList.remove('dark')
      }

      this.darkMode = darkMode
      this.selectedLanguage = language
      this.$i18n.locale = language.lang
    })
  },
  async mounted() {
    await this.coreStore.getLanguage()
  },
  methods: {
    toggleDarkMode() {
      this.getThemeMode = !this.getThemeMode
      this.coreStore.toggleDarkMode()
    },
    async changeLanguage() {
      await this.coreStore.changeLanguage(this.selectedLanguage).then(() => {
        this.$i18n.locale = this.selectedLanguage.lang
      })
    },
    getFlagImage() {
      // TODO : Add flag provider from backend
    },
  },
})
</script>
