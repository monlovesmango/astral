<template>
    <q-btn
      v-if="link"
      icon="bolt"
      :class='(!extended ? "q-pr-xs button-wallet" : "button-wallet")'
      clickable
      @mouseup.stop='openWalletPicker'
      @touchend.stop='openWalletPicker'
      :label='(extended) ? ("open in wallet") : ""'
      align="left"
      :size='size'
      unelevated
      dense
      :outline="extended"
      @mousedown='incrementTip'
      @touchstart='incrementTip'
      @click.stop=''
    >
      <span v-if="tipAmount > 0">
        <b>{{tipAmount}}</b>
      </span>
    </q-btn>

     <q-dialog :modelValue="showWalletPicker" @update:modelValue="closeWalletPicker">
      <q-card>
        <q-card-section>
          <div class="text-h6" v-if='tipAmount === 0'>Select a Wallet</div>
          <div class="text-h6" v-if='tipAmount > 0'>Send {{ tipAmount }} sats</div>
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
                    v-if="!loadingInvoice"
                  />
                  <q-spinner-puff
                    color="primary"
                    size="2em"
                    v-if="loadingInvoice" />
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
import { requestInvoice } from 'lnurl-pay'

export default defineComponent({
  name: 'BaseWallet',
  mixins: [helpersMixin],

  data() {
    return {
      showWalletPicker: false,
      fibonacciNum: 0,
      loadingInvoice: false,
      timer: null,
      wallets: [
        {
          name: 'Strike',
          prefix: 'strike:',
          image: 'strike.jpg',
        },
        {
          name: 'Cash App',
          prefix: 'squarecash://',
          image: 'cashapp.jpg',
        },
        {
          name: 'Muun',
          prefix: 'muun:',
          image: 'muun.jpg',
        },
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
          name: 'Blixt',
          prefix: 'blixtwallet:lightning:',
          image: 'blixt.png',
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
    size: {
      type: String,
      required: false,
      default: 'sm',
    }
  },

  computed: {
    tipAmount() {
      return this.binet(this.fibonacciNum)
    },
  },

  methods: {
    openWalletPicker() {
      this.showWalletPicker = true
      this.cancelTimer()
    },

    closeWalletPicker() {
      this.showWalletPicker = false
      this.fibonacciNum = 0
      this.loadingInvoice = false
      this.cancelTimer()
    },

    copy() {
      let text = this.link
      navigator.clipboard.writeText(text)
      Notify.create({
        message: `copied ${this.link.length < 70 ? this.link : this.shorten(this.link, 30)}`,
      })
    },

    incrementTip() {
      this.timer = setTimeout(() => {
        this.fibonacciNum++
        this.incrementTip()
      }, 325)
    },

    binet(n) {
      return Math.round((Math.pow((1 + Math.sqrt(5)) / 2, n) - Math.pow((1 - Math.sqrt(5)) / 2, n)) / Math.sqrt(5))
    },

    cancelTimer() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    },

    async openInWallet(prefix) {
      console.log('mouseup!!', this.fibonacciNum)
      // temporarily disable the "leave page?" prompt when user clicks
      window.onbeforeunload = null

      if (!prefix) {
        prefix = 'lightning:'
      }

      this.loadingInvoice = true
      const invoice = await this.getInvoice(this.binet(this.fibonacciNum))

      window.open(`${prefix}${invoice}`, '_self')

      this.closeWalletPicker()

      // once we have our own link done, re-instate the "leave page?" prompt
      setTimeout(() => {
        // destroy streams before unloading window
        window.onbeforeunload = async () => {
          await destroyStreams()
        }
      }, 500)
    },

    async getInvoice(amount) {
      if (this.link.toLowerCase().indexOf('lnbc') === 0) {
        return this.link
      }

      if (!amount) {
        return this.link
      }

      const { invoice } = await requestInvoice({
        lnUrlOrAddress: this.link,
        tokens: amount, // satoshis
        fetchGet: (req) => {
          // TODO :: need to talk about this...workaround
          let url = `https://no.str.cr/proxy/${req.url}`

          if (req.params) {
            url += '?'
            url += new URLSearchParams(req.params)
          }

          return fetch(url).then((res) => res.json())
        }
      })

      return invoice
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
