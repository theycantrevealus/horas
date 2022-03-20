<template>
    <div>
        <form autocomplete="off" @submit.prevent="editItem">
            <Card class="card-fluid">
                <template #title>
                    <h5>Edit Master Item</h5>
                </template>
                <template #content>
                    <TabView class="tabview-custom" ref="tabview4">
                        <TabPanel>
                            <template #header>
                                <span class="material-icons-outlined">info</span>
                                <span>Basic Information</span>
                            </template>
                            <div class="p-fluid p-formgrid p-grid">
                                <div class="p-field p-col-12 p-md-12">
                                    <label for="itemFormTitle">Title</label>
                                    <InputText
                                        placeholder="Documentation Title"
                                        id="itemFormTitle"
                                        type="text"
                                        v-model.trim="$v.code.$model"
                                    />
                                    <Message
                                        severity="error"
                                        v-if="$v.title.$errors.length > 0"
                                        :closable="false"
                                    >
                                        <div
                                            class="error-msg"
                                            v-for="(error, index) of $v.title.$errors"
                                            :key="index"
                                        >{{ error.$message }}</div>
                                    </Message>
                                </div>
                                <div class="p-field p-col-12 p-md-12">
                                    <label for="itemFormContent">Content</label>
                                    <ckeditor
                                        id="itemFormContent"
                                        :editor="editor"
                                        v-model="$v.content.$model"
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
    Card, InputText, TabView, TabPanel, Message
  },
  setup () {
    return { $v: useVuelidate() }
  },
  data () {
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
          Alignment
        ],

        toolbar: {
          items: [
            'bold',
            'italic',
            'link',
            'undo',
            'redo',
            'alignment'
          ]
        }
      }
    }
  },
  validations: {
    title: {
      required
    },
    remark: {
      required,
      minLength: minLength(8)
    }
  }
}
</script>
