<template>

  <q-page ref='page'>
    <BaseHeader>{{ $t('thread') }}</BaseHeader>
    <div ref='ancestors' v-if="ancestorsCompiled.length || rootAncestor">
      <BasePostThread :events="ancestorsCompiled" is-ancestors @add-event='addEventAncestors'/>
    </div>
    <BaseButtonShowMore v-if="ancestorsMissing" :root="ancestorsMissing"/>

    <div class='relative-position'>
    <div v-if="ancestors && ancestors.length" class="is-reply-connector"></div>
    <q-item ref="main" class='column relative-position' style='border: 2px solid var(--q-accent); border-radius: 1rem; z-index: 1; background: var(--q-background);'>
      <BasePost
        v-if="event"
        :event='event'
        :highlighted='true'
        :reply-count='childrenThreadsFiltered?.length'
        position='standalone'
        @add-event='processChildEvent'
      />
      <div v-else>
        {{ $route.params.eventId }}
      </div>
      <BaseRelayList v-if="event" :event='event' class='q-px-sm'/>
    </q-item>
    </div>

    <div v-if="childrenThreadsFiltered.length">
      <div class="text-h6 text-bold q-px-sm">{{ $t('replies') }}</div>
      <div v-for="(thread) in childrenThreadsFiltered" :key="thread[0].id">
        <BasePostThread :events="thread" @add-event='processChildEvent'/>
      </div>
    </div>
    <div style='min-height: 30vh;'/>
  </q-page>
</template>

<script>
import { defineComponent, nextTick } from 'vue'
import {dbStreamEvent, dbStreamTagKind} from '../query'
import helpersMixin from '../utils/mixin'
import {addToThread} from '../utils/threads'
import BaseRelayList from 'components/BaseRelayList.vue'
import { createMetaMixin } from 'quasar'
import BaseButtonShowMore from 'components/BaseButtonShowMore'

const metaData = {
  // sets document title
  title: 'astral - thread',

  // meta tags
  meta: {
    description: { name: 'description', content: 'Nostr event thread' },
    keywords: { name: 'keywords', content: 'nostr decentralized social media' },
    equiv: { 'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8' },
  },
}

