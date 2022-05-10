<template>
  <div class="p-grid">
    <div class="p-col-12">
      <Card>
        <template #title>Edit Account</template>
        <template #content>
          <div class="p-grid">
            <div class="p-col-4">
              <div class="profile-display">
                <img :src="formData.image" />
              </div><Button class="p-button p-button-info p-button-sm p-button-raised" label="Avatar"
                icon="pi pi-external-link" @click="toggleEditImageWindow" />
            </div>
            <div class="p-col-8 form-mode">
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined">mail</span>
                </span>
                <!-- <InputText class="p-inputtext-sm" @input="updateAccount($event.target.value)" v-model="accountDetail.email"
                  placeholder="Email" /> -->
                <InputText class="p-inputtext-sm" v-model="formData.email" placeholder="Email" />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined">person</span>
                </span>
                <InputText class="p-inputtext-sm" v-model="formData.first_name" placeholder="First Name" />
                <InputText class="p-inputtext-sm" v-model="formData.last_name" placeholder="Last Name" />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  <span class="material-icons-outlined">supervised_user_circle</span>
                </span>
                <Dropdown v-model="formData.authority" :options="authorityData" optionLabel="name" optionValue="uid"
                  placeholder="Select authority" />
              </div>
              <Button @click="updateAccountData" class="p-button p-button-info p-button-sm p-button-raised">
                <span class="material-icons">fact_check</span> Apply from authority
              </Button>
              <!-- <Button @click="accountEdit(slotProps.data.uid)"
                class="p-button p-button-info p-button-sm p-button-raised">
                <span class="material-icons">fact_check</span> Apply from authority
              </Button> -->
            </div>
            <div class="p-col-12">
              <h4>Permission List</h4>
              <TreeTable v-if="formData.menuTree" class="p-treetable-sm p-datatable-table vert-top" filterMode="strict"
                :value="formData.menuTree" :lazy="true" :paginator="true" :rows="20" :filters="filtersNode">
                <Column field="label" header="Label" :expander="true">
                  <template #filter>
                    <InputText type="text" v-model="filtersNode.label.value" class="p-column-filter"
                      placeholder="Filter by label" />
                  </template>
                  <template #body="slotProps">
                    <Checkbox @change="check_menu($event, slotProps.node)" name="menus" :value="slotProps.node.data.id"
                      v-model="selectedPage" /> {{ slotProps.node.data.label }}
                  </template>
                </Column>
                <Column field="to" header="Link">
                  <template #filter>
                    <InputText type="text" v-model="filtersNode.to.value" class="p-column-filter"
                      placeholder="Filter by link" />
                  </template>
                </Column>
                <Column field="to" header="Link">
                  <template #body="slotProps">
                    <div v-if="slotProps.node.data.permission !== undefined">
                      <div class="checkbox-custom" v-for="indexPerm in slotProps.node.data.permission" :key="indexPerm">
                        <Checkbox @change="set_permission($event, indexPerm.id)" name="perms" :value="indexPerm.id"
                          v-model="selectedPerm" />
                        {{
                            indexPerm.domiden
                        }}
                      </div>
                    </div>
                  </template>
                </Column>
              </TreeTable>
            </div>
            <div class="p-col-12">
              <div class="p-d-flex p-jc-between">
                <div>
                  <Button @click="back()" type="button" class="p-button-raised p-button-sm p-button-danger px-3">
                    <span class="material-icons-outlined">arrow_back</span> Back
                  </Button>
                </div>
                <div v-if="allowSave === true">
                  <Button type="button" class="p-button-raised p-button-sm p-button-info px-3"
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
    <Dialog header="Avatar Editor" v-model:visible="displayEditorImage" :style="{ width: '50vw' }" :modal="true">
      <p class="m-0">
        <Cropper @cropImage="setImageData" />
      </p>
      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="toggleEditImageWindow" class="p-button-text" />
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
import Cropper from '@/components/Cropper.vue'
import { getCurrentTimestamp } from '@/util/time'

import { mapActions, mapGetters, mapState } from 'vuex'
export default {
  name: 'AccountEdit',
  components: {
    Card, InputText, Button, Dropdown, ConfirmPopup, Checkbox, TreeTable, Column, Cropper, Dialog
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
        menuTree: []
      },
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
  mounted () {
    this.allowSave = false
    // this.$store.dispatch('accountModule/fetchMenu')
    this.$store.dispatch('accountModule/fetchAccountDetail', this.$route.query.uid)
    this.$store.dispatch('accountModule/fetchMenuTree')
    this.$store.dispatch('accountModule/fetchAuthority')
    this.displayEditorImage = false
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

          this.setImageData(`${process.env.VUE_APP_APIGATEWAY}avatar/${getDetail.account.uid}.png?d=${Date.now()}`)

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
  methods: {
    ...mapActions('accountModule', ['updateAccount', 'updatePermission', 'updateAccess']),
    back () {
      this.$router.push('/account')
    },
    setImageData (value) {
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
            // // Update Access and Permission if exists
            for (const a in this.selectedMenu) {
              this.updateAccess({
                account: this.$route.query.uid,
                menu: this.selectedMenu[a]
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
              acceptClass: 'p-button-success',
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
