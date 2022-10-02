<template>
  <div class="head_wrapper">
    <Menubar :model="items">
      <template #start>
        <Chip
          :label="first_name + ' ' + last_name"
          :image="profile_photo"
        />
      </template>
      <template #end>
        {{ $t('message.hello') }}
        <Dropdown
          v-model="selectedLanguage"
          class="country-selector"
          :options="countries"
          optionLabel="name"
          :filter="true"
          placeholder="Select a Country"
          @change="changeLanguage()"
        >
          <template #value="slotProps">
            <div
              v-if="slotProps.value"
              class="country-item country-item-value"
            >
              <img
                :src="require('@/assets/flag_placeholder.png')"
                :class="'flag flag-' + slotProps.value.code.toLowerCase()"
                width="18"
              />
              <div>{{slotProps.value.name}}</div>
            </div>
            <span v-else>
              {{slotProps.placeholder}}
            </span>
          </template>
          <template #option="slotProps">
            <div class="country-item">
              <img
                :src="require('@/assets/flag_placeholder.png')"
                :class="'flag flag-' + slotProps.option.code.toLowerCase()"
              />
              <div>{{slotProps.option.name}}</div>
            </div>
          </template>
        </Dropdown>
      </template>
    </Menubar>
  </div>
</template>
<script>
import Menubar from 'primevue/menubar'
import Dropdown from 'primevue/dropdown'
import Chip from 'primevue/chip'
import { mapActions, mapGetters, mapState } from 'vuex'
export default {
  name: 'TopPanelMenu',
  components: {
    Menubar,
    Chip,
    Dropdown,
  },

  data() {
    return {
      selectedLanguage: null,
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
    getBrowserLanguage() {
      return this.$store.state.language
    },
    profile_photo() {
      return this.$store.state.credential.profile_photo
    },
    first_name() {
      return this.$store.state.credential.first_name
    },
    last_name() {
      return this.$store.state.credential.last_name
    },
  },
  created() {},
  async mounted() {
    await this.initLanguage().then(() => {
      this.selectedLanguage = this.$store.state.language
    })
  },
  methods: {
    ...mapActions({
      initLanguage: 'setLanguange',
      storeLanguage: 'changeLanguage',
    }),
    changeLanguage() {
      this.storeLanguage(this.selectedLanguage).then(() => {
        this.$i18n.locale = this.selectedLanguage.lang
      })
    },
  },
}
</script>