export default defineComponent({
  name: 'Event',
  emits: ['scroll-to-rect'],
  mixins: [helpersMixin, createMetaMixin(metaData)],
  components: {
    BaseRelayList,
    BaseButtonShowMore
  },

  data() {
    return {
      replying: false,
      ancestors: [],
      ancestorsSeen: new Map(),
      ancestorIds: [],
      rootAncestor: null,
      event: null,
      childrenThreads: [],
      childrenSet: new Set(),
      sub: {},
      profilesUsed: new Set(),
    }
  },

  // watch: {
  //   '$route.params.eventId'(curr, prev) {
  //     console.log('(curr, prev)', curr, prev)
  //     if (prev !== curr) {
  //       this.stop()
  //       this.start()
  //     }
  //   }
  // },

  computed: {
    childrenThreadsFiltered() {
      return this.childrenThreads.filter(thread => thread[0].interpolated.replyEvents.includes(this.hexEventId))
    },
    ancestorsCompiled() {
      if (!this.rootAncestor) return this.ancestors
      if (this.ancestors.length && this.rootAncestor && this.ancestors[0].id === this.rootAncestor.id) return this.ancestors
      return [this.rootAncestor].concat(this.ancestors)
    },
    hexEventId() {
      return this.bech32ToHex(this.$route.params.eventId)
    },
    ancestorsMissing() {
      let ancestors = this.ancestorsCompiled
      if (!ancestors?.length) return false
      let closestAncestor = ancestors[ancestors.length - 1]
      let replyEvents = this.event.interpolated.replyEvents
      let replyId = replyEvents[replyEvents.length - 1]
      return closestAncestor.id === replyId ? null : closestAncestor.id
    }
  },

  mounted() {
    if (this.hexEventId) this.start()
  },

  beforeUnmount() {
    this.stop()
  },

  methods: {
    async start() {
      let relays = Object.keys(this.$store.state.relays).length ? Object.keys(this.$store.state.relays) : Object.keys(this.$store.state.defaultRelays)
      this.sub.event = await dbStreamEvent({ ids: [this.hexEventId], relays }, events => {
        if (!events?.length) return
        let event = events[0]
        let getAncestorsChildren = false
        if (!this.event) getAncestorsChildren = true
        this.interpolateEventMentions(event)
        this.event = null
        this.event = event
        if (getAncestorsChildren) {
          if (this.event.interpolated.replyEvents.length) this.subRootAncestor()
          this.subAncestorsChildren()
        }
        this.useProfile(event.pubkey)
      }, true)
      this.subAncestorsChildren()
    },

    stop() {
      this.replying = false
      if (this.sub.event) this.sub.event.cancel()
      if (this.sub.ancestorsChildren) this.sub.ancestorsChildren.cancel()
      if (this.sub.rootAncestor) this.sub.rootAncestor.cancel()

      this.replying = false
      this.ancestors = []
      this.ancestorsSeen = new Map()
      this.ancestorIds = []
      this.rootAncestor = null
      this.event = null
      this.childrenThreads = []
      this.childrenSet = new Set()
      this.sub = {}
      this.profilesUsed = new Set()
    },

    async subRootAncestor() {
      let relays = Object.keys(this.$store.state.relays).length ? Object.keys(this.$store.state.relays) : Object.keys(this.$store.state.defaultRelays)
      this.sub.rootAncestor = await dbStreamEvent({ ids: [this.event.interpolated.replyEvents[0]], relays }, events => {
        if (!events?.length) return
        let event = events[0]
        this.processAncestorEvent(event)
        this.sub.rootAncestor.cancel()
      })
    },

    async subAncestorsChildren() {
      if (!this.hexEventId) return
      let relays = Object.keys(this.$store.state.relays).length ? Object.keys(this.$store.state.relays) : Object.keys(this.$store.state.defaultRelays)
      let tags = this.event?.interpolated?.replyEvents?.length ? [this.hexEventId, this.event.interpolated.replyEvents[0]] : [this.hexEventId]

      if (this.sub.ancestorsChildren) this.sub.ancestorsChildren.update({type: 'e', values: tags, kinds: [1], relays})
      else this.sub.ancestorsChildren = await dbStreamTagKind({type: 'e', values: tags, kinds: [1], relays}, events => {
        for (let event of events) {
          if (this.event && event.created_at < this.event.created_at) {
            this.processAncestorEvent(event)
          } else {
            this.processChildEvent(event)
          }
        }
      })
    },

    processAncestorEvent(event) {
      let currAncestor = this.ancestors.length ? this.ancestors[this.ancestors.length - 1] : this.event
        // console.log('processAncestorEvent events', event, currAncestor, this.ancestors, this.event, this.rootAncestor)
      if (currAncestor.interpolated.replyEvents.length === 0) return

      let existing = this.ancestorsSeen.get(event.id)
      if (existing) return

      this.interpolateEventMentions(event)
      this.ancestorsSeen.set(event.id, event)
      if (this.event?.interpolated?.replyEvents?.[0] === event.id) this.rootAncestor = event

      let prevAncestorId = currAncestor.interpolated.replyEvents[currAncestor.interpolated.replyEvents.length - 1]
      if (prevAncestorId === event.id) {
        let prevAncestor = event
        while (prevAncestor) {
          this.ancestors = [prevAncestor].concat(this.ancestors)
          this.scrollToMainEvent()
          this.useProfile(prevAncestor.pubkey)
          currAncestor = prevAncestor
          prevAncestorId = currAncestor.interpolated.replyEvents[currAncestor.interpolated.replyEvents.length - 1]
          prevAncestor = this.ancestorsSeen.get(prevAncestorId)
        }
      }
    },

    processChildEvent(event) {
      if (event.id === this.hexEventId) return
      if (this.childrenSet.has(event.id)) return

      this.childrenSet.add(event.id)
      this.useProfile(event.pubkey)
      this.interpolateEventMentions(event)
      addToThread(this.childrenThreads, event, '', event.pubkey !== this.$store.state.keys.pub)
    },

    scrollToMainEvent() {
      nextTick(() => {
        let mainRect = this.$refs.main?.$el.getBoundingClientRect()
        this.$emit('scroll-to-rect', mainRect)
      })
    },

    addEventAncestors(event) {
      this.interpolateEventMentions(event)
      this.toEvent(event.id)
    },

    useProfile(pubkey) {
      this.$store.dispatch('useProfile', {pubkey})
    },
  }
})
</script>

<style lang='css' scoped>

.is-reply-connector {
  width: 8px;
  opacity: .3;
  position: absolute;
  left: 5px;
  height: 2rem;
  top: 0;
  background: var(--q-accent);
  z-index: 0;
}
</style>
