<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #content>
          <Panel
            header="Account Management"
            :toggleable="false"
          >
            <template #icons>
              <Button class="p-button-text p-button-info p-button-rounded p-button-raised button-sm"><span class="material-icons">help</span>
                Info</Button>
            </template>
          </Panel>
          <TabView>
            <TabPanel header="Main Info">
              <div class="grid">
                <div class="col-4">
                  <div class="profile-display">
                    <img :src="formData.image" />
                  </div><Button
                    class="button p-button-info button-sm button-raised"
                    label="Avatar"
                    icon="pi pi-external-link"
                    @click="toggleEditImageWindow"
                  />
                </div>
                <div class="col-8 form-mode">
                  <div class="p-inputgroup">
                    <span class="p-inputgroup-addon">
                      <span class="material-icons-outlined">mail</span>
                    </span>
                    <!-- <InputText class="inputtext-sm" @input="updateAccount($event.target.value)" v-model="accountDetail.email"
                  placeholder="Email" /> -->
                    <InputText
                      v-model="formData.email"
                      class="inputtext-sm"
                      placeholder="Email"
                    />
                  </div>
                  <div class="p-inputgroup">
                    <span class="p-inputgroup-addon">
                      <span class="material-icons-outlined">person</span>
                    </span>
                    <InputText
                      v-model="formData.first_name"
                      class="inputtext-sm"
                      placeholder="First Name"
                    />
                    <InputText
                      v-model="formData.last_name"
                      class="inputtext-sm"
                      placeholder="Last Name"
                    />
                  </div>
                  <div class="p-inputgroup">
                    <span class="p-inputgroup-addon">
                      <span class="material-icons-outlined">supervised_user_circle</span>
                    </span>
                    <Dropdown
                      v-model="formData.authority"
                      :options="authorityData"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="Select authority"
                    />
                  </div>
                  <Button class="p-button button-info button-sm button-raised">
                    <span class="material-icons">fact_check</span> Apply from authority
                  </Button>
                </div>
              </div>
            </TabPanel>
            <TabPanel header="Permission and Privileges">
              <div class="grid">
                <div class="col-12">
                  <TreeTable
                    v-if="menuTreeData"
                    class="treetable-sm p-datatable-table vert-top"
                    filterMode="strict"
                    :value="menuTreeData"
                    :lazy="true"
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
                          v-model="filtersNode.label.value"
                          type="text"
                          class="column-filter"
                          placeholder="Filter by label"
                        />
                      </template>
                      <template #body="slotProps">
                        <Checkbox
                          v-model="selectedAccess"
                          name="menus"
                          :value="slotProps.node.data.id"
                          @change="check_menu($event, slotProps)"
                        /> {{ slotProps.node.data.label }}
                      </template>
                    </Column>
                    <Column
                      field="to"
                      header="Link"
                    >
                      <template #filter>
                        <InputText
                          v-model="filtersNode.to.value"
                          type="text"
                          class="column-filter"
                          placeholder="Filter by link"
                        />
                      </template>
                    </Column>
                    <Column
                      field="to"
                      header="Link"
                    >
                      <template #body="slotProps">
                        <div v-if="slotProps.node.data.permission !== undefined">
                          <div
                            v-for="indexPerm in slotProps.node.data.permission"
                            :key="indexPerm"
                            class="checkbox-custom"
                          >
                            <Checkbox
                              v-model="selectedPermission"
                              name="perms"
                              :value="indexPerm"
                              @change="set_permission($event, indexPerm)"
                            />
                            {{ indexPerm.domIdentity }}
                          </div>
                        </div>
                      </template>
                    </Column>
                  </TreeTable>
                </div>
              </div>
            </TabPanel>
            <TabPanel header="Activities">
              <div class="grid">
                <div class="col-3">
                  <div class="field">
                    <label for="filter-from">From</label>
                    <br />
                    <Calendar
                      id="filter-from"
                      v-model="logFrom"
                      dateFormat="dd/mm/yy"
                      :showTime="true"
                      :showSeconds="true"
                    />
                  </div>
                </div>
                <div class="col-3">
                  <div class="field">
                    <label for="filter-to">To</label>
                    <br />
                    <Calendar
                      id="filter-to"
                      v-model="logTo"
                      dateFormat="dd/mm/yy"
                      :showTime="true"
                      :showSeconds="true"
                    />
                  </div>
                </div>
                <div class="col-3">
                  <br />
                  <Button
                    type="button"
                    class="button-raised button-sm button-info px-3"
                    @click="cariLogActivity($event)"
                  >
                    <span class="material-icons-outlined">search</span> Cari Activity
                  </Button>
                </div>
              </div>
              <Timeline
                :value="events"
                class="customized-timeline no-left"
              >
                <template #marker="slotProps">
                  <span
                    class="custom-marker shadow-2"
                    :style="{backgroundColor: slotProps.item.color}"
                  >
                    <i :class="slotProps.item.icon"></i>
                  </span>
                </template>
                <template #content="slotProps">
                  <Card>
                    <template #title>
                      <h3>{{slotProps.item.status}}</h3>
                    </template>
                    <template #subtitle>
                      {{slotProps.item.date}}
                    </template>
                    <template #content>
                      <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Inventore sed consequuntur error repudiandae numquam deserunt quisquam repellat libero asperiores earum nam nobis, culpa ratione quam perferendis esse, cupiditate neque quas!</p>
                      <Button
                        label="Read more"
                        class="button-text"
                      ></Button>
                    </template>
                  </Card>
                </template>
              </Timeline>
            </TabPanel>
          </TabView>
          <div class="p-grid">
            <div class="p-col-12">
              <div class="flex jc-between">
                <div class="flex-initial flex align-items-center justify-content-center m-2 px-5 py-3">
                  <Button
                    type="button"
                    class="button-raised button-sm p-button-danger px-3"
                    @click="back()"
                  >
                    <span class="material-icons-outlined">arrow_back</span> Back
                  </Button>
                </div>
                <div class="flex-grow-1 flex align-items-center justify-content-center m-2 px-5 py-3"></div>
                <div
                  v-if="allowSave === true"
                  class="flex-initial flex align-items-right justify-content-center m-2 px-5 py-3"
                >
                  <Button
                    type="button"
                    class="button-raised button-sm p-button-info px-3"
                    @click="updateAccountData($event)"
                  >
                    <span class="material-icons-outlined">check_circle</span> Save Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
      <ConfirmPopup group="confirm_changes"></ConfirmPopup>
      <ConfirmDialog group="keep_editing"></ConfirmDialog>
    </div>
    <Dialog
      v-model:visible="displayEditorImage"
      header="Avatar Editor"
      :style="{ width: '50vw' }"
      :modal="true"
    >
      <p class="m-0">
        <Cropper @cropImage="setImageData" />
      </p>
      <template #footer>
        <Button
          label="Close"
          icon="pi pi-times"
          class="button-text"
          @click="toggleEditImageWindow"
        />
      </template>
    </Dialog>
  </div>
