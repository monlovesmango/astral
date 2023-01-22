<template>
  <q-page>
    <BaseHeader>{{ '#' + this.$route.params.hashtagId }}</BaseHeader>
    <BasePostThread v-for="thread in threads" :key="thread[0].id" :events="thread" @add-event='processEvent'/>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import {dbStreamTagKind} from '../query'
import helpersMixin from '../utils/mixin'
import {addToThread} from '../utils/threads'
import { createMetaMixin } from 'quasar'

export default defineComponent({
  name: 'Hashtag',
  mixins: [helpersMixin, createMetaMixin(() => {
    return {
      // sets document title
      title: `astral - #${window.location.pathname.split('/')[2]}`,

      // meta tags
      meta: {
        description: { name: 'description', content: `Nostr events tagged with ${window.location.pathname.split('/')[2]}` },
        keywords: { name: 'keywords', content: 'nostr decentralized social media' },
        equiv: { 'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8' },
      },
    }
  })],

  data() {
    return {
      threads: [],
      eventsSet: new Set(),
      sub: {},
    }
  },

  watch: {
    '$route.params.hashtagId'(curr, prev) {
      this.hashtag = curr
      if (curr !== prev && curr && prev) {
        this.stop()
      }
      if (curr !== prev && curr) {
        this.start()
      }
    }
  },

  mounted() {
    if (this.$route.params.hashtagId) this.start()
  },

  beforeUnmount() {
    this.stop()
  },

  methods: {

    async start() {
      this.threads = []
      this.eventsSet = new Set()
      let relays = Object.keys(this.$store.state.relays).length ? Object.keys(this.$store.state.relays) : Object.keys(this.$store.state.defaultRelays)

      this.sub.hashtag = await dbStreamTagKind({type: 't', values: [this.$route.params.hashtagId.toLowerCase()], kinds: [1], relays}, events => {
        for (let event of events) this.processEvent(event)
      })
    },

    stop() {
      if (this.sub.hashtag) this.sub.hashtag.cancel()
      this.threads = []
      this.eventsSet = new Set()
    },

    processEvent(event) {
      if (this.eventsSet.has(event.id)) return

      this.interpolateEventMentions(event)
      this.eventsSet.add(event.id)
      addToThread(this.threads, event, '', event.pubkey !== this.$store.state.keys.pub)
      this.$store.dispatch('useProfile', {pubkey: event.pubkey})
      return
    },
  }
})
</script>

