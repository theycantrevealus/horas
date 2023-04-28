<template>
  <div class="grid">
    <div class="col-2">
      <div class="card slim">
        <Tree v-model:selectionKeys="selectedKey" :value="nodes" selectionMode="single" :expandedKeys="expandedKeys" @nodeSelect="onNodeSelect"></Tree>
      </div>
    </div>
    <div class="col">
      <div class="card form-mode">
        <h3>{{ selectedSection || 'Profile' }}</h3>
        <div v-for="(item, i) of data" :key="i" class="grid">
          <div class="flex flex-column gap-2 col-12">
            <label for="code">{{ item.identifier }}</label>
            <InputText
              v-if="(typeof item.value === 'string')"
              id="code"
              v-model="data[i].value"
              class="p-inputtext-sm"
              placeholder="Code"
            />
            <JsonEditorVue
              v-if="!(typeof item.value === 'string')"
              v-model="data[i].value"
            />
            <br />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import Tree from 'primevue/tree'
import InputText from 'primevue/inputtext'
import JsonEditorVue from 'json-editor-vue'
import ApplicationConfiguration from "@/modules/setting/configuration/service"
export default {
  components: {
    Tree,
    InputText,
    JsonEditorVue,
  },
  data() {
    return {
      nodes: [],
      data: [],
      selectedKey: {},
      dataSet: {},
      expandedKeys: {},
      selectedSection: ''
    }
  },
  async mounted() {
    await this.reloadConfiguration()
  },
  methods: {
    onNodeSelect(node) {
      if(node.key.split('-').length > 1) {
        console.log(node)
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
    async reloadConfiguration() {
      ApplicationConfiguration.getApplicationConfig().then((response) => {
        this.nodes = response.tree
        const application = response.config.application
        for(const a in application) {

          this.data.push({
            identifier: `application_${a}`,
            value: application[a],
          })
        }

        // this.data =
        for (let node of this.nodes) {
          this.expandNode(node);
        }

        this.expandedKeys = { ...this.expandedKeys };
      })
    },
  },
}
</script>
