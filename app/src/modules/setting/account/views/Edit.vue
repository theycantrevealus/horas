<template>
  <div class="grid">
    <div class="col-12">
      <Card>
        <template #title>Edit Account</template>
        <template #content>
          <TabView>
            <TabPanel header="Main Info">
              <div class="grid">
                <div class="col-4">
                  <div class="profile-display">
                    <img :src="formData.image" />
                  </div><Button
class="button button-info button-sm button-raised" label="Avatar"
                    icon="pi pi-external-link" @click="toggleEditImageWindow" />
                </div>
                <div class="col-8 form-mode">
                  <div class="inputgroup">
                    <span class="inputgroup-addon">
                      <span class="material-icons-outlined">mail</span>
                    </span>
                    <!-- <InputText class="inputtext-sm" @input="updateAccount($event.target.value)" v-model="accountDetail.email"
                  placeholder="Email" /> -->
                    <InputText v-model="formData.email" class="inputtext-sm" placeholder="Email" />
                  </div>
                  <div class="inputgroup">
                    <span class="inputgroup-addon">
                      <span class="material-icons-outlined">person</span>
                    </span>
                    <InputText v-model="formData.first_name" class="inputtext-sm" placeholder="First Name" />
                    <InputText v-model="formData.last_name" class="inputtext-sm" placeholder="Last Name" />
                  </div>
                  <div class="inputgroup">
                    <span class="inputgroup-addon">
                      <span class="material-icons-outlined">supervised_user_circle</span>
                    </span>
                    <Dropdown
v-model="formData.authority" :options="authorityData" optionLabel="name" optionValue="uid"
                      placeholder="Select authority" />
                  </div>
                  <Button class="button button-info button-sm button-raised" @click="updateAccountData">
                    <span class="material-icons">fact_check</span> Apply from authority
                  </Button>
                </div>
              </div>
            </TabPanel>
            <TabPanel header="Permission and Privileges">
              <div class="grid">
                <div class="col-12">
                  <TreeTable
v-if="formData.menuTree" class="treetable-sm p-datatable-table vert-top"
                    filterMode="strict" :value="formData.menuTree" :lazy="true" :paginator="true" :rows="20"
                    :filters="filtersNode">
                    <Column field="label" header="Label" :expander="true">
                      <template #filter>
                        <InputText
v-model="filtersNode.label.value" type="text" class="column-filter"
                          placeholder="Filter by label" />
                      </template>
                      <template #body="slotProps">
                        <Checkbox
v-model="selectedPage" name="menus"
                          :value="slotProps.node.data.id" @change="check_menu($event, slotProps.node)" /> {{ slotProps.node.data.label }}
                      </template>
                    </Column>
                    <Column field="to" header="Link">
                      <template #filter>
                        <InputText
v-model="filtersNode.to.value" type="text" class="column-filter"
                          placeholder="Filter by link" />
                      </template>
                    </Column>
                    <Column field="to" header="Link">
                      <template #body="slotProps">
                        <div v-if="slotProps.node.data.permission !== undefined">
                          <div
v-for="indexPerm in slotProps.node.data.permission" :key="indexPerm"
                            class="checkbox-custom">
                            <Checkbox
v-model="selectedPerm" name="perms" :value="indexPerm.id"
                              @change="set_permission($event, indexPerm.id)" />
                            {{ indexPerm.domiden }}
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
                    <Calendar id="filter-from" v-model="logFrom" dateFormat="dd/mm/yy" :showTime="true" :showSeconds="true" />
                  </div>
                </div>
                <div class="col-3">
                  <div class="field">
                    <label for="filter-to">To</label>
                    <br />
                    <Calendar id="filter-to" v-model="logTo" dateFormat="dd/mm/yy" :showTime="true" :showSeconds="true" />
                  </div>
                </div>
                <div class="col-3">
                  <br />
                  <Button
type="button" class="button-raised button-sm button-info px-3"
                    @click="cariLogActivity($event)">
                    <span class="material-icons-outlined">search</span> Cari Activity
                  </Button>
                </div>
              </div>
              <Timeline :value="events" class="customized-timeline no-left">
                <template #marker="slotProps">
                  <span class="custom-marker shadow-2" :style="{backgroundColor: slotProps.item.color}">
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
                      <Button label="Read more" class="button-text"></Button>
                    </template>
                  </Card>
                </template>
              </Timeline>
            </TabPanel>
          </TabView>
          <div class="grid">
            <div class="col-12">
              <div class="d-flex jc-between">
                <div>
                  <Button type="button" class="button-raised button-sm button-danger px-3" @click="back()">
                    <span class="material-icons-outlined">arrow_back</span> Back
                  </Button>
                </div>
                <div v-if="allowSave === true">
                  <Button
