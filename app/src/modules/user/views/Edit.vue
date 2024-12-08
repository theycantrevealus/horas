<template>
  <div>
    <form
      autocomplete="off"
      @submit.prevent="editUser"
    >
      <Card class="card-fluid">
        <template #title>
          <h5>Edit User</h5>
        </template>
        <template #content>
          <TabView
            ref="tabview4"
            class="tabview-custom"
          >
            <TabPanel>
              <template #header>
                <span class="material-icons-outlined material-symbols-outlined">account_circle</span>
                <span>Basic Information</span>
              </template>
              <div class="p-fluid formgrid grid">
                <div class="field col-12 md-4">
                  <label for="userFormEmail">Email</label>
                  <InputText
                    id="userFormEmail"
                    v-model.trim="$v.email.$model"
                    placeholder="example@domain.com"
                    type="text"
                  />
                  <Message
                    v-if="$v.email.$errors.length > 0"
                    severity="error"
                    :closable="false"
                  >
                    <div
                      v-for="(error, index) of $v.email.$errors"
                      :key="index"
                      class="error-msg"
                    >{{ error.$message }}</div>
                  </Message>
                </div>
                <div class="field col-12 md-4">
                  <label for="userFormFirstName">Firstname</label>
                  <InputText
                    id="userFormFirstName"
                    v-model.trim="$v.first_name.$model"
                    placeholder="Jhonny"
                    type="text"
                  />
                  <Message
                    v-if="$v.first_name.$errors.length > 0"
                    severity="error"
                    :closable="false"
                  >
                    <div
                      v-for="(error, index) of $v.first_name.$errors"
                      :key="index"
                      class="error-msg"
                    >{{ error.$message }}</div>
                  </Message>
                </div>
                <div class="field col-12 md-4">
                  <label for="userFormLastName">Lastname</label>
                  <InputText
                    id="userFormLastName"
                    v-model.trim="$v.last_name.$model"
                    placeholder="Sins"
                    type="text"
                  />
                  <Message
                    v-if="$v.last_name.$errors.length > 0"
                    severity="error"
                    :closable="false"
                  >
                    <div
                      v-for="(error, index) of $v.last_name.$errors"
                      :key="index"
                      class="error-msg"
                    >{{ error.$message }}</div>
                  </Message>
                </div>
                <div class="field col-12">
                  <label for="userFormAddress">Address</label>
                  <Textarea
                    id="userFormAddress"
                    v-model.trim="$v.address.$model"
                    placeholder="4th Avenue"
                    rows="4"
                  />
                </div>
                <div class="field col-12 md-6">
                  <label for="userFormContact">Contact</label>
                  <InputText
                    id="userFormContact"
                    v-model.trim="$v.contact.$model"
                    placeholder="000-00000"
                    type="text"
                  />
                </div>
              </div>
            </TabPanel>
            <TabPanel v-if="permission.tabManageRolePerm !== undefined">
              <template
                v-if="permission.tabManageRolePerm !== undefined"
                #header
              >
                <span class="material-icons-outlined material-symbols-outlined">vpn_key</span>
                <span>Role and Permission</span>
              </template>
              <DataTable
                v-model:expandedRows="expandedRows"
                :value="permissionList"
                data-key="id"
                responsiveLayout="scroll"
              >
                <template #header>All Permission</template>
                <Column
                  :expander="true"
                  headerStyle="width: 3rem"
                />
                <Column
                  field="group"
                  header="Group"
                  sortable
                >
                  <template #body="slotProps">
                    <span :style="setBackGroundGroup(slotProps.data.group.toString().toLowerCase())">{{ slotProps.data.group }}</span>
                  </template>
                </Column>
                <Column
                  field="label"
                  header="Label"
                  sortable
                >
                  <template #body="slotProps">
                    {{ slotProps.data.label }}
                    <Badge
                      v-if="slotProps.data.permission.length > 0"
                      severity="info"
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
                          v-for="perPermission in slotProps.data.permission"
                          :key="perPermission"
                          class="field-checkbox"
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
                v-if="permission.btnUpdateUser !== undefined"
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
// import Checkbox from 'primevue/checkbox'

import { randomColor, randomColorText } from '@/util/color'
import { validateEmail, validateName } from '@/util/string'
import useVuelidate from '@vuelidate/core'
import { required, minLength } from '@vuelidate/validators'
import UserService from '@/modules/user/service'

export default {
  name: 'UserEdit',
  components: {
    Card,
    Toolbar,
    Button,
    InputText,
    Textarea,
    TabView,
    TabPanel,
    Message,
    DataTable,
    Column,
    Badge,
    InputSwitch,
  },
  setup() {
    return { $v: useVuelidate() }
  },
  data() {
    return {
      expandedRows: [],
      permissionList: [],
      permissionGroupColor: {},
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
        message: '',
      },
    }
  },
  computed: {
    permission() {
      return this.$store.state.credential.permission
    },
  },
  validations: {
    email: {
      required,
      name_validation: {
        $validator: validateEmail,
        $message: 'Invalid Email Format',
      },
      minLength: minLength(4),
    },
    first_name: {
      required,
      name_validation: {
        $validator: validateName,
        $message: 'Invalid Name Format',
      },
      minLength: minLength(4),
    },
    last_name: {
      required,
      name_validation: {
        $validator: validateName,
        $message: 'Invalid Name Format',
      },
      minLength: minLength(4),
    },
    address: {},
    contact: {},
  },
  mounted() {
    UserService.getDetail(this.$route.params.id).then((response) => {
      this.email = response.email
      this.first_name = response.first_name
      this.last_name = response.last_name
      this.address = response.address
      this.contact = response.contact
      this.menuList = [response.ungranted, response.granted]
      const allPermission = response.all_permission
      const permissionList = []
      for (const a in allPermission) {
        if (allPermission[a].permission.length > 0) {
          for (const b in allPermission[a].permission) {
            if (
              this.checkedPermission[
                `menu_${allPermission[a].permission[b].id}`
              ] === undefined
            ) {
              this.checkedPermission[
                `menu_${allPermission[a].permission[b].id}`
              ] = false
            }
            this.checkedPermission[
              `menu_${allPermission[a].permission[b].id}`
            ] = false
            permissionList.push(allPermission[a].permission[b])
          }
        }

        if (
          this.permissionGroupColor[allPermission[a].group.toLowerCase()] ===
          undefined
        ) {
          this.permissionGroupColor[allPermission[a].group.toLowerCase()] =
            randomColorText(randomColor(), 0)
        }

        this.permissionList.push(allPermission[a])
      }

      const allRole = response.rolenperm
      for (const c in allRole) {
        this.checkedPermission[`menu_${allRole[c].permission}`] = true
      }
      this.roleGranted = response.rolenperm
    })
  },
  methods: {
    setBackGroundGroup(grouper) {
      return `color: ${this.permissionGroupColor[grouper]}`
    },
    backToUser() {
      this.$router.push('/user/list')
    },
    editUser() {
      UserService.editUser({
        request: 'edit_user',
        email: this.email,
        first_name: this.first_name,
        last_name: this.last_name,
        address: this.address,
        contact: this.contact,
        rolenperm: this.checkedPermission,
        id: this.$route.params.id,
      }).then((response) => {
        var result = response.data.response_package.response_result
        if (result > 0) {
          this.$router.push('/user/list')
        }
      })
    },
  },
}
</script>
