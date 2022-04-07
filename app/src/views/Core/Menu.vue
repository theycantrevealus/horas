<template>
  <div class="p-grid">
    <div class="p-col-12">
      <Card>
        <template #title>Menu Management</template>
        <template #content>
          <TreeTable
            class="p-treetable-sm"
            filterMode="strict"
            :value="nodes"
            :paginator="true"
            :rows="20"
            :filters="filtersNode"
          >
            <Column field="label" header="Label" :expander="true">
              <template #filter>
                <InputText
                  type="text"
                  v-model="filtersNode['label']"
                  class="p-column-filter"
                  placeholder="Filter by label"
                />
              </template>
            </Column>
            <Column field="to" header="Link">
              <template #filter>
                <InputText
                  type="text"
                  v-model="filtersNode['to']"
                  class="p-column-filter"
                  placeholder="Filter by link"
                />
              </template>
            </Column>
            <Column field="show_on_menu" header="Visibility">
              <template #filter>
                <InputText
                  type="text"
                  v-model="filtersNode['show_on_menu']"
                  class="p-column-filter"
                  placeholder="Filter by visibility"
                />
              </template>
            </Column>
            <Column :headerStyle="{ 'width': 'auto' }" :bodyStyle="{ 'text-align': 'center' }">
              <template #header>Action</template>
              <template #body="slotProps: any">
                <span class="p-buttonset">
                  <Button
                    @click="onNodeAdd(slotProps.node, 'Add Child Menu')"
                    type="button"
                    class="p-button-success p-button-raised p-button-sm"
                  >
                    <span class="material-icons">add</span>
                  </Button>
                  <Button
                    @click="onNodeEdit(slotProps.node, 'Edit Child Menu')"
                    type="button"
                    class="p-button-info p-button-raised p-button-sm"
                  >
                    <span class="material-icons">edit</span>
                  </Button>
                  <Button
                    @click="onNodeDelete($event, slotProps.node.data.id)"
                    type="button"
                    class="p-button-danger p-button-raised p-button-sm"
                  >
                    <span class="material-icons">delete</span>
                  </Button>
                  <Button type="button" class="p-button-success p-button-raised p-button-sm">
                    <span class="material-icons">arrow_upward</span>
                  </Button>
                  <Button type="button" class="p-button-success p-button-raised p-button-sm">
                    <span class="material-icons">arrow_downward</span>
                  </Button>
                </span>
              </template>
            </Column>
          </TreeTable>
        </template>
      </Card>
      <Dialog
        :header="ui.modal.manageMenu.title"
        v-model:visible="ui.modal.manageMenu.state"
        :style="{ width: '80vw' }"
        :modal="true"
        :position="ui.modal.manageMenu.position"
      >
        <div class="p-fluid p-formgrid p-grid">
          <div class="p-field p-col-12 p-md-4">
            <label for="managelabel">Label</label>
            <InputText id="managelabel" type="text" v-model="form.txt_label" />
          </div>
          <div class="p-field p-col-12 p-md-8">
            <label for="manageroute">Route Name</label>
            <InputText id="manageroute" type="text" v-model="form.txt_route" />
          </div>
          <div class="p-field p-col-12 p-md-8">
            <label for="manageroute">Route URL</label>
            <InputText id="managerouteurl" type="text" v-model="form.txt_route_url" />
          </div>
          <div class="p-field p-col-12 p-md-10">
            <label for="manageicon">Icon</label>
            <div class="p-inputgroup">
              <InputText id="manageicon" type="text" v-model="form.txt_icon" />
              <span class="p-inputgroup-addon">
                <span class="material-icons-outlined">{{ form.txt_icon }}</span>
              </span>
            </div>
          </div>
          <div class="p-field p-col-12 p-md-2">
            <label for="managecheck">Show on Menu</label>
            <ToggleButton
              v-model="form.showMenu"
              onLabel="Show it!"
              offLabel="No, thanks"
              onIcon="pi pi-check"
              offIcon="pi pi-times"
            />
          </div>
        </div>
        <div class="p-grid">
          <div class="p-col-12">
            <DataTable :value="setterPermission" data-key="id" responsiveLayout="scroll">
              <template #header>
                <div class="table-header-container">
                  <Button class="p-button-info p-button-sm" @click="addFeatureForm">
                    <span class="material-icons">add</span> Add Feature
                  </Button>
                </div>
              </template>
              <Column field="domiden" header="DOM" sortable>
                <template #body="slotProps">{{ slotProps.data.domiden }}</template>
              </Column>
              <Column field="dispatchname" header="Dispatch" sortable>
                <template #body="slotProps">{{ slotProps.data.dispatchname }}</template>
              </Column>
            </DataTable>
          </div>
        </div>
        <template #footer>
          <Button @click="toggleModal" class="p-button-text p-button-sm">
            <span class="material-icons">highlight_off</span> Cancel
          </Button>
          <Button class="p-button-sm" @click="processForm" autofocus>
            <span class="material-icons">task_alt</span> Submit
          </Button>
        </template>
      </Dialog>
      <Dialog
        :modal="true"
        :header="ui.modal.manageFeature.title"
        v-model:visible="ui.modal.manageFeature.state"
        :position="ui.modal.manageFeature.position"
        :style="{ width: '50vw' }"
      >
        <div class="p-fluid p-formgrid p-grid">
          <div class="p-field p-col-12 p-md-12">
            <label for="manageFeatureDOM">
              DOM Identity
              <code>(class)</code>
            </label>
            <InputText id="manageFeatureDOM" type="text" v-model="form.feature.dom" />
          </div>
          <div class="p-field p-col-12 p-md-12">
            <label for="manageFeatureDispatch">Dispatch Command</label>
            <InputText id="manageFeatureDispatch" type="text" v-model="form.feature.dispatch" />
          </div>
        </div>
        <template #footer>
          <Button @click="toggleFeature" class="p-button-text p-button-sm">
            <span class="material-icons">highlight_off</span> Cancel
          </Button>
          <Button class="p-button-sm" @click="processFeature" autofocus>
            <span class="material-icons">task_alt</span> Add Feature
          </Button>
        </template>
      </Dialog>
      <Toast />
      <ConfirmPopup></ConfirmPopup>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Card from 'primevue/card'
