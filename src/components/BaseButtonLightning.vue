<template>
  <q-btn
    v-if="lnString"
    icon="bolt"
    class='button-wallet'
    :class='(!verbose ? "q-pr-xs" : "")'
    clickable
    @click.stop='toggleWalletPicker'
    :label='verbose ? ("open in wallet") : ""'
    align="left"
    :size='size'
    unelevated
    dense
  >
    <q-tooltip v-if="!verbose">
      tip with bitocin lightning network
    </q-tooltip>
    <q-dialog v-model="showWalletPicker">
      <BaseLightningCard :ln-string='lnString' :pubkey='pubkey' style='padding: 1.5rem;'/>
    </q-dialog>
  </q-btn>
</template>

<script>
import { defineComponent, nextTick } from 'vue'
import helpersMixin from '../utils/mixin'
import BaseLightningCard from 'components/BaseLightningCard.vue'

export default defineComponent({
  name: 'BaseButtonLightning',
  mixins: [helpersMixin],
  components: {
    BaseLightningCard
  },

  data() {
    // const {lud06} = this.$store.state.profilesCache[this.pubkey] || {}

    return {
      // lud06: lud06,
      showWalletPicker: false,
    }
  },

  props: {
    lnString: {
      type: String,
      default: null,
    },
    pubkey: {type: String, default: null},
    size: {
      type: String,
      required: false,
      default: 'sm',
    },
    verbose: {
      type: Boolean,
      default: false
    }
  },

  mounted() {
    if (!this.lud06) {
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
    }
  },

  beforeUnmount() {
    if (this.unsubscribe) this.unsubscribe()
  },

  methods: {
    toggleWalletPicker() {
      this.showWalletPicker = !this.showWalletPicker
    },
  }
})
</script>


<style>
.button-wallet {
  opacity: .7;
  transition: all .3s ease-in-out;
}
.button-wallet:hover {
  opacity: 1;
}
</style>
