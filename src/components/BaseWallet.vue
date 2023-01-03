<template>
  <div ref='walletPicker' class='wallet-picker flex column no-padding justify-center' style='gap: 1rem; height: 100%; width: 100%'>
    <div class='flex row full-width items-center justify-center'>
      <div >
        <BaseSelect :selecting='showWalletPicker' @toggle='showWalletPicker=!showWalletPicker' style='width: 100%;'>
          <template #default>
            <div v-if='selectedWallet' class='flex row no-wrap items-center q-pa-xs' style='gap: .5rem; font-size: 1.1rem; width: 100%;'>
              <div >
                <q-img
                  v-if="!loadingInvoice"
                  :src="'wallet-icons/' + selectedWallet.image"
                  spinner-color="white"
                  style="height: 1.5rem; width: 1.5rem; border-radius: .3rem;"
                />
                <q-spinner-puff
                  v-if="loadingInvoice"
                  color="accent"
                  size="2em"
                />
              </div>

              <div>{{selectedWallet.name}}</div>
            </div>
            <div v-else style='font-size: 1.1rem; width: 100%;'> select a wallet </div>
          </template>
          <template #list-items>
            <q-dialog v-model='showWalletPicker'>
            <div class='flex column no-wrap q-pa-sm base-select-list' style='max-height: 80%; gap: .5rem; background: var(--q-background); font-size: 1.1rem;'>
              <li v-for="(wallet, key) in wallets" :key='key' @click='selectWallet(wallet)' class='flex row items-center no-wrap q-pl-xs' style='gap: .5rem;'>
              <!-- <li v-for="(wallet, key) in wallets" :key='key' @click='openInWallet(wallet.prefix)' class='flex row items-center'> -->
                <div >
                  <q-img
                    v-if="!loadingInvoice"
                    :src="'wallet-icons/' + wallet.image"
                    spinner-color="white"
                    style="height: 1.5rem; width: 1.5rem; border-radius: .3rem;"
                  />
                  <q-spinner-puff
                    v-if="loadingInvoice"
                    color="accent"
                    size="2em"
                  />
                </div>

                <div>{{wallet.name}}</div>
              </li>
            </div>
            </q-dialog>
          </template>

        </BaseSelect>
      </div>
        <!-- <div style='font-size: 1.1rem;'>wallet</div> -->
    </div>
    <!-- <div class='flex column items-center'> -->
      <div v-if='!isInvoice' class='flex row items-center justify-center' style='gap: .7rem;'>
        <div
          id='amount-input'
          contenteditable
          style='font-size: 2rem; padding: 0 .4rem; min-width: 2rem; outline: none; border: none;'
          @input='updateTipAmount'
          @keypress.enter="openInWallet()"
        >
          {{ tipAmount }}
        </div>
        <div style='font-size: 1.1rem;'> sats</div>
      </div>
      <div v-if='!isInvoice' class='flex row justify-center' style='gap: .3rem;'>
        <q-btn v-for='(amount, index) in tipPresets' :key='index' :label='amount + " sats"' size='sm' outline @click.stop='tipAmount=amount'/>
        <q-btn label='other' size='sm' outline @click.stop='focusAmount()'/>

      </div>
    <!-- </div> -->
    <!-- <q-separator /> -->

    <!-- <q-separator /> -->

    <!-- <div align=""> -->
      <!-- <q-btn flat label="Copy lnString" color="primary" v-close-popup  @click='copy' /> -->
      <div class='flex column justify-center items-center' style='font-size: .9rem; width: 100%;'>
        <span v-if='!selectedWallet'>please select a wallet</span>
        <span v-else-if='!isInvoice && selectedWallet && tipAmount === 0'>please enter an amount greater than 0</span>
        <span v-else-if='!isInvoice && selectedWallet && !tipAmount'>please enter an amount</span>
        <q-btn v-else spread outline class='full-width' label='open wallet' color="primary" v-close-popup @click='openInWallet()' />
      </div>
    <!-- </div> -->
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import helpersMixin from '../utils/mixin'
import {Notify} from 'quasar'
// import { destroyStreams } from '../query'
import { requestInvoice } from 'lnurl-pay'
import BaseSelect from 'components/BaseSelect.vue'

