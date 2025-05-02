<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="grid">
    <div class="col-12">
      <Card class="slim">
        <template #header>
          <Panel :toggleable="false">
            <template #header>
              <p class="font-bold text-2xl w-10">Account Add</p>
              <p class="text-blue-600">Doc Ver. 0</p>
            </template>
            <template #icons>
              <Button
                class="p-button-secondary p-button-rounded p-button-raised button-sm"
                @click="backAccount"
                ><span class="material-icons">arrow_back</span> Back</Button
              >
            </template>
          </Panel>
        </template>
        <template #content>
          <div class="grid">
            <div class="col-8 form-mode">
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  &nbsp;
                  <small>{{ $t('account.input.code.caption') }}</small>
                </span>
                <InputText
                  class="inputtext-sm"
                  v-model="code"
                  :placeholder="$t('account.input.code.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  &nbsp;
                  <small>{{ $t('account.input.name.caption') }}</small>
                </span>
                <InputText
                  class="inputtext-sm"
                  v-model="first_name"
                  :placeholder="$t('account.input.first_name.placeholder')"
                />
                <InputText
                  class="inputtext-sm"
                  v-model="last_name"
                  :placeholder="$t('account.input.last_name.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  &nbsp;
                  <small>{{ $t('account.input.password.caption') }}</small>
                </span>
                <Password
                  class="inputtext-sm"
                  v-model="password"
                  :placeholder="$t('account.input.password.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  &nbsp;
                  <small>{{ $t('account.input.email.caption') }}</small>
                </span>
                <InputText
                  class="inputtext-sm"
                  v-model="email"
                  :placeholder="$t('account.input.email.placeholder')"
                />
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">
                  &nbsp;
                  <small>{{ $t('account.input.phone.caption') }}</small>
                </span>
                <InputText
                  class="inputtext-sm"
                  v-model="phone"
                  :placeholder="$t('account.input.phone.placeholder')"
                />
              </div>
            </div>
            <div class="col-12">
              <TreeTable
                v-model:expandedKeys="expandedKeys"
                class="treetable-sm"
                filter-mode="strict"
                :expanded="true"
                :value="nodes"
                :paginator="true"
                :rows="20"
                :filters="filtersNode"
              >
                <Column
                  field="label"
                  :header="$t('account.datatable.column.label.caption')"
                  :expander="true"
                >
                  <template #filter>
                    <InputText
                      v-model="filtersNode.label"
                      type="text"
                      class="column-filter"
                      :placeholder="$t('account.datatable.column.label.placeholder')"
                    />
                  </template>
                  <template #body="slotProps">
                    <Chip class="py-0 pl-0 pr-3">
                      <span
                        class="bg-cyan-300 text-white border-circle w-2rem h-2rem flex align-items-center justify-content-center"
                      >
                        <span class="material-icons-outlined material-symbols-outlined">{{
                          slotProps.node.data.icon === ''
                            ? 'account_tree'
                            : slotProps.node.data.icon
                        }}</span>
                      </span>
                      <span class="ml-2 font-medium">{{ slotProps.node.data.label }}</span>
                    </Chip>
                  </template>
                </Column>
                <Column :header-style="{ width: 'auto' }" :body-style="{ 'text-align': 'center' }">
                  <template #header>{{ $t('account.datatable.column.access.caption') }}</template>
                  <template #body="slotProps">
                    <div class="card flex justify-center">
                      <div class="flex flex-col gap-4">
                        <div
                          class="flex items-center gap-2"
                          v-for="access of slotProps.node.data.access"
                          :key="access"
                        >
                          <Checkbox
                            :inputId="access.domIdentity"
                            v-model="selectedAccess"
                            :name="access.dispatchName"
                            :value="{
                              menu: {
                                id: slotProps.node.data.id,
                                name: slotProps.node.data.label,
                                url: slotProps.node.data.to,
                                identifier: slotProps.node.data.identifier,
                              },
                              access: access,
                            }"
                          />
                          <label :for="access.domIdentity">{{ access.dispatchName }}</label>
                        </div>
                      </div>
                    </div>
                  </template>
                </Column>
              </TreeTable>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex flex-row-reverse p-6">
            <Button
              class="p-button-success p-button-rounded p-button-raised button-sm m-2"
              label="Save"
              v-on:click="updateData($event, false)"
            />
            <Button
              class="p-button-secondary p-button-rounded p-button-raised button-sm m-2"
              label="Cancel"
              v-on:click="backAccount"
            />
          </div>
        </template>
      </Card>
      <ConfirmPopup group="confirm_add"></ConfirmPopup>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { storeCore } from '@/store/index'
import { storeMenu } from '@/modules/core/menu/store'
import { storeAccount } from '../store'
import { mapStores, mapActions } from 'pinia'
import type { AccountAdd } from '../interfaces'
export default defineComponent({
  name: 'CoreAccountAdd',
  data() {
    return {
      loading: false,
      id: '',
      code: '',
      stock_point: [],
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      v: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectedAccess: [] as any[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expandedKeys: {} as any,
      selectedNode: {},
      filtersNode: {
        label: '',
      },
      nodes: [],
    }
  },
  computed: {
    ...mapStores(storeMenu),
    ...mapStores(storeAccount),
  },
  async mounted() {
    this.loadData()
  },
  methods: {
    ...mapActions(storeCore, ['allowDispatch', 'UIToggleEditingData']),
    backAccount() {
      this.$router.push({
        path: `/core/account`,
      })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expandAll(children: any) {
      for (const a in children) {
        if (!this.expandedKeys[children[a].key]) {
          this.expandedKeys[children[a].key] = true
        }
        if (children[a].children.length > 0) {
          this.expandAll(children[a].children)
        }
      }
    },
    // onNodeAdd(target: any, mode: string) {},
    // onNodeEdit(target: any, mode: string) {},
    // onNodeDelete(event, target: number) {},
    async loadData() {
      this.nodes = await this.menuStore.tree({})
      this.expandAll(this.nodes)
    },
    async updateData(event: MouseEvent, stay: boolean = false) {
      this.$confirm.require({
        group: 'confirm_add',
        header: 'Create Confirmation',
        target: event.currentTarget as HTMLElement,
        message: 'Are you sure the data is correct?',
        acceptClass: 'p-button-success',
        rejectClass: 'p-button-secondary',
        acceptLabel: 'Yes!',
        rejectLabel: 'Ok. I will check it again.',
        accept: async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const menuBuilder: any[] = []
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let result: any = {}
          this.selectedAccess.map((item) => {
            result = menuBuilder.find((obj) => obj.id === item.menu.id)
            if (!result) {
              menuBuilder.push({
                id: item.menu.id,
                name: item.menu.name,
                url: item.menu.url,
                identifier: item.menu.identifier,
                access: [],
              })
            }
            result = menuBuilder.find((obj) => obj.id === item.menu.id)
            result.access.push(item.access)
          })

          const payload: AccountAdd = {
            code: this.code,
            first_name: this.first_name,
            last_name: this.last_name,
            password: this.password,
            email: this.email,
            phone: this.phone,
            menu: menuBuilder,
            stock_point: this.stock_point,
          }

          await this.accountStore.add(payload).then(async () => {
            if (stay) {
              await this.loadData()
            } else {
              this.backAccount()
            }
          })
        },
        reject: () => {
          // callback to execute when user rejects the action
        },
      })
    },
  },
})
</script>
