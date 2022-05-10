<template>
  <div>
    <input ref="input" type="file" name="image" accept="image/*" @change="setImage" />
    {{ $root.formData }}
    <div class="content">
      <section class="cropper-area">
        <div class="img-cropper">
          <vue-cropper ref="cropper" :aspect-ratio="1 / 1" :src="imgSrc" preview=".preview" />
        </div>
        <div class="actions">
          <a href="#" class="p-button p-button-info p-button-sm p-button-raised" role="button"
            @click.prevent="showFileChooser">
            <span class="material-icons">
              file_upload
            </span>
          </a>
          <a v-if="imgSrc !== null" href="#" class="p-button p-button-warning p-button-sm p-button-raised" role="button"
            @click.prevent="reset">
            <span class="material-icons">
              restart_alt
            </span>
          </a>
          <a v-if="imgSrc !== null" href="#" class="p-button p-button-success p-button-sm p-button-raised" role="button"
            @click.prevent="cropImage">
            <span class="material-icons">
              done
            </span>
          </a>
          <div v-if="imgSrc !== null">
            <a href="#" class="p-button p-button-info p-button-sm p-button-raised" role="button"
              @click.prevent="zoom(0.2)">
              <span class="material-icons">
                zoom_in
              </span>
            </a>
            <a href="#" class="p-button p-button-info p-button-sm p-button-raised" role="button"
              @click.prevent="zoom(-0.2)">
              <span class="material-icons">
                zoom_out
              </span>
            </a>
            <a href="#" class="p-button p-button-info p-button-sm p-button-raised" role="button"
              @click.prevent="rotate(90)">
              <span class="material-icons">
                rotate_90_degrees_cw
              </span>
            </a>
            <a href="#" class="p-button p-button-info p-button-sm p-button-raised" role="button"
              @click.prevent="rotate(-90)">
              <span class="material-icons">
                rotate_90_degrees_ccw
              </span>
            </a>
            <a ref="flipX" class="p-button p-button-info p-button-sm p-button-raised" href="#" role="button"
              @click.prevent="flipX">
              <span class="material-icons">
                flip
              </span>
            </a>
            <a ref="flipY" class="p-button p-button-info p-button-sm p-button-raised" href="#" role="button"
              @click.prevent="flipY">
              <span class="material-icons" style="transform: rotate(90deg);">
                flip
              </span>
            </a>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import VueCropper from 'vue-cropperjs'
import 'cropperjs/dist/cropper.css'
export default {
  components: {
    VueCropper
  },
  data () {
    return {
      imgSrc: null,
      cropImg: '',
      data: null
    }
  },
  props: {
    imageData: String
  },
  methods: {
    cropImage () {
      this.cropImg = this.$refs.cropper.getCroppedCanvas().toDataURL()
      this.$emit('cropImage', this.cropImg)
    },
    flipX () {
      const dom = this.$refs.flipX
      let scale = dom.getAttribute('data-scale')
      scale = scale ? -scale : -1
      this.$refs.cropper.scaleX(scale)
      dom.setAttribute('data-scale', scale)
    },
    flipY () {
      const dom = this.$refs.flipY
      let scale = dom.getAttribute('data-scale')
      scale = scale ? -scale : -1
      this.$refs.cropper.scaleY(scale)
      dom.setAttribute('data-scale', scale)
    },
    getCropBoxData () {
      this.data = JSON.stringify(this.$refs.cropper.getCropBoxData(), null, 4)
    },
    getData () {
      this.data = JSON.stringify(this.$refs.cropper.getData(), null, 4)
    },
    move (offsetX, offsetY) {
      this.$refs.cropper.move(offsetX, offsetY)
    },
    reset () {
      this.$refs.cropper.reset()
    },
    rotate (deg) {
      this.$refs.cropper.rotate(deg)
    },
    setCropBoxData () {
      if (!this.data) return
      this.$refs.cropper.setCropBoxData(JSON.parse(this.data))
    },
    setData () {
      if (!this.data) return
      this.$refs.cropper.setData(JSON.parse(this.data))
    },
    setImage (e) {
      const file = e.target.files[0]
      if (file.type.indexOf('image/') === -1) {
        alert('Please select an image file')
        return
      }
      if (typeof FileReader === 'function') {
        const reader = new FileReader()
        reader.onload = (event) => {
          this.imgSrc = event.target.result
          // rebuild cropperjs with the updated source
          this.$refs.cropper.replace(event.target.result)
        }
        reader.readAsDataURL(file)
      } else {
        alert('Sorry, FileReader API not supported')
      }
    },
    showFileChooser () {
      this.$refs.input.click()
    },
    zoom (percent) {
      this.$refs.cropper.relativeZoom(percent)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
body {
  font-family: Arial, Helvetica, sans-serif;
  width: 1024px;
  margin: 0 auto
}

input[type="file"] {
  display: none
}

.img-cropper {
  min-height: 200px;
  border: dashed 2px #ccc;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0 5px 0
}

.header h2 {
  margin: 0
}

.header a {
  text-decoration: none;
  color: black
}

.content {
  display: flex;
  justify-content: space-between
}

.cropper-area {
  width: 100%
}

.actions {
  text-align: center;
  margin-top: 1rem
}

.actions a {
  display: inline-block;
  padding: 5px 15px;
  background: #0062CC;
  color: white;
  text-decoration: none;
  border-radius: 3px;
  margin-right: 1rem;
  margin-bottom: 1rem
}

textarea {
  width: 100%;
  height: 100px
}

.preview-area {
  width: 307px
}

.preview-area p {
  font-size: 1.25rem;
  margin: 0;
  margin-bottom: 1rem
}

.preview-area p:last-of-type {
  margin-top: 1rem
}

.preview {
  width: 100%;
  height: calc(372px * (9 / 16));
  overflow: hidden
}

.crop-placeholder {
  width: 100%;
  height: 200px;
  background: #ccc
}

.cropped-image img {
  max-width: 100%
}
</style>