export default defineComponent({
  name: 'BaseWallet',
  mixins: [helpersMixin],
  components: {
    BaseSelect
  },

  props: {
    lnString: {
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

  data() {
    return {
      showWalletPicker: false,
      // fibonacciNum: 0,
      loadingInvoice: false,
      // timer: null,
      tipAmount: this.$store.state.config.preferences.lightningTips.presets[0],
      tipPresets: this.$store.state.config.preferences.lightningTips.presets,
      selectedWallet: null,
      wallets: [
        {
          name: 'system default',
          prefix: 'lightning:',
          image: 'default.png',
        },
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
      focusAmount() {
        setTimeout(async () => {
          await this.$nextTick()
          // this.textarea.focus()
          // this.postEntry.querySelector('#input-editable')
          this.tipAmount = null
          this.amountInput.focus()
        }, 1)
      },
    }
  },

  computed: {
    amountInput() {
      return this.$refs.walletPicker.querySelector('#amount-input')
    },
    isInvoice() {
      return this.lnString.startsWith('lnbc')
    }
    // selectHeight() {
    //   return this.$refs.walletPicker.$el.querySelector('#amount-input')
    // }
    // tipAmount() {
    //   return this.binet(this.fibonacciNum)
    // },
  },

  mounted() {
    this.selectedWallet = this.wallets.find(wallet => wallet.name === this.$store.state.config.preferences.lightningTips.lastWallet)
  },

  methods: {
    // openWalletPicker() {
    //   this.showWalletPicker = true
    //   this.cancelTimer()
    // },

    // closeWalletPicker() {
    //   this.showWalletPicker = false
    //   this.fibonacciNum = 0
    //   this.loadingInvoice = false
    //   this.cancelTimer()
    // },

    // copy() {
    //   let text = this.lnString
    //   navigator.clipboard.writeText(text)
    //   Notify.create({
    //     message: `copied ${this.lnString.length < 70 ? this.lnString : this.shorten(this.lnString, 30)}`,
    //   })
    // },

    // incrementTip() {
    //   this.timer = setTimeout(() => {
    //     this.fibonacciNum++
    //     this.incrementTip()
    //   }, 325)
    // },

    // binet(n) {
    //   return Math.round((Math.pow((1 + Math.sqrt(5)) / 2, n) - Math.pow((1 - Math.sqrt(5)) / 2, n)) / Math.sqrt(5))
    // },

    // cancelTimer() {
    //   if (this.timer) {
    //     clearTimeout(this.timer)
    //     this.timer = null
    //   }
    // },
    selectWallet(wallet) {
      this.selectedWallet = wallet
      this.showWalletPicker = false
    },

    updateTipAmount(e) {
      let amount = e.target.innerText
      let amountRegex = /^[0-9]+$/
      let amountMatch = amount.match(amountRegex)
      if (!amountMatch) {
        this.tipAmount = null
        return
      }
      let parsed = parseInt(amount)
      this.tipAmount = parsed
      console.log('amount', amount, e, parsed)
    },

    async openInWallet() {
      // temporarily disable the "leave page?" prompt when user clicks
      // window.onbeforeunload = null
      if (!this.selectedWallet || !this.tipAmount) return
      this.$store.commit('setConfigLightningTips', { key: 'lastWallet', value: this.selectedWallet.name })
      let prefix = this.selectedWallet.prefix

      if (!prefix) {
        prefix = 'lightning:'
      }

      this.loadingInvoice = true
      const invoice = await this.getInvoice(this.tipAmount)
      window.open(`${prefix}${invoice}`, '_self')
      this.loadingInvoice = false
      // this.closeWalletPicker()

      // // once we have our own link done, re-instate the "leave page?" prompt
      // setTimeout(() => {
      //   // destroy streams before unloading window
      //   window.onbeforeunload = async () => {
      //     await destroyStreams()
      //   }
      // }, 500)
    },

    async getInvoice(amount) {
      if (this.lnString.toLowerCase().indexOf('lnbc') === 0) {
        return this.lnString
      }

      if (!amount) {
        return this.lnString
      }

      try {
        const { invoice } = await requestInvoice({
          lnUrlOrAddress: this.lnString,
          tokens: amount, // satoshis
          fetchGet: (req) => {
            // TODO :: need to talk about this...workaround
            let url = `https://no.str.cr/proxy/${req.url}`

            if (req.params) {
              url += '?'
              url += new URLSearchParams(req.params)
            }
            console.log('request invoice', req, url)

            return fetch(url)
              .then((res) => res.json())
              .catch((err) => {
                Notify.create({
                  message: 'Error fetching invoice from LNURL. ' + err.toString()
                })
                // this.closeWalletPicker()
              })
          }
        })

        return invoice
      } catch (e) {
        Notify.create({
          message: 'Error fetching invoice from LNURL. ' + e.toString()
        })

        return this.lnString
      }
    }
  }
})
</script>

<!-- .button-wallet {
  opacity: .7;
  transition: all .3s ease-in-out;
}
.button-wallet:hover {
  opacity: 1;
}
.button-wallet.active {
  animation: tipBubble 0.5s ease-in-out 0s infinite alternate none;
}
@keyframes tipBubble {
  0% {
    transform: scale(0.5);
  }
  100% {
    transform: scale(1.8);
  }
} -->
<!-- .wallet-picker {
  background: var(--q-background);
} -->
<!--
.q-tab-panels{
  background: rgba(0, 0, 0, 0.015);
}
.body--dark .q-tab-panels {
  background: rgba(255, 255, 255, 0.035);
} -->
<style lang='css' scoped>
</style>
