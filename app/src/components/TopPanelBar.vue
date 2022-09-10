<template>
  <div class="head_wrapper">
    <Menubar :model="items">
      <template #start>
        <Chip :label="first_name + ' ' + last_name" :image="profile_photo" />
      </template>
      <template #end>
        <Button @click="logout" icon="pi pi-power-off" class="button-link button-sm" />
      </template>
    </Menubar>
  </div>
</template>
<script>
import Menubar from 'primevue/menubar'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import { mapActions } from 'vuex'
export default {
  name: 'TopPanelMenu',
  components: {
    Menubar, Button, Chip
  },
  computed: {
    profile_photo () {
      return `${process.env.VUE_APP_APIGATEWAY}avatar/${this.$store.state.credential.uid}.png?d=${Date.now()}`
    },
    first_name () {
      return this.$store.state.credential.first_name
    },
    last_name () {
      return this.$store.state.credential.last_name
    }
  },
  methods: {
    ...mapActions({
      sLogout: 'LOGOUT'
    }),
    logout () {
      this.sLogout().then(() => {
        this.$router.push('/login')
      })
    }
  },
  data () {
    return {
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
                  icon: 'pi pi-fw pi-bookmark'
                },
                {
                  label: 'Video',
                  icon: 'pi pi-fw pi-video'
                }

              ]
            },
            {
              label: 'Delete',
              icon: 'pi pi-fw pi-trash'
            },
            {
              separator: true
            },
            {
              label: 'Export',
              icon: 'pi pi-fw pi-external-link'
            }
          ]
        }
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
                  icon: 'pi pi-fw pi-bookmark'
                },
                {
                  label: 'Video',
                  icon: 'pi pi-fw pi-video'
                }

              ]
            },
            {
              label: 'Home',
              icon: 'pi pi-fw pi-trash',
              to: '/dashboard'
            },
            {
              separator: true
            },
            {
              label: 'About',
              icon: 'pi pi-fw pi-external-link',
              to: '/about'
            }
          ]
        },
        {
          label: 'Edit',
          icon: 'pi pi-fw pi-pencil',
          items: [
            {
              label: 'Left',
              icon: 'pi pi-fw pi-align-left'
            },
            {
              label: 'Right',
              icon: 'pi pi-fw pi-align-right'
            },
            {
              label: 'Center',
              icon: 'pi pi-fw pi-align-center'
            },
            {
              label: 'Justify',
              icon: 'pi pi-fw pi-align-justify'
            }

          ]
        },
        {
          label: 'Users',
          icon: 'pi pi-fw pi-user',
          items: [
            {
              label: 'New',
              icon: 'pi pi-fw pi-user-plus'

            },
            {
              label: 'Delete',
              icon: 'pi pi-fw pi-user-minus'

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
                      icon: 'pi pi-fw pi-print'
                    }
                  ]
                },
                {
                  icon: 'pi pi-fw pi-bars',
                  label: 'List'
                }
              ]
            }
          ]
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
                  icon: 'pi pi-fw pi-calendar-plus'
                },
                {
                  label: 'Delete',
                  icon: 'pi pi-fw pi-calendar-minus'
                }

              ]
            },
            {
              label: 'Archieve',
              icon: 'pi pi-fw pi-calendar-times',
              items: [
                {
                  label: 'Remove',
                  icon: 'pi pi-fw pi-calendar-minus'
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
</script>
