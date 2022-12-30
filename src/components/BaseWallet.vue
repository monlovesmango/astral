<template>
    <q-btn
      v-if="link"
      icon="bolt"
      class='button-wallet q-pr-xs'
      clickable
      @click='toggleWalletPicker'
      :label='(extended) ? ("open in wallet") : ""'
      align="left"
      size='sm'
      unelevated
      dense
      :outline="extended"
    >
      <q-tooltip v-if="!extended">
        view link
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
          <q-btn flat label="Copy Link" color="primary" v-close-popup  @click='copy' />
          <q-btn flat label="Open in Default Wallet" color="primary" v-close-popup @click='openInWallet()' />
        </q-card-actions>
      </q-card>
    </q-dialog>
</template>

<script>
import { defineComponent } from 'vue'
import helpersMixin from '../utils/mixin'
import {Notify} from 'quasar'
import { destroyStreams } from '../query'

export default defineComponent({
  name: 'BaseWallet',
  mixins: [helpersMixin],

  data() {
    return {
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
    link: {
      type: String,
      required: true,
      default: '',
    },
    extended: {
      type: Boolean,
      requred: false,
      default: false,
    },
  },

  methods: {
    toggleWalletPicker() {
      this.showWalletPicker = !this.showWalletPicker
    },

    copy() {
      let text = this.link
      navigator.clipboard.writeText(text)
      Notify.create({
        message: `copied ${this.link.length < 70 ? this.link : this.shorten(this.link, 30)}`,
      })
    },

    openInWallet(prefix) {
      // temporarily disable the "leave page?" prompt when user clicks
      window.onbeforeunload = null

      if (!prefix) {
        prefix = 'lightning:'
      }

      window.open(`${prefix}${this.link}`, '_self')

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
.button-wallet {
  opacity: .7;
  transition: all .3s ease-in-out;
}
.button-wallet:hover {
  opacity: 1;
}
</style>
