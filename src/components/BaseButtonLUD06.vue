<template>
    <BaseWallet
      :link='lud06' />
</template>

<script>
import { defineComponent, nextTick } from 'vue'
import helpersMixin from '../utils/mixin'
import BaseWallet from 'components/BaseWallet.vue'

export default defineComponent({
  name: 'BaseButtonLUD06',
  mixins: [helpersMixin],
  components: {
    BaseWallet
  },

  data() {
    const {lud06} = this.$store.state.profilesCache[this.pubkey] || {}

    return {
      lud06: lud06,
    }
  },

  props: {
    pubkey: {
      type: String,
      required: true,
      default: null,
    }
  },

  mounted() {
    this.unsubscribe = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'addProfileToCache': {
          const {lud06} = state.profilesCache[this.pubkey] || {}
          nextTick(() => {
            setTimeout(() => {
              if (!this.lud06 && lud06) this.lud06 = lud06
            }, 1)
          })

          break
        }
      }
    })
  },

  beforeUnmount() {
    if (this.unsubscribe) this.unsubscribe()
  }
})
</script>
