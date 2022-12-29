<template>
    <q-btn
      v-if="lud06"
      icon="bolt"
      class='button-tip'
      unelevated
      clickable
      @click='toggleWalletPicker'
      dense
      align="left"
      size='sm'
    >
      <q-tooltip>
        view lnurl
      </q-tooltip>
    </q-btn>

     <q-dialog v-model="showWalletPicker">
      <q-card>
        <q-card-section>
          <div class="text-h6">Select a Wallet</div>
        </q-card-section>

        <q-separator />

        <q-card-section style="max-height: 50vh" class="scroll">
          <q-list bordered separator>

            <div v-for="(wallet, key) in wallets" :key='key'>
              <q-item clickable v-ripple @click='openInWallet(wallet.prefix)'>
                <q-item-section avatar>
                  <q-img
                    :src="'wallet-icons/' + wallet.image"
                    spinner-color="white"
                    style="height: 50px; width: 50px;"
                  />
                </q-item-section>

                <q-item-section>{{wallet.name}}</q-item-section>
              </q-item>
            </div>


          </q-list>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat label="Copy LNURL" color="primary" v-close-popup  @click='copy' />
          <q-btn flat label="Open in Default Wallet" color="primary" v-close-popup @click='openInWallet()' />
        </q-card-actions>
      </q-card>
    </q-dialog>
</template>

<script>
import { defineComponent, nextTick } from 'vue'
import helpersMixin from '../utils/mixin'
import {Notify} from 'quasar'
import { destroyStreams } from '../query'

export default defineComponent({
  name: 'BaseButtonLUD06',
  mixins: [helpersMixin],

  data() {
    const {lud06} = this.$store.state.profilesCache[this.pubkey] || {}

    return {
      lud06: lud06,
      showWalletPicker: false,
      wallets: [
        {
          name: 'Breez',
          prefix: 'breez:',
          image: 'breez.jpg',
        },
        {
          name: 'Phoenix',
          prefix: 'phoenix://',
          image: 'phoenix.jpg',
        },
        {
          name: 'Wallet of Satoshi',
          prefix: 'walletofsatoshi:lightning:',
          image: 'wos.jpg',
        },
        {
          name: 'Zeus LN',
          prefix: 'zeusln:lightning:',
          image: 'zeusln.jpg',
        },
        {
          name: 'Bitcoin Beach',
          prefix: 'bitcoinbeach://',
          image: 'bbw.jpg',
        },
      ],
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
  },

  methods: {
    toggleWalletPicker() {
      this.showWalletPicker = !this.showWalletPicker
    },

    copy() {
      let text = this.lud06
      navigator.clipboard.writeText(text)
      Notify.create({
        message: `copied ${this.lud06.length < 70 ? this.lud06 : this.shorten(this.lud06, 30)}`,
      })
    },

    openInWallet(prefix) {
      // temporarily disable the "leave page?" prompt when user clicks
      window.onbeforeunload = null

      if (!prefix) {
        prefix = 'lightning:'
      }

      window.open(`${prefix}${this.lud06}`, '_self')

      this.toggleWalletPicker()

      // once we have our own link done, re-instate the "leave page?" prompt
      setTimeout(() => {
        // destroy streams before unloading window
        window.onbeforeunload = async () => {
          await destroyStreams()
        }
      }, 500)
    }
  }
})
</script>

<style>
.button-tip {
  opacity: .7;
  transition: all .3s ease-in-out;
}
.button-tip:hover {
  opacity: 1;
}
</style>