type="button" class="button-raised button-sm button-info px-3"
                    @click="updateAccountData($event)">
                    <span class="material-icons-outlined">check_circle</span> Save Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
      <ConfirmPopup></ConfirmPopup>
    </div>
    <Dialog v-model:visible="displayEditorImage" header="Avatar Editor" :style="{ width: '50vw' }" :modal="true">
      <p class="m-0">
        <Cropper @cropImage="setImageData" />
      </p>
      <template #footer>
        <Button label="Close" icon="pi pi-times" class="button-text" @click="toggleEditImageWindow" />
      </template>
    </Dialog>
  </div>
</template>
<script>
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import TreeTable from 'primevue/treetable'
import Column from 'primevue/column'
import ConfirmPopup from 'primevue/confirmpopup'
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
    Card, InputText, Button, Dropdown, ConfirmPopup, Checkbox, TreeTable, Column, Cropper, Dialog, TabView, TabPanel, Timeline, Calendar
  },
  data () {
    return {
      displayEditorImage: false,
      formData: {
        uid: '',
        email: '',
        authority: '',
        first_name: '',
        last_name: '',
        image: '',
        image_edit: false,
        menuTree: []
      },
      logFrom: null,
      logTo: null,
      events: [
        { status: 'Ordered', date: '15/10/2020 10:30', icon: 'pi pi-shopping-cart', color: '#9C27B0', image: 'game-controller.jpg' },
        { status: 'Processing', date: '15/10/2020 14:00', icon: 'pi pi-cog', color: '#673AB7' },
        { status: 'Shipped', date: '15/10/2020 16:15', icon: 'pi pi-shopping-cart', color: '#FF9800' },
        { status: 'Delivered', date: '16/10/2020 10:00', icon: 'pi pi-check', color: '#22c55e' }
      ],
      allowSave: false,
      authorityData: [],
      selectedParent: {},
      selectedMenu: [],
      selectedPage: [],
      selectedPerm: [],
      lazyParams: {},
      selectedNode: {},
      filtersNode: {
        label: { value: '', matchMode: 'contains' },
        to: { value: '', matchMode: 'contains' }
      },
      expandedKeys: {},
      nodes: null,
      columns: [
        { field: 'label', header: 'Label', expander: true },
        { field: 'to', header: 'To' }
      ]
    }
  },
  computed: {
    ...mapState('accountModule', ['menu_list', 'menu_tree']),
    ...mapGetters({
      menuTree: 'accountModule/getMenuTree',
      accountDetail: 'accountModule/getAccountDetail',
      authorityList: 'accountModule/getAuthorityList'
    })
  },
  watch: {
    menuTree: {
      handler (getData) {
        if (getData) {
          this.formData.menuTree = getData
        }
      }
    },
    authorityList: {
      handler (getAuthorityList) {
        if (getAuthorityList) {
          this.authorityData = getAuthorityList
        }
      }
    },
    accountDetail: {
      handler (getDetail) {
        if (getDetail) {
          if (getDetail.account.uid !== undefined) {
            this.allowSave = true
          } else {
            this.allowSave = false
          }

          this.formData.uid = getDetail.account.uid
          this.formData.email = getDetail.account.email
          this.formData.authority = getDetail.account.authority.uid
          this.formData.first_name = getDetail.account.first_name
          this.formData.last_name = getDetail.account.last_name

          this.formData.image = `${process.env.VUE_APP_APIGATEWAY}avatar/${getDetail.account.uid}.png?d=${Date.now()}`
          this.formData.image_edit = false

          for (const a in getDetail.access) {
            if (this.selectedPage.indexOf(getDetail.access[a].id) < 0) {
              this.selectedPage.push(getDetail.access[a].id)
            }

            if (this.selectedMenu.indexOf(getDetail.access[a].id) < 0) {
              this.selectedMenu.push(getDetail.access[a].id)
            }
          }

          for (const a in getDetail.permission) {
            if (this.selectedPerm.indexOf(getDetail.permission[a].id) < 0) {
              this.selectedPerm.push(getDetail.permission[a].id)
            }
          }
        } else {
          this.allowSave = false
        }
      },
      immediate: true
    }
  },
  async mounted () {
    this.allowSave = false
    // this.$store.dispatch('accountModule/fetchMenu')
    await this.$store.dispatch('accountModule/fetchAccountDetail', this.$route.query.uid)
    await this.$store.dispatch('accountModule/fetchAccountActivity', {
      uid: this.$route.query.uid,
      from: '123',
      to: '333'
    })
    await this.$store.dispatch('accountModule/fetchMenuTree')
    await this.$store.dispatch('accountModule/fetchAuthority')
    this.displayEditorImage = false
  },
  methods: {
    ...mapActions('accountModule', ['updateAccount', 'updatePermission', 'updateAccess']),
    back () {
      this.$router.push('/account')
    },
    setImageData (value) {
      this.formData.image_edit = true
      this.formData.image = value
    },
    toggleEditImageWindow () {
      this.displayEditorImage = !this.displayEditorImage
    },
    updateAccountData: function (event) {
      if (this.allowSave) {
        // this.formData.image = this.formData.image.replace(/^data:image\/\w+;base64,/, '')
        this.updateAccount(this.formData).then((response) => {
          if (response.status === 200) {
            const responseAccess = []
            const responsePermission = []
            for (const a in this.selectedMenu) {
              this.updateAccess({
                account: this.$route.query.uid,
                menu: this.selectedMenu[a]
              }).then((response) => {
                responseAccess.push(response)
              })
            }

            for (const a in this.selectedParent) {
              const parsedIDParent = a.split('_')
              this.updateAccess({
                account: this.$route.query.uid,
                menu: parsedIDParent[parsedIDParent.length - 1]
              }).then((response) => {
                responseAccess.push(response)
              })
            }

            for (const a in this.selectedPerm) {
              this.updatePermission({
                account: this.$route.query.uid,
                permission: this.selectedPerm[a]
              }).then((response) => {
                responsePermission.push(response)
              })
            }

            this.$store.dispatch('accountModule/fetchMenuTree', this.lazyParams)
            this.$confirm.require({
              target: event.target,
              message: `${response.data.message}. Back to account list?`,
              icon: 'pi pi-exclamation-triangle',
              acceptClass: 'button-success',
              acceptLabel: 'Yes',
              rejectLabel: 'Keep Editing',
              accept: () => {
                this.$router.push('/account')
              },
              reject: () => {
                // callback to execute when user rejects the action
              }
            })
          }
        })
      }
    },
    set_permission (event, target) {
      // console.log(this.selectedPerm)
    },
    check_child (children, isDelete) {
      for (const a in children) {
        const dataSet = parseInt(children[a].data.id)
        if (isDelete) {
          this.selectedPage.splice(this.selectedPage.indexOf(dataSet), 1)
          this.selectedMenu.splice(this.selectedPage.indexOf(dataSet), 1)
        } else {
          if (this.selectedPage.indexOf(dataSet) < 0) {
            this.selectedPage.push(dataSet)
          }

          if (this.selectedMenu.indexOf(dataSet) < 0) {
            this.selectedMenu.push(dataSet)
          }
        }

        if (children[a].children.length > 0) {
          this.check_child(children[a].children, isDelete)
        } else {
          this.check_parent(children[a].key, isDelete)
        }
      }
    },
    check_parent (parentSplitRaw, pageDeleteMode) {
      const parentSplit = parentSplitRaw.split('-')
      for (let a = 0; a < parentSplit.length; a++) {
        const getVal = parseInt(parentSplit[a])

        if (a < (parentSplit.length - 1)) {
          // Is Parent
          if (this.selectedParent[`parent_${getVal}`] === undefined) {
            this.selectedParent[`parent_${getVal}`] = 0
          }

          if (pageDeleteMode) {
            if (parseInt(this.selectedParent[`parent_${getVal}`]) > 0) {
              this.selectedParent[`parent_${getVal}`] -= 1
            }
          } else {
            this.selectedParent[`parent_${getVal}`] += 1
          }
        } else {
          if (pageDeleteMode) {
            this.selectedMenu.splice(this.selectedPage.indexOf(getVal), 1)
          } else {
            if (this.selectedMenu.indexOf(getVal) < 0) {
              this.selectedMenu.push(getVal)
            }
          }
        }
      }

      for (const b in this.selectedParent) {
        const getParent = parseInt(b.split('_')[1])
        const getChecker = parseInt(this.selectedParent[b])
        if (getChecker > 0) {
          if (this.selectedPage.indexOf(getParent) < 0) {
            this.selectedPage.push(getParent)
          }
        } else {
          delete this.selectedParent[b]
          this.selectedPage.splice(this.selectedPage.indexOf(getParent), 1)
        }
      }
    },
    check_menu (event, target) {
      const children = target.children
      const pageDeleteMode = (this.selectedPage.indexOf(target.data.id) < 0)
      if (children.length > 0) {
        this.check_child(children, pageDeleteMode)
      } else {
        this.check_parent(target.key, pageDeleteMode)
      }
    }
  }
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
