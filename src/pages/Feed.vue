<template>
  <q-page >
  <!-- <div id='feed-scroll' style='max-height: 700px; overflow: auto;'> -->
    <!-- <div> -->
      <!-- <q-infinite-scroll @load='loadMore()' :offset='500' scroll-target='#feed-scroll'> -->
      <BaseHeader :separator='false'>
        <div class='flex row justify-start items-center' style='gap: 1rem;'>
          <div>{{ $t('feed') }}</div>
          <q-select borderless v-model="feedName" :options="['follows', 'global', 'bots']" />
        </div>
      </BaseHeader>
      <BaseButtonLoadMore
        v-if='unreadFeed.length'
        :loading-more='loadingUnread'
        :label='"load " + unreadFeed.length + " unread"'
        @click='loadUnread'
      />
      <div
        v-for='(item, index) in items'
        :key='index'
      >
        <BasePostThread
          :events="item"
          class='full-width'
          fetch-root-reply
          @add-event='processEvent'
        />
        <div v-if='index === items.length - 6' v-intersection='handleIntersectionObserver'></div>
      </div>
          <div v-if='loadingMore' class='row justify-center'>
            <q-spinner-orbit color="accent" size='sm' />
          </div>
      <!-- </q-infinite-scroll> -->
      <!-- </div> -->
    <!-- </div> -->
      <!-- <q-tabs
        v-model="tab"
        dense
        outline
        align="left"
        active-color='accent'
        :breakpoint="0"
      >
        <q-tab name="follows" label='follows' />
        <q-tab name="global" label='global' />
        <q-tab name="AI" label='AI' />
        <q-tab name="bots" label='bots' />
      </q-tabs>
    </div>
    <div v-if='tab === "AI"' class='flex row no-wrap items-center' style='border: 1px solid var(--q-accent); border-radius: .5rem; padding: .5rem; margin: .5rem; gap: .5rem;'>
      <q-icon name='info' color='accent' size='sm'/>
      <div>to chat with the AI bot create a new post and mention it by typing '@gpt3' and selecting the AI bot from the user list</div>
    </div>
    <BaseButtonLoadMore
      v-if='unreadFeed[tab].length'
      :loading-more='loadingUnread'
      :label='"load " + unreadFeed[tab].length + " unread"'
      @click='loadUnread'
    />
    <BasePostThread v-for='(item, index) in items' :key='index' :events="item" class='full-width' fetch-root-reply @add-event='processEvent'/>
    <BaseButtonLoadMore
      :loading-more='loadingMore'
      label='load more'
      @click='loadMore(tab)'
    /> -->
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import helpersMixin from '../utils/mixin'
import {addToThread} from '../utils/threads'
import {isValidEvent} from '../utils/event'
import {getFeed, dbFollows} from '../query'
import BaseButtonLoadMore from 'components/BaseButtonLoadMore.vue'
import { createMetaMixin } from 'quasar'

const metaData = {
  // sets document title
  title: 'astral',

  // meta tags
  meta: {
    description: { name: 'description', content: 'decentralized social media feed built on Nostr' },
    keywords: { name: 'keywords', content: 'nostr decentralized social media' },
    equiv: { 'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8' },
  },
}

