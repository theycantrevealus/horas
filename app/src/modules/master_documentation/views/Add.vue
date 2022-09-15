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
                <div class="field col-12 md-12">
                  <label for="itemFormTitle">Title</label>
                  <InputText
                    id="itemFormTitle"
                    v-model.trim="$v.code.$model"
                    placeholder="Documentation Title"
                    type="text"
                  />
                  <Message
                    v-if="$v.title.$errors.length > 0"
                    severity="error"
                    :closable="false"
                  >
                    <div
                      v-for="(error, index) of $v.title.$errors"
                      :key="index"
                      class="error-msg"
                    >{{ error.$message }}</div>
                  </Message>
                </div>
                <div class="field col-12 md-12">
                  <label for="itemFormContent">Content</label>
                  <ckeditor
                    id="itemFormContent"
                    v-model="$v.content.$model"
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
            </TabPanel>
          </TabView>
        </template>
      </Card>
    </form>
  </div>
</template>
<script>
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Message from 'primevue/message'

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor'
import Alignment from '@ckeditor/ckeditor5-alignment/src/alignment'

import EssentialsPlugin from '@ckeditor/ckeditor5-essentials/src/essentials'
import BoldPlugin from '@ckeditor/ckeditor5-basic-styles/src/bold'
import ItalicPlugin from '@ckeditor/ckeditor5-basic-styles/src/italic'
import LinkPlugin from '@ckeditor/ckeditor5-link/src/link'
import ParagraphPlugin from '@ckeditor/ckeditor5-paragraph/src/paragraph'

import useVuelidate from '@vuelidate/core'
import { required, minLength } from '@vuelidate/validators'

export default {
  name: 'MasterDocumentationEdit',
  components: {
    Card,
    InputText,
    TabView,
    TabPanel,
    Message,
  },
  setup() {
    return { $v: useVuelidate() }
  },
  data() {
    return {
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
  validations: {
    title: {
      required,
    },
    remark: {
      required,
      minLength: minLength(8),
    },
  },
}
</script>
