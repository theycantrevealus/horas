<template>
  <div>
    <form autocomplete="off" @submit.prevent="addUser">
      <Card class="card-fluid">
        <template #title>
          <h5>Add User</h5>
        </template>
        <template #content>
          <TabView class="tabview-custom" ref="tabview4">
            <TabPanel>
              <template #header>
                <span class="material-icons-outlined">account_circle</span>
                <span>Basic Information</span>
              </template>
              <div class="fluid formgrid grid">
                <div class="field col-12 md-4">
                  <label for="userFormEmail">Email</label>
                  <InputText
                    placeholder="example@domain.com"
                    id="userFormEmail"
                    type="text"
                    v-model.trim="$v.email.$model"
                  />
                  <Message severity="error" v-if="$v.email.$errors.length > 0" :closable="false">
                    <div
                      class="error-msg"
                      v-for="(error, index) of $v.email.$errors"
                      :key="index"
                    >{{ error.$message }}</div>
                  </Message>
                </div>
                <div class="field col-12 md-4">
                  <label for="userFormFirstName">Firstname</label>
                  <InputText
                    placeholder="Jhonny"
                    id="userFormFirstName"
                    type="text"
                    v-model.trim="$v.first_name.$model"
                  />
                  <Message
                    severity="error"
                    v-if="$v.first_name.$errors.length > 0"
                    :closable="false"
                  >
                    <div
                      class="error-msg"
                      v-for="(error, index) of $v.first_name.$errors"
                      :key="index"
                    >{{ error.$message }}</div>
                  </Message>
                </div>
                <div class="field col-12 md-4">
                  <label for="userFormLastName">Lastname</label>
                  <InputText
                    placeholder="Sins"
                    id="userFormLastName"
                    type="text"
                    v-model.trim="$v.last_name.$model"
                  />
                  <Message
                    severity="error"
                    v-if="$v.last_name.$errors.length > 0"
                    :closable="false"
                  >
                    <div
                      class="error-msg"
                      v-for="(error, index) of $v.last_name.$errors"
                      :key="index"
                    >{{ error.$message }}</div>
                  </Message>
                </div>
                <div class="field col-12">
                  <label for="userFormAddress">Address</label>
                  <Textarea
                    v-model.trim="$v.address.$model"
                    id="userFormAddress"
                    placeholder="4th Avenue"
                    rows="4"
                  />
                </div>
                <div class="field col-12 md-6">
                  <label for="userFormContact">Contact</label>
                  <InputText
                    v-model.trim="$v.contact.$model"
                    id="userFormContact"
                    placeholder="000-00000"
                    type="text"
                  />
                </div>
              </div>
            </TabPanel>
            <TabPanel>
              <template #header>
                <span class="material-icons-outlined">vpn_key</span>
                <span>Role and Permission</span>
              </template>
              <DataTable
                :value="permissionList"
                data-key="id"
                responsiveLayout="scroll"
                v-model:expandedRows="expandedRows"
              >
                <template #header>All Permission</template>
                <Column :expander="true" headerStyle="width: 3rem" />
                <Column field="group" header="Group" sortable></Column>
                <Column field="label" header="Label" sortable>
                  <template #body="slotProps">
                    {{ slotProps.data.label }}
                    <Badge
                      severity="info"
                      v-if="slotProps.data.permission.length > 0"
                      :value="slotProps.data.permission.length"
                    ></Badge>
                  </template>
                </Column>
                <template #expansion="slotProps">
                  <div class="grid">
                    <div class="col-2"></div>
                    <div class="col-10">
                      <div v-if="slotProps.data.permission !== undefined">
                        <div
                          class="field-checkbox"
                          v-for="perPermission in slotProps.data.permission"
                          :key="perPermission"
                        >
                          <InputSwitch v-model="checkedPermission[`menu_${perPermission.id}`]" />
                          <label>{{ perPermission.domiden }}</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </DataTable>
            </TabPanel>
          </TabView>
        </template>
        <template #footer>
          <Toolbar>
            <template #left>
              <Button
                id="userFormSubmit"
                label="Cancel"
                icon="pi pi-angle-left"
                class="button-danger button-rounded"
                @click="backToUser"
              />
            </template>

            <template #right>
              <Button
                label="Save"
                type="submit"
                :disabled="$v.$invalid"
                icon="pi pi-save"
                class="mr-2 button-success button-rounded"
              />
            </template>
          </Toolbar>
        </template>
      </Card>
    </form>
  </div>