export default defineComponent({
  name: 'Feed',
  mixins: [helpersMixin, createMetaMixin(metaData)],

  components: {
    BaseButtonLoadMore,
  },

  watch: {
    feedName(curr, prev) {
      if (curr !== prev) {
        this.stop()
        this.loadMore()
      }
    }
  },

  // props: {
  //   lookingAround: {
  //     type: Boolean,
  //     default: false,
  //   }
  // },

  data() {
    return {
      feed: [],
      // feed: {
      //   follows: [],
      //   global: [],
      //   AI: [],
      //   bots: []
      // },
      // feedCounts: {
      //   follows: 100,
      //   global: 100,
      //   AI: 100,
      //   bots: 100
      // },
      unreadFeed: [],
      // unreadFeed: {
      //   follows: [],
      //   global: [],
      //   AI: [],
      //   bots: []
      // },
      feedSet: new Set(),
      bots: [],
      // follows: [],
      botTracker: '29f63b70d8961835b14062b195fc7d84fa810560b36dde0749e4bc084f0f8952',
      loadingMore: true,
      loadingUnread: false,
      // tab: 'follows',
      feedName: 'follows',
      since: Math.round(Date.now() / 1000),
      until: Math.round(Date.now() / 1000),
      // profilesUsed: new Set(),
      // index: 0,
      lastLoaded: Math.round(Date.now() / 1000),
      refreshInterval: null,
    }
  },

  computed: {
    items() {
      return this.feed
    }
  },

  async mounted() {
    // this.loadMore(this.tab)
    //   if (this.loadingMore) this.loadingMore = false

    // this.bots = await this.getFollows(this.botTracker)
    // this.follows = this.$store.state.follows

    // if (this.follows.length === 0) {
    //   this.tab = 'global'
    // }
    if (this.$store.state.follows.length === 0) {
      this.feedName = 'global'
    }
    this.loadMore()

    // this.refreshInterval = setInterval(async () => {
    //   let relays = Object.keys(this.$store.state.relays).length ? Object.keys(this.$store.state.relays) : Object.keys(this.$store.state.defaultRelays)
    //   // let results = await dbFeed(this.since)
    //   let results = await getFeed({ relays, since: this.since, limit: 500 })
    //   // let feed = this.feed.global.length ? this.unreadFeed : this.feed
    //   if (results) for (let event of results) this.processEvent(event)
    //   // for (let feedName of Object.keys(this.feed)) {
    //   //   this.feed[feed] = this.feed[feed].concat(feed[feed])
    //   // }
    //   // if (this.loadingMore) this.loadingMore = false
    //   this.since = Math.round(Date.now() / 1000)
    // }, 10000)
  },

  async beforeUnmount() {
    this.stop()
  },

  methods: {
    async loadMore() {
      this.loadingMore = true
      let relays = Object.keys(this.$store.state.relays).length ? Object.keys(this.$store.state.relays) : Object.keys(this.$store.state.defaultRelays)

      // if (this.items.length < this.feed[this.tab].length) {
      //   console.log('just increased counts')
      //   this.feedCounts[this.tab] += 100
      //   this.loadingMore = false
      //   return
      // }

      let loadedFeed = []
      // let lastThread = this.feed[feedName][this.feed[feedName].length - 1]
      // let until = lastThread ? lastThread[lastThread.length - 1].latest_created_at : Math.round(Date.now() / 1000)
      // let loadedFeed = []
      let settings = { relays, until: this.until + (5 * 60), limit: 100 }
      if (this.feedName === 'follows') settings.authors = this.$store.state.follows
      else if (this.feedName === 'bots') settings.authors = this.bots

      let results = await getFeed(settings)
      if (results) for (let event of results) this.processEvent(event, loadedFeed)
      this.feed = this.feed.concat(loadedFeed)
      // for (let feedName of Object.keys(this.feed)) {
      //   this.feed[feedName] = this.feed[feedName].concat(loadedFeed[feedName])
      // }

        // console.log('loaded feed', results, this.feed, this.counts)

      // this.loadingMore = false

     if (!this.refreshInterval) this.refreshInterval = setInterval(async () => {
      // let results = await dbFeed(this.since)
      let settings = { relays, since: this.since, limit: 100 }
      if (this.feedName === 'follows') settings.authors = this.$store.state.follows
      else if (this.feedName === 'bots') settings.authors = this.bots
      let results = await getFeed(settings)
      // let feed = this.feed.global.length ? this.unreadFeed : this.feed
      if (results) for (let event of results) this.processEvent(event)
      // for (let feedName of Object.keys(this.feed)) {
      //   this.feed[feed] = this.feed[feed].concat(feed[feed])
      // }
      this.since = Math.round(Date.now() / 1000)
      if (!this.bots.length) this.bots = await this.getFollows(this.botTracker)

      if (this.loadingMore) this.loadingMore = false
    }, 10000)
    },
    stop() {
      if (this.refreshInterval) clearInterval(this.refreshInterval)
      this.feed = []
      this.unreadFeed = []
      this.feedSet = new Set()
      this.since = Math.round(Date.now() / 1000)
      this.until = Math.round(Date.now() / 1000)
      // profilesUsed: new Set(),
      // index: 0,
      this.lastLoaded = Math.round(Date.now() / 1000)
      this.refreshInterval = null
    },

    loadUnread() {
      this.loadingUnread = true
      setTimeout(() => {
        this.feed[this.tab] = this.unreadFeed[this.tab].concat(this.feed[this.tab])
        this.unreadFeed[this.tab] = []
        this.lastLoaded = Math.round(Date.now() / 1000)
        this.loadingUnread = false
      }, 100)
    },

    processEvent(event, activeFeed = this.feed, unreadFeed = this.unreadFeed) {
      if (!isValidEvent(event)) return
      if (this.feedSet.has(event.id)) return
      // if (event.created_at < this.since) return
      this.feedSet.add(event.id)
      this.interpolateEventMentions(event)
      this.useProfile(event.pubkey)
      if (this.until > event.created_at) this.until = event.created_at
      // this.debouncedAddToThread([event])
      let feed
      if (event.pubkey === this.$store.state.keys.pub) feed = activeFeed
      else feed = (event.created_at > this.lastLoaded) ? unreadFeed : activeFeed
      if (this.feedName === 'global' && (this.isBot(event) || this.isAI(event))) return
      addToThread(feed, JSON.parse(JSON.stringify(event)), 'feed', event.pubkey !== this.$store.state.keys.pub)

      // if (this.$store.state.follows.includes(event.pubkey)) addToThread(feed.follows, JSON.parse(JSON.stringify(event)), 'feed', event.pubkey !== this.$store.state.keys.pub)
      // if (this.isBot(event)) addToThread(feed.bots, JSON.parse(JSON.stringify(event)), 'feed', event.pubkey !== this.$store.state.keys.pub)
      // if (this.isAI(event)) addToThread(this.feed.AI, JSON.parse(JSON.stringify(event)), 'feed', event.pubkey !== this.$store.state.keys.pub)
      // else addToThread(feed.global, JSON.parse(JSON.stringify(event)), 'feed', event.pubkey !== this.$store.state.keys.pub)
    },

    async getFollows(pubkey) {
      let events = await dbFollows(pubkey)
      if (!events?.length) return []
      let event = events[0]
      return event.tags
        .filter(([t, v]) => t === 'p' && v)
        .map(([_, v]) => v)
    },

    useProfile(pubkey) {
      // if (this.profilesUsed.has(pubkey)) return

      // this.profilesUsed.add(pubkey)
      this.$store.dispatch('useProfile', {pubkey})
    },

    isBot(event) {
      if (this.bots.includes(event.pubkey)) return true
      if (event.content.includes('https://www.minds.com/newsfeed/')) return true
      return false
    },

    isAI(event) {
      if (event.pubkey === '5c10ed0678805156d39ef1ef6d46110fe1e7e590ae04986ccf48ba1299cb53e2') return true
      if (event.tags.findIndex(([t, v]) => t === 'p' && v === '5c10ed0678805156d39ef1ef6d46110fe1e7e590ae04986ccf48ba1299cb53e2') >= 0) return true
      return false
    },

    handleIntersectionObserver(e) {
      // console.log('handleIntersectionObserver', e)
      if (e.isIntersecting) this.loadMore()
    },

    // printDetails(details) {
    //   console.log('details', details)
    // },

    // itemKey(item) {
    //   return item[0].id
    // }
  }
})
</script>
<style lang='css' scoped>
.q-tabs {
  border-bottom: 1px solid var(--q-accent)
}

.q-page::-webkit-scrollbar {
  width: 0px;
}
</style>
