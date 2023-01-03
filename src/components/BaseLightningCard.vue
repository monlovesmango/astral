<template>
  <div class='lightning-card'>
    <div class='flex no-wrap justify-between'  :class='rowOrColumn' style='gap: 1rem;'>
      <div style='font-size: .9rem;' :style='rowOrColumn === "row" ? "gap: .5rem;" : "gap: 1rem;"' class='flex column justify-between' :align='rowOrColumn === "row" ? "start" : "center"'>
        <div v-if='pubkey' class='flex column items-center' >
          <span class='text-bold' style='font-size: 1.1rem;'>lightning tip for</span>
          <BaseUserCard :pubkey='pubkey' :action-buttons='false'/>
        </div>
        <div v-else class='text-bold' style='font-size: 1.1rem;'>lightning {{type}}</div>
        <div v-if='bolt11' class='flex column' :class='rowOrColumn === "row" ? "items-start" : "items-center"'>
          <div v-if='bolt11.description'><strong>desc:</strong> {{bolt11.description}}</div>
          <div><strong>amount:</strong> {{bolt11.amount ? `${bolt11.amount} sats` : 'none specified'}}</div>
          <div v-if='bolt11.created'><strong>created date:</strong> {{ dateUTC(bolt11.created) }}</div>
          <div v-if='bolt11.created'><strong>created time:</strong> {{ timeUTC(bolt11.created) }}</div>
          <div v-if='bolt11.expires'><strong>expires date:</strong> {{ dateUTC(bolt11.expires) }}</div>
          <div v-if='bolt11.expires'><strong>expires time:</strong> {{ timeUTC(bolt11.expires) }}</div>
          <div v-if='bolt11.error'><strong>error:</strong> {{bolt11.error}}</div>
        </div>
        <div v-else class='flex column' >
          <div v-if='request.lnAddr' class='flex row items-center'>
            <span>{{request.lnAddr}}</span>
            <BaseButtonCopy :button-text='request.lnAddr' class='q-pr-xs' @click.stop/>
          </div>
          <!-- <div v-if='request.url'>url: {{request.url}}</div> -->
          <!-- <div v-if='request.minSendable'>min sendable: {{request.minSendable / 1000}} sats</div>
          <div v-if='request.maxSendable'>max sendable: {{request.maxSendable / 1000}} sats</div>
          <div v-if='request.status'>status: {{request.status}}</div>
          <div v-if='request.reason' style='word-wrap: break-word; word-break: break-word;'>reason: {{request.reason}}</div> -->
          <!-- <div v-if='description'>desc: {{description}}</div>
          <div>amount: {{amount ? `${amount} sats` : 'none specified'}}</div>
          <div>created date: {{dateUTC(created)}}</div>
          <div>created time: {{ timeUTC(created)}}</div>
          <div v-if='expires'>expires date: {{dateUTC(expires)}}</div>
          <div v-if='expires'>expires time: {{ timeUTC(expires)}}</div> -->
        </div>
          <div class='flex row no-wrap q-pt-xs' style='gap: .5rem;' :class='rowOrColumn === "row" ? " justify-start" : " justify-center"'>
            <BaseButtonCopy :button-text='lnString' button-label='copy' outline class='q-pr-xs' @click.stop='updateMode("copy")'/>
            <q-btn label='qr' icon='qr_code_2' outline size='sm' dense unelevated class='q-pr-xs' @click.stop='updateMode("qr")'/>
            <q-btn label='wallet' icon='wallet' outline size='sm' dense unelevated class='q-pr-xs' @click.stop='updateMode("wallet")'>
              <!-- <q-dialog v-model="showWalletPicker">
                <BaseWallet :ln-string='lnString' />
              </q-dialog> -->
            </q-btn>
          </div>
      </div>
      <q-tab-panels v-model="mode" style='background: unset;' :style='rowOrColumn === "row" ? "max-width: 50%; width: 50%" : "max-width: 100%; width: 100%"'>
        <q-tab-panel name="copy" class='no-padding flex items-center' :class='rowOrColumn === "row" ? "justify-end" : "justify-center"'>
          <div class='break-word-wrap' style='font-size: .7rem; overflow-y: auto; max-height: 170px; max-width: 200px'>{{ this.lnString.toLowerCase() }}</div>
        </q-tab-panel>
        <q-tab-panel name="qr" class='no-padding flex items-center justify-center'>
          <BaseQr :code='this.lnString' style='height: fit-content;'/>
        </q-tab-panel>
        <q-tab-panel name="wallet" class='no-padding flex items-center justify-center full-width'>
          <BaseWallet :ln-string='lnString' />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </div>
</template>

<script>
import helpersMixin from '../utils/mixin'
import BaseButtonCopy from '../components/BaseButtonCopy'
// import qrcodegen from 'nayuki-qr-code-generator'
import BaseQr from 'components/BaseQr'
import BaseWallet from 'components/BaseWallet.vue'
// import { getParams } from 'js-lnurl'
// import {toSvgString} from 'awesome-qr-code-generator'
import * as bolt11Parser from 'light-bolt11-decoder'
import { utils } from 'lnurl-pay'