</template>
<script>
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import TreeTable from 'primevue/treetable'
import Column from 'primevue/column'
import ConfirmPopup from 'primevue/confirmpopup'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Cropper from '@/components/Cropper.vue'
import Timeline from 'primevue/timeline'
import Calendar from 'primevue/calendar'
import { getCurrentTimestamp } from '@/util/time'

import { mapActions, mapGetters, mapState } from 'vuex'
export default {
  name: 'AccountEdit',
  components: {
    Card,
    Panel,
    InputText,
    Button,
    Dropdown,
    ConfirmPopup,
    ConfirmDialog,
    Checkbox,
    TreeTable,
    Column,
    Cropper,
    Dialog,
    TabView,
    TabPanel,
    Timeline,
    Calendar,
  },
  data() {
    return {
      displayEditorImage: false,
      formData: {
        id: '',
        email: '',
        first_name: '',
        last_name: '',
        authority: '',
        selectedAccess: [],
        selectedPermission: [],
        __v: 0,
      },
      logFrom: null,
      logTo: null,
      events: [
        {
          status: 'Ordered',
          date: '15/10/2020 10:30',
          icon: 'pi pi-shopping-cart',
          color: '#9C27B0',
          image: 'game-controller.jpg',
        },
        {
          status: 'Processing',
          date: '15/10/2020 14:00',
          icon: 'pi pi-cog',
          color: '#673AB7',
        },
        {
          status: 'Shipped',
          date: '15/10/2020 16:15',
          icon: 'pi pi-shopping-cart',
          color: '#FF9800',
        },
        {
          status: 'Delivered',
          date: '16/10/2020 10:00',
          icon: 'pi pi-check',
          color: '#22c55e',
        },
      ],
      raw: {
        access: {},
        permission: [],
      },
      menuTreeData: [],
      allowSave: false,
      authorityData: [],
      selectedGroup: [],
      selectedAccess: [],
      selectedPermission: [],
      lazyParams: {},
      selectedNode: {},
      filtersNode: {
        label: { value: '', matchMode: 'contains' },
        to: { value: '', matchMode: 'contains' },
      },
      expandedKeys: {},
      nodes: null,
      columns: [
        { field: 'label', header: 'Label', expander: true },
        { field: 'to', header: 'To' },
      ],
    }
  },

  computed: {
    ...mapGetters({
      menuTree: 'accountModule/getMenuTree',
      menuList: 'accountModule/getMenuList',
      accountDetail: 'accountModule/getAccountDetail',
    }),
  },
  watch: {
    menuTree: {
      handler(getData) {
        if (getData) {
          this.menuTreeData = getData
        }
      },
    },
    menuList: {
      handler(getData) {
        if (getData) {
          const accessData = getData.payload.data
          for (const a in accessData) {
            if(this.raw.access[accessData[a].id]) {
              this.raw.access[accessData[a].id] = {}
            }
            this.raw.access[accessData[a].id] = accessData[a]
          }
        }
      },
    },
    accountDetail: {
      handler(getDetail) {
        if (getDetail) {
          this.allowSave = !!getDetail.id;

          this.formData.id = getDetail.id
          this.formData.email = getDetail.email
          this.formData.first_name = getDetail.first_name
          this.formData.last_name = getDetail.last_name
          this.formData.__v = getDetail.__v
          // this.formData.authority = getDetail.authority.id

          for (const a in getDetail.access) {
            if(this.formData.selectedAccess.indexOf(getDetail.access[a]) < 0) {
              // this.formData.selectedAccess.push(getDetail.access[a])
              this.selectedAccess.push(getDetail.access[a].id)
            }
          }

          for (const a in getDetail.permission) {
            if (this.formData.selectedPermission.indexOf(getDetail.permission[a]) < 0) {
              // this.formData.selectedPermission.push(getDetail.permission[a])
              this.selectedPermission.push(getDetail.permission[a])
            }
          }
        } else {
          this.allowSave = false
        }
      },
      immediate: true,
    },
  },
  async mounted() {
    this.allowSave = false
    await this.$store.dispatch(
      'accountModule/fetchAccountDetail',
      this.$route.query.id
    )

    await this.$store.dispatch('accountModule/fetchMenuTree')
    await this.$store.dispatch('accountModule/fetchMenuList')

    this.displayEditorImage = false
  },
  methods: {
    ...mapActions('accountModule', [
      'updateAccount',
      'updatePermission',
      'updateAccess',
    ]),
    ...mapActions({
      sLogout: 'coreLogout',
      rebuildMenu: 'coreUpdateMenu',
      rebuildAccess: 'coreRefreshAccess',
    }),
    back() {
      this.$router.push('/account')
    },
    setImageData(value) {
      this.formData.image_edit = true
      this.formData.image = value
    },
    toggleEditImageWindow() {
      this.displayEditorImage = !this.displayEditorImage
    },
    updateAccountData: function (event) {
      const target = event.target

      const confirmation = this.$confirm
      if (this.allowSave) {
        confirmation.require({
          group: 'confirm_changes',
          target: target,
          message: `Update account data?`,
          icon: 'pi pi-exclamation-triangle',
          acceptClass: 'button-success',
          acceptIcon: 'pi pi-check-circle',
          acceptLabel: 'Yes',
          rejectLabel: 'Abort',
          rejectIcon: 'pi pi-times-circle',
          accept: () => {
            for(const a in this.selectedAccess) {
              if(this.raw.access[this.selectedAccess[a]]) {
                this.formData.selectedAccess.push(this.raw.access[this.selectedAccess[a]])
              }
            }

            this.formData.selectedPermission = this.selectedPermission

            this.updateAccount(this.formData).then(async (response) => {
              if (response.status === 200 || response.status === 201) {
                await this.$store.dispatch(
                  'accountModule/fetchAccountDetail',
                  this.$route.query.id
                )

                await this.$store.dispatch('accountModule/fetchMenuTree')
                await this.$store.dispatch('accountModule/fetchMenuList')

                await this.rebuildMenu().then(() => {
                  this.rebuildAccess()
                })

                this.$confirm.require({
                  group: 'keep_editing',
                  message: `${response.data.message}. Back to account list?`,
                  header: 'Confirmation',
                  icon: 'pi pi-exclamation-triangle',
                  acceptClass: 'p-button-success',
                  rejectClass: 'p-button-warning',
                  acceptLabel: 'Yes',
                  acceptIcon: 'pi pi-check-circle',
                  rejectLabel: 'Keep Editing',
                  rejectIcon: 'pi pi-times-circle',
                  accept: () => {
                    this.$router.push('/account')
                  },
                  reject: () => {
                    //callback to execute when user rejects the action
                  },
                  onHide: () => {
                    //Callback to execute when dialog is hidden
                  },
                })
              }
            })
          },
          reject: () => {
            // callback to execute when user rejects the action
          },
        })
      }
    },
    set_permission(event, target) {},
    check_child(children, isDelete) {
      for (const a in children) {
        const dataSet = children[a].id
        if(isDelete) {
          this.selectedAccess.splice(this.selectedAccess.indexOf(dataSet), 1)
        } else {
          if(this.selectedAccess.indexOf(dataSet) < 0) {
            this.selectedAccess.push(dataSet)
          }
        }

        if(children[a].children.length > 0) {
          this.check_child(children[a].children, isDelete)
        }
      }
    },
    check_menu(event, target) {
      const data = target.node
      const pageDeleteMode = this.selectedAccess.indexOf(data.id) < 0
      const isGroup = data.id.split('-')
      this.check_child(data.children, pageDeleteMode)
    },
  },
}
</script>
<style>
.profile-display {
  position: relative;
  background: red;
}

.profile-display img {
  position: absolute;
  border-radius: 100%;
  width: 200px;
  height: 200px;
  background: #f2f2f2;
  margin: 0 25%;
}
</style>
