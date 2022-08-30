<template>
  <q-page>
    <BaseUserCard v-if='$route.params.pubkey' :pubkey='$route.params.pubkey' class='user-card-header q-my-sm' :header-mode='true'/>
    <q-tabs
      v-model="tab"
      dense
      outline
      align="left"
      active-color='accent'
      :breakpoint="0"
    >
      <q-tab name="posts" label='posts' />
      <q-tab name="follows" label='follows' />
    </q-tabs>
    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="posts" class='no-padding'>
        <div>
          <BasePostThread v-for="thread in threads" :key="thread[0].id" :events="thread" @add-event='addEvent'/>
          <q-btn
            icon='more_vert'
            color="white"
            text-color="black"
            size="md"
            label="Load Older Events"
            flat
            dense
            @click="more()"
           />
        </div>
      </q-tab-panel>

      <q-tab-panel name="follows" class='no-padding'>
        <div v-if="!follows">{{ $t('noFollows') }}</div>
        <div v-else class="flex column relative">
          <!-- <q-btn
            v-if="$store.getters.hasMoreContacts($route.params.pubkey)"
            :name="showAllContacts ? 'show less' : 'show all'"
            :label="showAllContacts ? 'show less' : 'show all'"
            :icon-right="showAllContacts ? 'expand_less' : 'expand_more'"
            color="secondary"
            class='q-ma-sm'
            outline
            size='sm'
            @click="showAllContacts = !showAllContacts"
          /> -->
          <div class='q-pl-sm'>
            <BaseUserCard
              v-for="(user) in follows"
              :key="user.pubkey"
              :pubkey="user.pubkey"
            />
          </div>
          <!-- <q-btn
            v-if='!showAllContacts && $store.getters.hasMoreContacts($route.params.pubkey)'
            icon='more_vert'
            size='xl'
            class='q-pa-md justify-start items-start'
            flat
            dense
            @click="showAllContacts = true"
          /> -->
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import {pool} from '../pool'
import helpersMixin from '../utils/mixin'
import {addToThread} from '../utils/threads'
import BaseUserCard from 'components/BaseUserCard.vue'

export default defineComponent({
  name: 'Profile',
  mixins: [helpersMixin],

  components: {
    BaseUserCard,
  },

  data() {
    return {
      threads: [],
      eventsSet: new Set(),
      sub: null,
      showAllContacts: false,
      tab: 'posts',
      until: undefined,
      since: Math.floor(Date.now()/1000 - 86400*7) // 7 days
    }
  },

  computed: {
    follows() {
      return this.$store.getters.contacts(this.$route.params.pubkey)
    }
  },

  activated() {
    this.start()
  },

  deactivated() {
    if (this.sub) this.sub.unsub()
  },

  methods: {
    more() {
      this.until = this.since;
      this.since -= 86400*7;
    },
    start() {
      this.listen()
      this.$store.dispatch('useProfile', {pubkey: this.$route.params.pubkey, request: true})
      this.$store.dispatch('useContacts', {pubkey: this.$route.params.pubkey, request: true})
      this.$store.getters
        .contacts(this.$route.params.pubkey)
        ?.forEach(pubkey => this.$store.dispatch('useProfile', {pubkey}))
    },

    listen() {
      this.threads = []
      this.eventsSet = new Set()

      this.sub = pool.sub(
        {
          filter: [
            {
              authors: [this.$route.params.pubkey],
              kinds: [0, 1, 2],
              since: this.since,
              until: this.until,
            }
          ],
          cb: async (event, relay) => {
            switch (event.kind) {
              case 0:
                await this.$store.dispatch('addEvent', {event, relay})
                return

              case 1:
              case 2:
                if (this.eventsSet.has(event.id)) return

                this.interpolateEventMentions(event)
                this.eventsSet.add(event.id)
                addToThread(this.threads, event)
                return
            }
          }
        },
        'profile-browser'
      )
    },

    addEvent(event) {
      if (this.eventsSet.has(event.id)) return

      this.interpolateEventMentions(event)
      this.eventsSet.add(event.id)
      addToThread(this.threads, event)
    }
  }
})
</script>

<style lang='scss' scoped>
.q-tabs {
  border-bottom: 1px solid $accent
}
</style>
