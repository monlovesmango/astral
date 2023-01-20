<template>
  <q-page>
    <BaseHeader>
      <div class='flex row no-wrap justify-start' style='gap: 1rem;'>
        <span>{{ $t('inbox') }}</span>
        <q-btn v-if='$store.getters.unreadChats' label='mark all as read' @click.stop='markAllAsRead' color='secondary' outline dense/>
      </div>
    </BaseHeader>
    <q-list class='q-py-sm q-pr-sm q-gutter-sm'>
      <div v-if="loading" class='flex row justify-center items-start q-my-md'>
        <q-spinner-orbit color="accent"  size='md'/>
      </div>
      <q-item
        v-for="chat in chats"
        :key="chat.peer"
        v-ripple
        clickable
        class='flex row no-padding no-margin justify-between items-center q-gutter-xs'
        @click.capture.stop="$router.push({ name: 'messages', params: { pubkey: hexToBech32(chat.peer, 'npub') } })"
      >
        <div class='col q-pl-md q-pr-auto flex row'>
          <BaseUserCard v-if='chat.peer' :pubkey='chat.peer' :action-buttons='false' class='col' :clickable='false' :show-following='true'/>
          <q-badge
            v-if="$store.state.unreadMessages[chat.peer]"
            color="secondary"
            outline
            class='text-bold q-my-auto'
          >
            {{ $store.state.unreadMessages[chat.peer] }}
          </q-badge>
        </div>
        <label class='no-padding text-right'>
          {{ niceDateUTC(chat.lastMessage) }}
        </label>
      </q-item>
    </q-list>

    <div v-if='!loading && !chats.length' class="m-8 text-base">
      <p>
        Start a chat by clicking
        <q-icon unelevated color="primary" name="mail_lock" size="md" /> icon on
        someone's profile page or user card.
      </p>
    </div>
  </q-page>
</template>

<script>
import {dbChats, streamMainIncomingMessages, streamMainOutgoingMessages} from '../query'
import helpersMixin from '../utils/mixin'
import { createMetaMixin } from 'quasar'

const metaData = {
  // sets document title
  title: 'astral - inbox',

  // meta tags
  meta: {
    description: { name: 'description', content: 'Nostr direct message inbox' },
    keywords: { name: 'keywords', content: 'nostr decentralized social media' },
    equiv: { 'http-equiv': 'Content-Type', content: 'text/html; charset=UTF-8' },
  },
}

export default {
  name: 'Inbox',
  mixins: [helpersMixin, createMetaMixin(metaData)],

  data() {
    return {
      chats: [],
      loading: true,
      sub: {},
    }
  },

  computed: {
    allChatsNeverRead() {
      return Object.keys(this.$store.state.lastMessageRead).length === 0
    }
  },

  async mounted() {
    this.start()
  },

  beforeUnmount() {
    this.stop()
  },

  methods: {
    async start() {
      this.loading = true
      let relays = Object.keys(this.$store.state.relays).length ? Object.keys(this.$store.state.relays) : Object.keys(this.$store.state.defaultRelays)

      this.getChats()

      this.sub.streamMainIncomingMessages = await streamMainIncomingMessages({ authors: [this.$store.state.keys.pub], relays, limit: 1000 }, null, () => {
        this.getChats()
        this.loading = false
      })
      this.sub.streamMainOutgoingMessages = await streamMainOutgoingMessages({ authors: [this.$store.state.keys.pub], relays, limit: 1000 }, null, () => {
        this.getChats()
        this.loading = false
      })
    },
    stop() {
      if (this.sub.streamMainIncomingMessages) this.sub.streamMainIncomingMessages.cancel()
      if (this.sub.streamMainOutgoingMessages) this.sub.streamMainOutgoingMessages.cancel()
    },
    async getChats() {
      this.chats = await dbChats(this.$store.state.keys.pub)
      this.chats.forEach(({peer}) => this.useProfile(peer))
      if (this.allChatsNeverRead) this.chats.forEach(({peer}) => this.$store.commit('haveReadMessage', peer))
    },

    markAllAsRead() {
      this.chats.forEach(chat => {
        this.$store.commit('haveReadMessage', chat.peer)
      })
    },

    useProfile(pubkey) {
      this.$store.dispatch('useProfile', {pubkey})
    },
  }
}
</script>