</template>
<script>
import Card from 'primevue/card'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Message from 'primevue/message'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Badge from 'primevue/badge'
import InputSwitch from 'primevue/inputswitch'

import { validateEmail, validateName } from '@/util/string'
import useVuelidate from '@vuelidate/core'
import { required, minLength } from '@vuelidate/validators'
import UserService from '@/modules/user/service'
import CoreService from '@/service/core/menu'

export default {
  name: 'UserAdd',
  components: {
    Card, Toolbar, Button, InputText, Textarea, TabView, TabPanel, Message, DataTable, Column, InputSwitch, Badge
  },
  setup () {
    return { $v: useVuelidate() }
  },
  mounted () {
    CoreService.menuPermission().then(response => {
      this.permissionList = response.data.response_package
    })
  },
  data () {
    return {
      expandedRows: [],
      permissionList: [],
      setterFeature: [],
      allItem: {},
      grantedItem: {},
      ungrantedItem: {},
      menuList: [],
      checkedPermission: {},
      email: '',
      first_name: '',
      last_name: '',
      address: '',
      contact: '',
      roleGranted: [],
      response: {
        type: 'errors',
        message: ''
      }
    }
  },
  validations: {
    email: {
      required,
      name_validation: {
        $validator: validateEmail,
        $message: 'Invalid Email Format'
      },
      minLength: minLength(4)
    },
    first_name: {
      required,
      name_validation: {
        $validator: validateName,
        $message: 'Invalid Name Format'
      },
      minLength: minLength(4)
    },
    last_name: {
      required,
      name_validation: {
        $validator: validateName,
        $message: 'Invalid Name Format'
      },
      minLength: minLength(4)
    },
    address: {},
    contact: {}
  },
  methods: {
    backToUser () {
      this.$router.push('/user/list')
    },
    checkPerm (target) {
      if (this.checkedPerm[target] === undefined) {
        this.checkedPerm[target] = {
          value: true,
          disabled: true,
          checked: true
        }
      }
    },
    moveAllItemGranted () {
      for (var a in this.checkedPerm) {
        this.checkedPerm[a].disabled = false
        let id = a.split('_')
        id = id[id.length - 1]
        if (this.grantedItem[`menu_${id}`] === undefined) {
          this.grantedItem[`menu_${id}`] = {
            delete: false,
            edit: false,
            add: false
          }
        }
      }
    },
    removeAllItemGranted () {
      for (var a in this.checkedPerm) {
        this.checkedPerm[a].disabled = true
        let id = a.split('_')
        id = id[id.length - 1]
        delete this.grantedItem[`menu_${id}`]
      }
    },
    moveGranted (event) {
      const selectedData = event.items[0]
      this.checkedPerm[`add_perm_${selectedData.id}`].disabled = false
      this.checkedPerm[`edit_perm_${selectedData.id}`].disabled = false
      this.checkedPerm[`delete_perm_${selectedData.id}`].disabled = false

      if (this.grantedItem[`menu_${selectedData.id}`] === undefined) {
        this.grantedItem[`menu_${selectedData.id}`] = {
          delete: false,
          edit: false,
          add: false
        }
      }
      this.grantedItem[`menu_${selectedData.id}`] = {
        delete: false,
        edit: false,
        add: false
      }
    },
    removeGranted (event) {
      const selectedData = event.items[0]
      this.checkedPerm[`add_perm_${selectedData.id}`].disabled = true
      this.checkedPerm[`edit_perm_${selectedData.id}`].disabled = true
      this.checkedPerm[`delete_perm_${selectedData.id}`].disabled = true

      delete this.grantedItem[`menu_${selectedData.id}`]
    },
    addUser () {
      UserService.addUser({
        request: 'add_user',
        email: this.email,
        first_name: this.first_name,
        last_name: this.last_name,
        address: this.address,
        contact: this.contact,
        rolenperm: this.checkedPermission
      }).then((response) => {
        var result = response.data.response_package.response_result
        if (result > 0) {
          this.$router.push('/user/list')
        }
      })
    }
  }
}
</script>