import TreeTable from 'primevue/treetable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'
import InputText from 'primevue/inputtext'
import ToggleButton from 'primevue/togglebutton'
import DataTable from 'primevue/datatable'
import ConfirmPopup from 'primevue/confirmpopup'

import { mapActions, mapGetters } from 'vuex'
import CoreService from '@/service/core/menu'

export default defineComponent({
  name: 'Module',
  components: {
    Card, TreeTable, Column, Button, InputText, Dialog, ToggleButton, Toast, DataTable, ConfirmPopup
  },
  data () {
    return {
      formMode: 'add',
      setterPermission: Array<{
        domiden: string,
        dispatchname: string
      }>(),
      form: {
        targetGroup: 0,
        targetParent: 0,
        targetID: 0,
        txt_label: '',
        txt_route: '',
        txt_route_url: '',
        txt_icon: '',
        showMenu: false,
        showFeature: false,
        feature: {
          dom: '',
          dispatch: ''
        }
      },
      ui: {
        modal: {
          manageMenu: {
            state: false,
            position: 'top',
            title: ''
          },
          manageFeature: {
            state: false,
            position: 'top',
            title: ''
          }
        }
      },
      selectedNode: {},
      filtersNode: {},
      expandedKeys: {},
      nodes: null,
      columns: [
        { field: 'label', header: 'Label', expander: true },
        { field: 'to', header: 'To' },
        { field: 'icon', header: 'Icon' }
      ]
    }
  },
  mounted () {
    this.reloadMenu()
  },
  computed: {
    ...mapGetters({
      data: 'mCoreMenu/getData'
    })
  },
  methods: {
    ...mapActions({
      getMenu: 'mCoreMenu/get_all_menu',
      rebuildMenu: 'UPDATE_MENU'
    }),
    clearForm () {
      this.form = {
        targetGroup: 0,
        targetParent: 0,
        targetID: 0,
        txt_label: '',
        txt_route: '',
        txt_route_url: '',
        txt_icon: '',
        showMenu: false,
        showFeature: false,
        feature: {
          dom: '',
          dispatch: ''
        }
      }
    },
    reloadMenu () {
      this.getMenu().then((data: any) => {
        this.nodes = data.data.root
      })
    },
    toggleModal () {
      this.ui.modal.manageMenu.state = !this.ui.modal.manageMenu.state
    },
    toggleFeature () {
      this.ui.modal.manageFeature.state = !this.ui.modal.manageFeature.state
    },
    onNodeDelete (event, target: Number) {
      this.$confirm.require({
        target: event.currentTarget,
        message: 'Are you sure to delete this menu?',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        acceptLabel: 'Yes. Delete it!',
        rejectLabel: 'Cancel',
        accept: () => {
          return CoreService.menuDelete(target).then((response: any) => {
            response = response.data
            if (response.status === 200) {
              this.$toast.add({ severity: 'success', summary: 'Menu Manager', detail: response.message, life: 3000 })
              this.reloadMenu()
              this.rebuildMenu()
            }
          })
        },
        reject: () => {
          // callback to execute when user rejects the action
        }
      })
    },
    onNodeEdit (target: any, mode: string) {
      const data = target.data
      console.log(data)
      this.form.targetID = data.id
      this.form.txt_label = data.label
      this.form.txt_route = data.identifier
      this.form.txt_route_url = data.to
      this.form.txt_icon = data.icon
      this.form.showMenu = (target.show_on_menu === 'Y')
      this.formMode = 'edit'
      this.ui.modal.manageMenu.title = `${mode}  ${data.label}`

      const checkLevel = target.key.split('-')
      this.form.targetGroup = checkLevel[0]
      // if (checkLevel.length > 1) {
      //   this.form.targetParent = data.id
      // } else {
      //   this.form.targetParent = checkLevel[0]
      // }
      this.form.targetParent = data.parent

      CoreService.menuDetail(data.id).then(response => {
        const dataSelected = response.data
        if (dataSelected.permission !== null) {
          this.setterPermission = dataSelected.permission
        }
      })
      this.toggleModal()
    },
    onNodeAdd (target: any, mode: string) {
      const data = target.data
      this.clearForm()
      this.formMode = 'add'

      const checkLevel = target.key.split('-')
      this.form.targetGroup = checkLevel[0]
      if (checkLevel.length > 1) {
        this.form.targetParent = data.id
      } else {
        this.form.targetParent = checkLevel[0]
      }

      this.ui.modal.manageMenu.title = `${mode}  ${data.label}`
      this.toggleModal()
    },
    addFeatureForm () {
      this.ui.modal.manageFeature.title = 'Feature'
      this.toggleFeature()
    },
    editMenu () {
      const label = this.form.txt_label
      const routeTo = this.form.txt_route
      const routeToUrl = this.form.txt_route_url
      const icon = this.form.txt_icon
      const showMenu = (this.form.showMenu) ? 'Y' : 'N'

      return CoreService.menuEdit(this.form.targetID, {
        name: label,
        menu_group: this.form.targetGroup,
        identifier: routeTo,
        url: routeToUrl,
        remark: '',
        parent: this.form.targetParent,
        icon: icon,
        show_order: 1,
        level: 2,
        group_color: '',
        show_on_menu: showMenu
      }).then((response: any) => {
        response = response.data
        if (response.status === 200) {
          this.reloadMenu()
          this.rebuildMenu()
          this.clearForm()
          this.ui.modal.manageMenu.state = false
          this.$toast.add({ severity: 'success', summary: 'Menu Manager', detail: response.message, life: 3000 })
        }
      })
    },
    processForm () {
      if (this.formMode === 'add') {
        this.addMenu()
      } else {
        this.editMenu()
      }
    },
    autoFeature (featureData) {
      this.setterPermission.push(featureData)
    },
    processFeature () {
      this.autoFeature({
        domiden: this.form.feature.dom,
        dispatchname: this.form.feature.dispatch
      })

      this.form.feature = {
        dom: '',
        dispatch: ''
      }

      this.toggleFeature()
    },
    addMenu () {
      const label = this.form.txt_label
      const routeTo = this.form.txt_route
      const routeToUrl = this.form.txt_route_url
      const icon = this.form.txt_icon
      const showMenu = (this.form.showMenu) ? 'Y' : 'N'

      return CoreService.menuAdd({
        name: label,
        menu_group: this.form.targetGroup,
        identifier: routeTo,
        url: routeToUrl,
        remark: '',
        parent: this.form.targetParent,
        icon: icon,
        show_order: 1,
        show_on_menu: showMenu
      }).then(async (response: any) => {
        response = response.data
        if (response.status === 200) {
          // Add Menu Permission
          const mimicSetterPermission = this.setterPermission
          let succeedPermission = 0
          for (const a in mimicSetterPermission) {
            const permissionAdd = await CoreService.menuPermissionAdd({
              menu: response.returning.id,
              servicegroup: '',
              dispatchname: mimicSetterPermission[a].dispatchname,
              domiden: mimicSetterPermission[a].domiden
            }).then(async (response: any) => {
              return response
            })

            succeedPermission += (permissionAdd.data.status === 200) ? 1 : 0
          }

          if (succeedPermission === this.setterPermission.length) {
            this.reloadMenu()
            this.rebuildMenu()
            this.clearForm()
            this.ui.modal.manageMenu.state = false
            this.$toast.add({ severity: 'success', summary: 'Menu Manager', detail: response.message, life: 3000 })
          }
        }
      })
    }
  }
})
</script>
