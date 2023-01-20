<template>
  <div>
  {{url}}
  {{preview}}
  </div>
</template>

<script>
import fetch from 'cross-fetch'

export default {
  name: 'BaseLinkPreview',
  props: {url: {type: String, required: true}},

  data() {
    return {
      preview: '',
    }
  },

  async mounted() {
    let res = await (await fetch(this.url)).json
    console.log('res', res)
    // if (res)
  }
}
</script>

<style lang='css' scoped>
</style>

