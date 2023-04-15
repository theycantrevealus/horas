<template>
  <div>
    <Card class="slim">
      <template #content>
        <Panel
          :header="$t('menu.label.index')"
          :toggleable="false"
        >
          <template #icons>
            <Button class="p-button-text p-button-info p-button-rounded p-button-raised button-sm"><span class="material-icons">help</span>
              Info</Button>
          </template>
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
              :header="$t('menu.datatable.column.label.caption')"
              :expander="true"
            >
              <template #filter>
                <InputText
                  v-model="filtersNode['label']"
                  type="text"
                  class="column-filter"
                  :placeholder="$t('menu.datatable.column.label.placeholder')"
                />
              </template>
            </Column>
            <Column
              field="to"
              :header="$t('menu.datatable.column.link.caption')"
            >
              <template #filter>
                <InputText
                  v-model="filtersNode['url']"
                  type="text"
                  class="column-filter"
                  :placeholder="$t('menu.datatable.column.link.placeholder')"
                />
              </template>
            </Column>
            <Column
              field="show_on_menu"
              :header="$t('menu.datatable.column.visibility.caption')"
            >
              <template #filter>
                <InputText
                  v-model="filtersNode['show_on_menu']"
                  type="text"
                  class="column-filter"
                  :placeholder="$t('menu.datatable.column.visibility.placeholder')"
                />
              </template>
              <template #body="slotProps">
                <label :class="`${slotProps.node.data.show_on_menu ? 'text-green-500' : 'text-red-500'}`">
                  <center>
                    <span class="material-icons" v-if="slotProps.node.data.show_on_menu">done</span>
                    <span class="material-icons" v-if="!slotProps.node.data.show_on_menu">close</span>
                  </center>
                </label>
              </template>
            </Column>
            <Column
              :header-style="{ 'width': 'auto' }"
              :body-style="{ 'text-align': 'center' }"
            >
              <template #header>{{ $t('global.datatable.column.action') }}</template>
              <template #body="slotProps">
                <span class="p-buttonset">
                  <Button
                    type="button"
                    class="p-button-success p-button-raised p-button-sm"
                    @click="onNodeAdd(slotProps.node, 'Add Child Menu')"
                  >
                    <span class="material-icons">add</span>
                    <small>{{ $t('menu.datatable.button.add_child') }}</small>
                  </Button>
                  <Button
                    type="button"
                    class="p-button-info p-button-raised p-button-sm"
                    @click="onNodeEdit(slotProps.node, 'Edit Child Menu')"
                  >
                    <span class="material-icons">edit</span>
                    <small>{{ $t('menu.datatable.button.edit_child') }}</small>
                  </Button>
                  <Button
                    type="button"
                    class="p-button-danger p-button-raised p-button-sm"
                    @click="onNodeDelete($event, slotProps.node.data.id)"
                  >
                    <span class="material-icons">delete</span>
                    <small>{{ $t('menu.datatable.button.delete_child') }}</small>
                  </Button>
                  <Button
                    type="button"
                    class="p-button-warning button-raised p-button-sm"
                  >
                    <span class="material-icons">arrow_upward</span>
                    <small>{{ $t('menu.datatable.button.sort_up') }}</small>
                  </Button>
                  <Button
                    type="button"
                    class="p-button-warning p-button-raised p-button-sm"
                  >
                    <span class="material-icons">arrow_downward</span>
                    <small>{{ $t('menu.datatable.button.sort_down') }}</small>
                  </Button>
                </span>
              </template>
            </Column>
          </TreeTable>
        </Panel>
      </template>
    </Card>
    <Dialog
      v-model:visible="ui.modal.manageMenu.state"
      :header="ui.modal.manageMenu.title"
      :style="{ width: '80vw' }"
      :modal="true"
      position="center"
    >
      <div class="p-fluid p-formgrid p-grid">
        <div class="p-field p-col-12 p-md-4">
          <label for="managelabel">Label</label>
          <InputText
            id="managelabel"
            v-model="form.txt_label"
            type="text"
          />
        </div>
        <div class="p-field p-col-12 p-md-8">
          <label for="manageroute">Route Name</label>
          <InputText
            id="manageroute"
            v-model="form.txt_route"
            type="text"
          />
        </div>
        <div class="p-field p-col-12 p-md-8">
          <label for="manageroute">Route URL</label>
          <InputText
            id="managerouteurl"
            v-model="form.txt_route_url"
            type="text"
          />
        </div>
        <div class="p-field p-col-12 p-md-10">
          <label for="manageicon">Icon</label>
          <div class="p-inputgroup">
            <InputText
              id="manageicon"
              v-model="form.txt_icon"
              type="text"
            />
            <span class="p-inputgroup-addon">
              <span class="material-icons-outlined">{{ form.txt_icon }}</span>
            </span>
          </div>
        </div>
        <div class="p-field p-col-12 md-2">
          <label for="managecheck">Show on Menu</label>
          <div class="p-inputgroup">
            <ToggleButton
              v-model="form.showMenu"
              on-label="Show it!"
              off-label="No, thanks"
              on-icon="pi pi-check"
              off-icon="pi pi-times"
            />
          </div>

        </div>
      </div>
      <div class="p-grid">
        <div class="p-col-12">
          <DataTable
            :value="setterPermission"
            data-key="id"
            responsive-layout="scroll"
          >
            <template #header>
              <div class="table-header-container">
                <Button
                  class="p-button-info p-button-sm"
                  @click="addFeatureForm"
                >
                  <span class="material-icons">add</span> Add Feature
                </Button>
              </div>
            </template>
            <Column
              field="domIdentity"
              header="DOM"
              sortable
            >
              <template #body="slotProps">{{ slotProps.data.domIdentity }}</template>
            </Column>
            <Column
              field="dispatchName"
              header="Dispatch"
              sortable
            >
              <template #body="slotProps">{{ slotProps.data.dispatchName }}</template>
            </Column>
            <Column
              field="action"
              header="Action"
              class="wrapped"
            >
              <template #body="slotProps">
                <Button
                  class="p-button-danger p-button-sm"
                  @click="removeFeature($event, slotProps.data)"
                >
                  <span class="material-icons">highlight_off</span> Delete
                </Button></template>
            </Column>
          </DataTable>
        </div>
      </div>
      <template #footer>
        <Button
          class="p-button-text p-button-sm"
          @click="toggleModal"
        >
          <span class="material-icons">highlight_off</span> Cancel
        </Button>
        <Button
          class="p-button-sm"
          autofocus
          @click="processForm"
        >
          <span class="material-icons">task_alt</span> Submit
        </Button>
      </template>
    </Dialog>
    <Dialog
      v-model:visible="ui.modal.manageFeature.state"
      position="center"
      :modal="true"
      :header="ui.modal.manageFeature.title"
      :style="{ width: '50vw' }"
    >
      <div class="p-fluid p-formgrid grid">
        <div class="field col-12 md-12">
          <label for="manageFeatureDOM">
            DOM Identity
            <code>(class)</code>
          </label>
          <InputText
            id="manageFeatureDOM"
            v-model="form.feature.domIdentity"
            type="text"
          />
        </div>
        <div class="field col-12 md-12">
          <label for="manageFeatureDispatch">Dispatch Command</label>
          <InputText
            id="manageFeatureDispatch"
            v-model="form.feature.dispatchName"
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
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
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
    Panel,
  },
  setup() {},
  data() {
    return {
      formMode: 'add',
      setterPermission: Array<{
        domIdentity: string
        dispatchName: string
      }>(),
      form: {
        targetGroup: {
          'id': '',
          'name': '',
        },
        targetParent: '',
        targetID: 0,
        txt_label: '',
        txt_route: '',
        txt_route_url: '',
        txt_icon: '',
        showMenu: false,
        showFeature: false,
        feature: {
          domIdentity: '',
          dispatchName: '',
        },
        permission: [] as any,
        __v: 0,
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
      rebuildMenu: 'coreUpdateMenu',
    }),
    clearForm() {
      this.form = {
        targetGroup: {
          'id': '',
          'name': '',
        },
        targetParent: '',
        targetID: 0,
        txt_label: '',
        txt_route: '',
        txt_route_url: '',
        txt_icon: '',
        showMenu: false,
        showFeature: false,
        permission: [],
        feature: {
          domIdentity: '',
          dispatchName: '',
        },
        __v: 0,
      }
    },
    reloadMenu() {
      this.getMenu().then((data: any) => {
        this.nodes = data.data
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
            if (response.status === 200) {
              response = response.data
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
      this.setterPermission = data.permission || []
      this.form.showMenu = target.show_on_menu
      this.formMode = 'edit'
      this.ui.modal.manageMenu.title = `${mode}  ${data.label}`

      const checkLevel = target.key.split('-')
      this.form.targetGroup = data.menu_group
      this.form.targetParent = data.parent
      this.form.__v = data.__v


      this.toggleModal()
    },
    onNodeAdd(target: any, mode: string) {
      const data = target.data
      this.clearForm()
      this.formMode = 'add'

      this.form.targetParent = data.id
      this.form.targetGroup = data.menu_group
      this.form.__v = 0

      this.ui.modal.manageMenu.title = `${mode}  ${data.label}`
      this.toggleModal()
    },
    addFeatureForm() {
      this.ui.modal.manageFeature.title = 'Feature'
      this.toggleFeature()
    },
    async editMenu() {
      const label = this.form.txt_label
      const routeTo = this.form.txt_route
      const routeToUrl = this.form.txt_route_url
      const icon = this.form.txt_icon
      const showMenu = this.form.showMenu

      this.form.permission = this.setterPermission

      return await CoreService.menuEdit(this.form.targetID, {
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
        permission: this.setterPermission,
        show_on_menu: showMenu,
        __v: this.form.__v,
      }).then((response: any) => {
        if ((response.status === 200 || response.status === 201) && response.data.statusCode === 'MNU_U_S0000') {
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
        domIdentity: this.form.feature.domIdentity,
        dispatchName: this.form.feature.dispatchName,
      })

      this.form.feature = {
        domIdentity: '',
        dispatchName: '',
      }


      this.toggleFeature()
    },
    removeFeature(event: any, data: any) {
      const permissionMimic = this.setterPermission
      permissionMimic.map((e, f) => {
        if (data === e) {
          this.setterPermission.splice(f, 1)
        }
      })
    },
    async addMenu() {
      const label = this.form.txt_label
      const routeTo = this.form.txt_route
      const routeToUrl = this.form.txt_route_url
      const icon = this.form.txt_icon
      const showMenu = this.form.showMenu

      const checkParent =this.form.targetParent.split('-')

      return CoreService.menuAdd({
        name: label,
        menu_group: (checkParent[0] === 'menu_group') ? this.form.targetParent : this.form.targetGroup,
        identifier: routeTo,
        url: routeToUrl,
        remark: '',
        parent: (checkParent[0] === 'menu_group') ? '' : this.form.targetParent,
        permission: this.setterPermission,
        icon: icon,
        show_order: 1,
        show_on_menu: showMenu,
      }).then(async (response: any) => {
        if ((response.status === 201 || response.status === 200) && response.data.statusCode === 'MNU_I_S0000') {
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
  },
})
</script>
