<template>
  <div>
    <Card class="card-fluid">
      <template #content>
        <Panel
          header="Application Configuration"
          :toggleable="false"
        >
          <template #icons>
            <Toolbar>
              <template #start>
                <Button
                  label="Save"
                  icon="pi pi-check"
                  class="p-button-success p-button-rounded p-button-raised button-sm mr-2"
                  @click="updateConfiguration"
                />
                &nbsp;
              </template>
              <template #end>
                <Button
                  label="Reset"
                  icon="pi pi-sync"
                  class="p-button-info p-button-rounded p-button-raised button-sm mr-2"
                  @click="resetConfiguration($event)"
                />
              </template>
            </Toolbar>
          </template>
          <div class="grid">
            <div class="col-2">
              <div class="card-fluid">
                <Tree v-model:selectionKeys="selectedKey" :value="nodes" selectionMode="single" :expandedKeys="expandedKeys" @nodeSelect="onNodeSelect"></Tree>
              </div>
            </div>
            <div class="col-10">
              <Card class="slim">
                <template #content>
                  <Panel
                    :header="selectedSection || 'Profile'"
                    :toggleable="false"
                  >
                    <template #icons>
                      <Toolbar>
                        <template #start></template>
                        <template #end></template>
                      </Toolbar>
                    </template>
                  </Panel>
                  <div v-for="(item, i) of activeData" :key="i" class="grid">
                    <div class="flex flex-column gap-2 col-12">
                      <label for="code">{{ item.label }}</label>
                      <InputText
                        v-if="(typeof item.setter === 'string')"
                        id="code"
                        v-model="activeData[i].setter"
                        class="p-inputtext-sm"
                        placeholder="Code"
                      />
                      <JsonEditorVue
                        v-if="!(typeof item.setter === 'string')"
                        v-model="activeData[i].setter"
                      />
                      <br />
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>
        </Panel>
      </template>
      <template #footer></template>
    </Card>
    <ConfirmPopup></ConfirmPopup>
    <Toast />
  </div>
</template>
<script>
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import ConfirmPopup from 'primevue/confirmpopup'
import Tree from 'primevue/tree'
import InputText from 'primevue/inputtext'
import JsonEditorVue from 'json-editor-vue'
import ApplicationConfiguration from "@/modules/setting/configuration/service"
export default {
  components: {
    Card,
    Panel,
    Toolbar,
    Button,
    Toast,
    Tree,
    InputText,
    ConfirmPopup,
    JsonEditorVue,
  },
  data() {
    return {
      nodes: [],
      data: [],
      activeData: [],
      selectedKey: {
        '0-0': true
      },
      dataSet: {},
      expandedKeys: {},
      selectedSection: ''
    }
  },
  async mounted() {
    await this.reloadConfiguration()
  },
  methods: {
    async updateConfiguration() {
      if(this.data.length > 0) {
        await ApplicationConfiguration.updateConfiguration(this.data).then((response) => {
          this.$toast.add({
            severity: (response.statusCode === 'CFG_U_S0000') ? 'success' : 'warn',
            summary: 'Configuration',
            detail: response.message,
            life: 3000,
          })
        })
      }
    },
    onNodeSelect(node) {
      if(node.key.split('-').length > 1) {


        this.activeData = node.fields

        this.activeData.map((e) => {
          if(this.data.indexOf(e) < 0) {
            this.data.push(e)
          } else {
            this.data[this.data.indexOf(e)] = e
          }
        })

        this.selectedSection = node.label
      }
    },
    expandNode(node) {
      if (node.children && node.children.length) {
        this.expandedKeys[node.key] = true;

        for (let child of node.children) {
          this.expandNode(child);
        }
      }
    },
    async resetConfiguration(event) {
      const target = event.target
      const confirmation = this.$confirm
      confirmation.require({
        target: target,
        message: `Reset? All configured data will be lost`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'button-success',
        acceptIcon: 'pi pi-check-circle',
        acceptLabel: 'Yes',
        rejectLabel: 'Abort',
        rejectIcon: 'pi pi-times-circle',
        accept: async () => {
          await this.reloadConfiguration()
        }
      })
    },
    async reloadConfiguration() {
      ApplicationConfiguration.getApplicationConfig().then((response) => {
        this.nodes = response

        this.activeData = response[0].children[0].fields

        for (let node of this.nodes) {
          this.expandNode(node);
        }

        this.expandedKeys = { ...this.expandedKeys };
      })
    },
  },
}
</script>
