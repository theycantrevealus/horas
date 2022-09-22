<template>
  <div class="grid">
    <div class="col-12">
      <Card>
        <template #title>Menu Management</template>
        <template #content>
          <TreeTable
            class="treetable-sm"
            filter-mode="strict"
            :value="nodes"
            :paginator="true"
            :rows="20"
            :filters="filtersNode"
          >
            <Column
              field="label"
              header="Label"
              :expander="true"
            >
              <template #filter>
                <InputText
                  v-model="filtersNode['label']"
                  type="text"
                  class="column-filter"
                  placeholder="Filter by label"
                />
              </template>
            </Column>
            <Column
              field="to"
              header="Link"
            >
              <template #filter>
                <InputText
                  v-model="filtersNode['to']"
                  type="text"
                  class="column-filter"
                  placeholder="Filter by link"
                />
              </template>
            </Column>
            <Column
              field="show_on_menu"
              header="Visibility"
            >
              <template #filter>
                <InputText
                  v-model="filtersNode['show_on_menu']"
                  type="text"
                  class="column-filter"
                  placeholder="Filter by visibility"
                />
              </template>
            </Column>
            <Column
              :header-style="{ 'width': 'auto' }"
              :body-style="{ 'text-align': 'center' }"
            >
              <template #header>Action</template>
              <template #body="slotProps">
                <span class="buttonset">
                  <Button
                    type="button"
                    class="p-button-success button-raised button-sm"
                    @click="onNodeAdd(slotProps.node, 'Add Child Menu')"
                  >
                    <span class="material-icons">add</span>
                  </Button>
                  <Button
                    type="button"
                    class="p-button-info button-raised button-sm"
                    @click="onNodeEdit(slotProps.node, 'Edit Child Menu')"
                  >
                    <span class="material-icons">edit</span>
                  </Button>
                  <Button
                    type="button"
                    class="p-button-danger button-raised button-sm"
                    @click="onNodeDelete($event, slotProps.node.data.id)"
                  >
                    <span class="material-icons">delete</span>
                  </Button>
                  <Button
                    type="button"
                    class="p-button-warning button-raised button-sm"
                  >
                    <span class="material-icons">arrow_upward</span>
                  </Button>
                  <Button
                    type="button"
                    class="p-button-warning button-raised button-sm"
                  >
                    <span class="material-icons">arrow_downward</span>
                  </Button>
                </span>
              </template>
            </Column>
          </TreeTable>
        </template>
      </Card>
      <Dialog
        v-model:visible="ui.modal.manageMenu.state"
        :header="ui.modal.manageMenu.title"
        :style="{ width: '80vw' }"
        :modal="true"
        :position="ui.modal.manageMenu.position"
      >
        <div class="p-fluid formgrid grid">
          <div class="field col-12 md-4">
            <label for="managelabel">Label</label>
            <InputText
              id="managelabel"
              v-model="form.txt_label"
              type="text"
            />
          </div>
          <div class="field col-12 md-8">
            <label for="manageroute">Route Name</label>
            <InputText
              id="manageroute"
              v-model="form.txt_route"
              type="text"
            />
          </div>
          <div class="field col-12 md-8">
            <label for="manageroute">Route URL</label>
            <InputText
              id="managerouteurl"
              v-model="form.txt_route_url"
              type="text"
            />
          </div>
          <div class="field col-12 md-10">
            <label for="manageicon">Icon</label>
            <div class="inputgroup">
              <InputText
                id="manageicon"
                v-model="form.txt_icon"
                type="text"
              />
              <span class="inputgroup-addon">
                <span class="material-icons-outlined">{{ form.txt_icon }}</span>
              </span>
            </div>
          </div>
          <div class="field col-12 md-2">
            <label for="managecheck">Show on Menu</label>
            <ToggleButton
              v-model="form.showMenu"
              on-label="Show it!"
              off-label="No, thanks"
              on-icon="pi pi-check"
              off-icon="pi pi-times"
            />
          </div>
        </div>
        <div class="grid">
          <div class="col-12">
            <DataTable
              :value="setterPermission"
              data-key="id"
              responsive-layout="scroll"
            >
              <template #header>
                <div class="table-header-container">
                  <Button
                    class="button-info button-sm"
                    @click="addFeatureForm"
                  >
                    <span class="material-icons">add</span> Add Feature
                  </Button>
                </div>
              </template>
              <Column
                field="domiden"
                header="DOM"
                sortable
              >
                <template #body="slotProps">{{ slotProps.data.domiden }}</template>
              </Column>
              <Column
                field="dispatchname"
                header="Dispatch"
                sortable
              >
                <template #body="slotProps">{{ slotProps.data.dispatchname }}</template>
              </Column>
            </DataTable>
          </div>
        </div>
        <template #footer>
          <Button
            class="button-text button-sm"
            @click="toggleModal"
          >
            <span class="material-icons">highlight_off</span> Cancel
          </Button>
          <Button
            class="button-sm"
            autofocus
            @click="processForm"
          >
            <span class="material-icons">task_alt</span> Submit
          </Button>
        </template>
      </Dialog>
      <Dialog
        v-model:visible="ui.modal.manageFeature.state"
        :modal="true"
        :header="ui.modal.manageFeature.title"
        :position="ui.modal.manageFeature.position"
        :style="{ width: '50vw' }"
      >
        <div class="p-fluid formgrid grid">
          <div class="field col-12 md-12">
            <label for="manageFeatureDOM">
              DOM Identity
              <code>(class)</code>
            </label>
            <InputText
              id="manageFeatureDOM"
              v-model="form.feature.dom"
              type="text"
            />
          </div>
          <div class="field col-12 md-12">
            <label for="manageFeatureDispatch">Dispatch Command</label>
            <InputText
              id="manageFeatureDispatch"
              v-model="form.feature.dispatch"
              type="text"
            />
          </div>
        </div>
        <template #footer>
          <Button
            class="button-text button-sm"
            @click="toggleFeature"
          >
            <span class="material-icons">highlight_off</span> Cancel
          </Button>
          <Button
            class="button-sm"
            autofocus
            @click="processFeature"
          >
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
import { ref } from 'vue'
export default defineComponent({
  name: 'Module',
  components: {
    Card,
    TreeTable,
    Column,
    Button,
    InputText,
    Dialog,
    ToggleButton,
    Toast,
    DataTable,
    ConfirmPopup,
  },
  setup() {},
  data() {
    return {
      formMode: 'add',
      setterPermission: Array<{
        domiden: string
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
          dispatch: '',
        },
      },
      position: 'center',
      ui: {
        modal: {
          manageMenu: {
            state: false,
            position: 'center',
            title: '',
          },
          manageFeature: {
            state: false,
            position: 'center',
            title: '',
          },
        },
      },
      selectedNode: {},
      filtersNode: {},
      expandedKeys: {},
      nodes: [],
      columns: [
        { field: 'label', header: 'Label', expander: true },
        { field: 'to', header: 'To' },
        { field: 'icon', header: 'Icon' },
      ],
    }
  },
  computed: {
    ...mapGetters({
      data: 'mCoreMenu/getData',
    }),
  },
  mounted() {
    this.reloadMenu()
  },
  methods: {
    ...mapActions({
      getMenu: 'mCoreMenu/get_all_menu',
      rebuildMenu: 'UPDATE_MENU',
    }),
    clearForm() {
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
          dispatch: '',
        },
      }
    },
    reloadMenu() {
      this.getMenu().then((data: any) => {
        this.nodes = data.data.root
      })
    },
    toggleModal() {
      this.ui.modal.manageMenu.state = !this.ui.modal.manageMenu.state
    },
    toggleFeature() {
      this.ui.modal.manageFeature.state = !this.ui.modal.manageFeature.state
    },
    onNodeDelete(event, target: Number) {
      this.$confirm.require({
        target: event.currentTarget,
        message: 'Are you sure to delete this menu?',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'button-danger',
        acceptLabel: 'Yes. Delete it!',
        rejectLabel: 'Cancel',
        accept: () => {
          return CoreService.menuDelete(target).then((response: any) => {
            response = response.data
            if (response.status === 200) {
              this.$toast.add({
                severity: 'success',
                summary: 'Menu Manager',
                detail: response.message,
                life: 3000,
              })
              this.reloadMenu()
              this.rebuildMenu()
            }
          })
        },
        reject: () => {
          // callback to execute when user rejects the action
        },
      })
    },
    onNodeEdit(target: any, mode: string) {
      const data = target.data
      this.form.targetID = data.id
      this.form.txt_label = data.label
      this.form.txt_route = data.identifier
      this.form.txt_route_url = data.to
      this.form.txt_icon = data.icon
      this.form.showMenu = target.show_on_menu === 'Y'
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

      CoreService.menuDetail(data.id).then((response) => {
        const dataSelected = response.data
        if (dataSelected.permission !== null) {
          this.setterPermission = dataSelected.permission
        }
      })
      this.toggleModal()
    },
    onNodeAdd(target: any, mode: string) {
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
    addFeatureForm() {
      this.ui.modal.manageFeature.title = 'Feature'
      this.toggleFeature()
    },
    editMenu() {
      const label = this.form.txt_label
      const routeTo = this.form.txt_route
      const routeToUrl = this.form.txt_route_url
      const icon = this.form.txt_icon
      const showMenu = this.form.showMenu ? 'Y' : 'N'

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
        show_on_menu: showMenu,
      }).then((response: any) => {
        response = response.data
        if (response.status === 200) {
          this.reloadMenu()
          this.rebuildMenu()
          this.clearForm()
          this.ui.modal.manageMenu.state = false
          this.$toast.add({
            severity: 'success',
            summary: 'Menu Manager',
            detail: response.message,
            life: 3000,
          })
        }
      })
    },
    processForm() {
      if (this.formMode === 'add') {
        this.addMenu()
      } else {
        this.editMenu()
      }
    },
    autoFeature(featureData) {
      this.setterPermission.push(featureData)
    },
    processFeature() {
      this.autoFeature({
        domiden: this.form.feature.dom,
        dispatchname: this.form.feature.dispatch,
      })

      this.form.feature = {
        dom: '',
        dispatch: '',
      }

      this.toggleFeature()
    },
    addMenu() {
      const label = this.form.txt_label
      const routeTo = this.form.txt_route
      const routeToUrl = this.form.txt_route_url
      const icon = this.form.txt_icon
      const showMenu = this.form.showMenu ? 'Y' : 'N'

      return CoreService.menuAdd({
        name: label,
        menu_group: this.form.targetGroup,
        identifier: routeTo,
        url: routeToUrl,
        remark: '',
        parent: this.form.targetParent,
        icon: icon,
        show_order: 1,
        show_on_menu: showMenu,
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
              domiden: mimicSetterPermission[a].domiden,
            }).then(async (response: any) => {
              return response
            })

            succeedPermission += permissionAdd.data.status === 200 ? 1 : 0
          }

          if (succeedPermission === this.setterPermission.length) {
            this.reloadMenu()
            this.rebuildMenu()
            this.clearForm()
            this.ui.modal.manageMenu.state = false
            this.$toast.add({
              severity: 'success',
              summary: 'Menu Manager',
              detail: response.message,
              life: 3000,
            })
          }
        }
      })
    },
  },
})
</script>
