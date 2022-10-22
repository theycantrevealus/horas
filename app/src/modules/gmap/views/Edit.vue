<template>
  <div>
    <form
      autocomplete="off"
      @submit.prevent="editItem"
    >
      <Card class="card-fluid">
        <template #title>
          <h5>Edit Master Item</h5>
        </template>
        <template #content>
          <TabView
            ref="tabview4"
            class="tabview-custom"
          >
            <TabPanel>
              <template #header>
                <span class="material-icons-outlined">info</span>
                <span>Basic Information</span>
              </template>
              <div class="p-fluid formgrid grid">
                <div class="field col-12 md-4">
                  <label for="itemFormCode">Code</label>
                  <InputText
                    id="itemFormCode"
                    v-model.trim="$v.code.$model"
                    placeholder="xxxxxxxx"
                    type="text"
                  />
                  <Message
                    v-if="$v.code.$errors.length > 0"
                    severity="error"
                    :closable="false"
                  >
                    <div
                      v-for="(error, index) of $v.code.$errors"
                      :key="index"
                      class="error-msg"
                    >{{ error.$message }}</div>
                  </Message>
                </div>
                <div class="field col-12 md-4">
                  <label for="itemFormName">Name</label>
                  <InputText
                    id="itemFormName"
                    v-model.trim="$v.name.$model"
                    placeholder="Item Name"
                    type="text"
                  />
                  <Message
                    v-if="$v.name.$errors.length > 0"
                    severity="error"
                    :closable="false"
                  >
                    <div
                      v-for="(error, index) of $v.name.$errors"
                      :key="index"
                      class="error-msg"
                    >{{ error.$message }}</div>
                  </Message>
                </div>
                <div class="field col-12 md-12">
                  <label for="itemFormRemark">Remark</label>
                  <ckeditor
                    id="itemFormRemark"
                    v-model="$v.remark.$model"
                    :editor="editor"
                    :config="editorConfig"
                  ></ckeditor>
                </div>
              </div>
            </TabPanel>
            <TabPanel>
              <template #header>
                <span class="material-icons-outlined">medication</span>
                <span>Drug Info</span>
              </template>
              <div class="p-fluid formgrid grid chemicalContainer">
                <div class="field col-12 md-8">
                  <Card>
                    <template #title>
                      <Tag severity="info">{{ code }}</Tag>
                      - {{ name }}
                    </template>
                    <template #content>
                      <div class="p-fluid formgrid grid">
                        <div class="field col-12 md-12">
                          <table class="largeDataType">
                            <tbody>
                              <tr>
                                <td style="width: 40%;">CAS Register No.</td>
                                <td class="wrap_content">:</td>
                                <td>{{ drugData.cas_reg_no }}</td>
                              </tr>
                              <tr>
                                <td>Formula</td>
                                <td class="wrap_content">:</td>
                                <td>{{ drugData.cd_formula }}</td>
                              </tr>
                              <tr>
                                <td>cLogP</td>
                                <td class="wrap_content">:</td>
                                <td>{{ drugData.clogp }}</td>
                              </tr>
                              <tr>
                                <td>aLogS</td>
                                <td class="wrap_content">:</td>
                                <td>{{ drugData.alogs }}</td>
                              </tr>
                              <tr>
                                <td>
                                  TPSA
                                  <br />Topological Polar Surface Area
                                </td>
                                <td class="wrap_content">:</td>
                                <td>{{ drugData.alogs }}</td>
                              </tr>
                              <tr>
                                <td>InChI Key</td>
                                <td class="wrap_content">:</td>
                                <td>{{ drugData.inchikey }}</td>
                              </tr>
                              <tr>
                                <td>Lipinski</td>
                                <td class="wrap_content">:</td>
                                <td>{{ drugData.lipinski }}</td>
                              </tr>
                              <tr>
                                <td>MRDef</td>
                                <td class="wrap_content">:</td>
                                <td>{{ drugData.mrdef }}</td>
                              </tr>
                              <tr>
                                <td>Status</td>
                                <td class="wrap_content">:</td>
                                <td>{{ drugData.status }}</td>
                              </tr>
                              <tr>
                                <td>Molecule Weight</td>
                                <td class="wrap_content">:</td>
                                <td>{{ drugData.molweight }}</td>
                              </tr>
                              <tr>
                                <td>Active Moiety UNII</td>
                                <td class="wrap_content">:</td>
                                <td>{{ ingredientData.active_moiety_unii }} - {{ ingredientData.active_moiety_name }}</td>
                              </tr>
                              <tr>
                                <td>Substance UNII</td>
                                <td class="wrap_content">:</td>
                                <td>{{ ingredientData.substance_unii }} - {{ ingredientData.substance_name }}</td>
                              </tr>
                              <tr>
                                <td>Unit</td>
                                <td class="wrap_content">:</td>
                                <td>{{ ingredientData.unit }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </template>
                  </Card>
                </div>
                <div class="field col-12 md-4">
                  <div
                    id="chemViewer"
                    class="chemicalViewer"
                    data-widget="Kekule.ChemWidget.Viewer"
                  >
                    <h5>Molecular View</h5>
                  </div>
                </div>
                <div class="field col-12 md-12">
                  <TabView
                    ref="tabviewDrugDetail"
                    class="tabview-custom"
                  >
                    <TabPanel>
                      <template #header>
                        <span class="material-icons-outlined">science</span>
                        <span>OMOP</span>
                      </template>
                      <DataTable
                        :value="drugData.omop"
                        :paginator="true"
                        :rows="10"
                        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                        :rowsPerPageOptions="[10, 20, 50]"
                        responsiveLayout="scroll"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                      >
                        <Column
                          field="relationship_name"
                          header="Relationship"
                        ></Column>
                        <Column
                          field="umls_cui"
                          header="UMLS-CUI"
                        ></Column>
                        <Column
                          field="snomed_full_name"
                          header="Snomed Full Name"
                        ></Column>
                        <Column
                          field="cui_semantic_type"
                          header="CUI Semantic Type"
                        ></Column>
                        <template #paginatorstart>
                          <Button
                            type="button"
                            icon="pi pi-refresh"
                            class="button-text"
                          />
                        </template>
                        <template #paginatorend>
                          <Button
                            type="button"
                            icon="pi pi-cloud"
                            class="button-text"
                          />
                        </template>
                      </DataTable>
                    </TabPanel>
                    <TabPanel>
                      <template #header>
                        <span class="material-icons-outlined">science</span>
                        <span>Protein Data Bank</span>
                      </template>
                      <DataTable
                        :value="drugData.pdb"
                        :paginator="true"
                        :rows="10"
                        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                        :rowsPerPageOptions="[10, 20, 50]"
                        responsiveLayout="scroll"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                      >
                        <Column
                          field="pdb"
                          header="PDB"
                        ></Column>
                        <Column
                          field="chain_id"
                          header="Chain"
                        ></Column>
                        <Column
                          field="accession"
                          header="Accession"
                        ></Column>
                        <Column
                          field="title"
                          header="Title"
                        ></Column>
                        <Column
                          field="exp_method"
                          header="Exp Method"
                        ></Column>
                        <Column
                          field="deposition_date"
                          header="Deposition Date"
                        ></Column>
                        <template #paginatorstart>
                          <Button
                            type="button"
                            icon="pi pi-refresh"
                            class="button-text"
                          />
                        </template>
                        <template #paginatorend>
                          <Button
                            type="button"
                            icon="pi pi-cloud"
                            class="button-text"
                          />
                        </template>
                      </DataTable>
                    </TabPanel>
                    <TabPanel>
                      <template #header>
                        <span class="material-icons-outlined">science</span>
                        <span>Pharma Class</span>
                      </template>
                      <DataTable
                        :value="drugData.pharma_class"
                        :paginator="true"
                        :rows="10"
                        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                        :rowsPerPageOptions="[10, 20, 50]"
                        responsiveLayout="scroll"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                      >
                        <Column
                          field="type"
                          header="Type"
                        ></Column>
                        <Column
                          field="class_code"
                          header="Code"
                        ></Column>
                        <Column
                          field="name"
                          header="Name"
                        ></Column>
                        <Column
                          field="source"
                          header="Source"
                        ></Column>
                        <template #paginatorstart>
                          <Button
                            type="button"
                            icon="pi pi-refresh"
                            class="button-text"
                          />
                        </template>
                        <template #paginatorend>
                          <Button
                            type="button"
                            icon="pi pi-cloud"
                            class="button-text"
                          />
                        </template>
                      </DataTable>
                    </TabPanel>
                    <TabPanel>
                      <template #header>
                        <span class="material-icons-outlined">science</span>
                        <span>
                          pK
                          <sub>a</sub>
                        </span>
                      </template>
                      <DataTable
                        :value="drugData.pka"
                        :paginator="true"
                        :rows="10"
                        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                        :rowsPerPageOptions="[10, 20, 50]"
                        responsiveLayout="scroll"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                      >
                        <Column
                          field="pka_level"
                          header="Level"
                        ></Column>
                        <Column
                          field="value"
                          header="Value"
                        ></Column>
                        <Column
                          field="pka_type"
                          header="Type"
                        ></Column>
                        <template #paginatorstart>
                          <Button
                            type="button"
                            icon="pi pi-refresh"
                            class="button-text"
                          />
                        </template>
                        <template #paginatorend>
                          <Button
                            type="button"
                            icon="pi pi-cloud"
                            class="button-text"
                          />
                        </template>
                      </DataTable>
                    </TabPanel>
                    <TabPanel>
                      <template #header>
                        <span class="material-icons-outlined">science</span>
                        <span>Identifier</span>
                      </template>
                      <DataTable
                        :value="drugData.identifier"
                        :paginator="true"
                        :rows="10"
                        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                        :rowsPerPageOptions="[10, 20, 50]"
                        responsiveLayout="scroll"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                      >
                        <Column
                          field="identifier"
                          header="Identifier"
                        ></Column>
                        <Column
                          field="id_type"
                          header="Type"
                        ></Column>
                        <Column
                          field="parent_match"
                          header="Parent Match"
                        ></Column>
                        <template #paginatorstart>
                          <Button
                            type="button"
                            icon="pi pi-refresh"
                            class="button-text"
                          />
                        </template>
                        <template #paginatorend>
                          <Button
                            type="button"
                            icon="pi pi-cloud"
                            class="button-text"
                          />
                        </template>
                      </DataTable>
                    </TabPanel>
                  </TabView>
                </div>
              </div>
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
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Message from 'primevue/message'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor'
import Alignment from '@ckeditor/ckeditor5-alignment/src/alignment'

import EssentialsPlugin from '@ckeditor/ckeditor5-essentials/src/essentials'
import BoldPlugin from '@ckeditor/ckeditor5-basic-styles/src/bold'
import ItalicPlugin from '@ckeditor/ckeditor5-basic-styles/src/italic'
import LinkPlugin from '@ckeditor/ckeditor5-link/src/link'
import ParagraphPlugin from '@ckeditor/ckeditor5-paragraph/src/paragraph'

import useVuelidate from '@vuelidate/core'
import { required, minLength } from '@vuelidate/validators'
import UserService from '@/modules/user/service'
import { Kekule } from 'kekule'
import MasterItemService from '@/modules/master_item/service'

export default {
  name: 'MasterItemEdit',
  components: {
    Card,
    Toolbar,
    Button,
    InputText,
    TabView,
    TabPanel,
    Message,
    Tag,
    DataTable,
    Column,
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
      code: '',
      name: '',
      remark: '',
      drugData: {},
      ingredientData: {},
      roleGranted: [],
      response: {
        type: 'errors',
        message: '',
      },
      editor: ClassicEditor,
      editorData: '', // HTML Format String
      editorConfig: {
        plugins: [
          EssentialsPlugin,
          BoldPlugin,
          ItalicPlugin,
          LinkPlugin,
          ParagraphPlugin,
          Alignment,
        ],

        toolbar: {
          items: ['bold', 'italic', 'link', 'undo', 'redo', 'alignment'],
        },
      },
    }
  },
  computed: {
    permission() {
      return this.$store.state.credential.permission
    },
  },
  validations: {
    code: {
      required,
    },
    name: {
      required,
      minLength: minLength(4),
    },
    remark: {},
  },
  mounted() {
    MasterItemService.getItemDetail(this.$route.params.id).then((response) => {
      const data = response.response_data[0]

      this.code = data.code
      this.name = data.name
      this.remark = data.remark

      this.ingredientData = data.drug.ingredient[0]
      this.drugData = this.ingredientData.structures[0]

      const chemViewer = new Kekule.ChemWidget.Viewer(
        document.getElementById('chemViewer')
      )
      const myMolecule = Kekule.IO.loadFormatData(this.drugData.molfile, 'mol')
      chemViewer
        .setEnableToolbar(true)
        .setEnableDirectInteraction(true)
        .setToolButtons(['saveData', 'zoomIn', 'zoomOut'])
        .setChemObj(myMolecule)
    })
  },
  methods: {
    setBackGroundGroup(grouper) {
      return `color: ${this.permissionGroupColor[grouper]}`
    },
    backToUser() {
      this.$router.push('/master/item')
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