export default {
  name: 'BaseLightningCard',
  mixins: [helpersMixin],
  props: {
    lnString: {type: String, default: null},
    pubkey: {type: String, default: null},
    rowOrColumn: {type: String, default: 'column'}
  },
  components: {
    BaseButtonCopy,
    BaseQr,
    BaseWallet,
  },

  data() {
    return {
      // showQr: false,
      showWalletPicker: false,
      request: {},
      mode: this.$store.state.config.preferences.lightningTips.lastMode,
      // links: [],
    }
  },

  computed: {
    bolt11() {
      if (!this.lnString.toLowerCase().startsWith('lnbc')) return null
      try {
        let inv = bolt11Parser.decode(this.lnString)
        let includesAmount = inv.sections[2].name === 'amount'
        let amount = includesAmount ? inv.sections[2].value / 1000 : null
        let description = includesAmount ? inv.sections[6].value : inv.sections[5].value
        let created = includesAmount ? parseInt(inv.sections[4].value) : parseInt(inv.sections[3].value)
        let expiresValue = includesAmount ? parseInt(inv.sections[8].value) : parseInt(inv.sections[7].value)
        let parsed = parseInt(expiresValue)
        let expires = isNaN(parsed) ? null : created + parsed
        let request = inv.paymentRequest
        return {
          amount,
          description,
          created,
          expires,
          request
        }
      } catch (error) {
        console.log('invoice parsing error', error)
        let request = this.lnString
        return { error, request }
      }
    },
    type() {
      if (this.lnString.startsWith('lnbc')) return 'invoice'
      return 'lnurl'
    },
  },
  async mounted() {
    if (this.both11) return
    console.log('pubkey', this.pubkey)
    if (!utils.isLnurl(this.lnString)) {
      this.request.error = 'invalid lnurl'
      return
    }

    let lnAddr = this.lnurlToLnAddr(this.lnSring)
    if (lnAddr) this.request.lnAddr = lnAddr
    // this.request.url = utils.decodeUrlOrAddress(this.lnString)
    // console.log('this.request.url', this.request.url, this.lnString)
    // let lnAddrRegex = /^https:\/\/(?<domain>[a-zA-z0-9.]+)\/.well-known\/lnurlp\/(?<user>[a-zA-Z0-9_-]+)/
    // let lnAddrMatch = this.request.url.match(lnAddrRegex)
    // if (lnAddrMatch) this.request.lnAddr = `${lnAddrMatch.groups.user}@${lnAddrMatch.groups.domain}`
      // if (this.lnString.toLowerCase().startsWith('lnurl')) {
      //   this.request = await getParams(this.lnString)
      //   let lnAddrRegex = /^https:\/\/(?<domain>[a-zA-z0-9.]+)\/.well-known\/lnurlp\/(?<user>[a-zA-Z0-9_-]+)/
      //   let lnAddrMatch = this.request.url.match(lnAddrRegex)
      //   if (lnAddrMatch) this.request.lnAddr = `${lnAddrMatch.groups.user}@${this.request.domain}`
      //   console.log('lnurl params', this.lnString, this.request)
      // }
        // https://sendsats.lol/.well-known/lnurlp/jb55 returned error: Network request failed
  },
  methods: {
    updateMode(mode) {
      this.mode = mode
      this.$store.commit('setConfigLightningTips', { key: 'lastMode', value: mode })
    }
    // async request() {
    //   if (!this.lnString.startsWith('lnurl')) return null
    //   return await getParams(this.lnurl)
    // },
//     renderQr(e) {
//       this.showQr = true
//       let qr = qrcodegen.QrCode.encodeText(this.request, qrcodegen.QrCode.Ecc.MEDIUM)
//       let svgSrc = this.toSvgString(qr, 4)
//       this.$refs.qr.src = svgSrc
//       console.log('qr', qr)
//     },
//     toSvgString(qr, border) {
//       let lightColor = '#FFFFFF'
//       let darkColor = '#000000'
//       if (border < 0)
//         throw new RangeError('Border must be non-negative')
//       let parts = []
//       for (let y = 0; y < qr.size; y++) {
//         for (let x = 0; x < qr.size; x++) {
//           if (qr.getModule(x, y))
//             parts.push(`M${x + border},${y + border}h1v1h-1z`)
//         }
//       }
//       let svg = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${qr.size + border * 2} ${qr.size + border * 2}" stroke="none">
// 	<rect width="100%" height="100%" fill="${lightColor}"/>
// 	<path d="${parts.join(' ')}" fill="${darkColor}"/>
// </svg>
// `
//       let blob = new Blob([svg], {type: 'image/svg+xml'})
//       let url = URL.createObjectURL(blob)
//       return url
// 		}
  },
}
</script>

<style lang='scss' scoped>
.lightning-card {
  background: var(--q-background);
  border: 3px double var(--q-accent);
  padding: .5rem;
  margin: .3rem;
}
.q-btn {
  opacity: .7;
  transition: all .3s ease-in-out;
}
.q-btn:hover {
  opacity: 1;
}

</style>

