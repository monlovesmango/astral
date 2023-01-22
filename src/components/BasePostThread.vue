<template>
  <q-list ref='thread' class='no-padding'>
    <div v-if='fetchRootReply && ($store.state.eventsCache[reply] || $store.state.eventsCache[root]) && rootReplyThread.length'>
      <BasePostThread :events="rootReplyThread" is-ancestors/>
    </div>
    <div
      v-for="(event, index) in filledEvents"
      :key="event.id + index"
      class='no-padding'
    >
      <BaseButtonShowMore v-if="event.id === 'FILLER'" :root="event.root"/>
      <!-- <BaseButtonShowMore v-else-if="event.id === 'REPLIES'" :root="event.root" :reply-count='event.replyCount'/> -->
      <BasePost
        v-else
        :event="event"
        :position="position(index)"
        :reply-depth='replyDepth'
        :reply-count='event.replies?.length ? event.replies.length : (index === filledEvents.length - 1 ? 0 : 1)'
        @resized='resize'
        @add-event='addEvent'
        @click.stop="toEvent(event.id)"
      />
    </div>
    <div v-if='(!replyDepth || replyDepth === 0) && !isAncestors' class='bottom-border'>
    </div>
  </q-list>
</template>

<script>
import helpersMixin from '../utils/mixin'
import BaseButtonShowMore from 'components/BaseButtonShowMore'

export default {
  name: 'BasePostThread',
  emits: ['resized', 'add-event'],
  mixins: [helpersMixin],
  props: {
    events: {type: Array, required: true},
    isAncestors: {type: Boolean, default: false},
    replyDepth: {type: Number, default: 0},
    fetchRootReply: {type: Boolean, default: false},
  },
  components: {
    BaseButtonShowMore,
  },

  data() {
    return {
      resizing: false,
    }
  },

  computed: {
    root() {
      return this.events[0]?.interpolated?.replyEvents?.length ? this.events[0].interpolated.replyEvents[0] : null
    },
    reply() {
      return (this.root && this.events[0]?.interpolated?.replyEvents?.length > 1) ? this.events[0].interpolated.replyEvents[1] : null
    },
    rootReplyThread() {
      let thread = []
      if (this.reply && this.$store.state.eventsCache[this.reply]) {
        if (this.root && this.$store.state.eventsCache[this.root]) thread.push(this.$store.state.eventsCache[this.root])
        thread.push(this.$store.state.eventsCache[this.reply])
      }
      return thread
    },

    filledEvents() {
      if (this.resizing && !this.resizing) return
      if (this.events.length === 0) return []

      var filled = [this.events[0]]
      if (this.events.length === 1) return filled
      // if (this.events.length === 1) return this.pushShowMore(filled)

      for (let i = 1; i < this.events.length; i++) {
        let curr = this.events[i]
        let prev = this.events[i - 1]
        let currEventTags = curr.interpolated.replyEvents || []
        if (currEventTags.length && currEventTags[currEventTags.length - 1] !== prev.id) {
          filled.push({id: 'FILLER', root: prev.id})
        }
        filled.push(curr)
      }

      // return this.pushShowMore(filled)
      return filled
    },
  },

  mounted() {
    if (this.fetchRootReply) {
      if (this.root) this.$store.dispatch('useEvent', { id: this.root })
      if (this.reply) this.$store.dispatch('useEvent', { id: this.reply })
    }
  },

  methods: {
    position(index) {
      if (!this.isAncestors) {
        // normal thread
        if (this.filledEvents.length === 1) {
          if (this.rootReplyThread?.length) return 'last'
          return 'single'
        }
        if (index === 0) {
          if (this.rootReplyThread?.length) return 'middle'
          return 'first'
        }
        if (index === this.filledEvents.length - 1) return 'last'
        return 'middle'
      } else {
        // in this mode the last event should have the left bar to the bottom,
        // as it will plug into the "main" event in the thread,
        // so 'single' is turned into 'first' and 'last' into 'middle'
        if (this.filledEvents.length === 1) return 'first'
        if (index === 0) return 'first'
        if (index === this.filledEvents.length - 1) return 'middle'
        return 'middle'
      }
    },

    addEvent(event) {
      console.log('basepostthread add-event', event)
      this.$emit('add-event', event)
    },

    resize(event) {
      this.resizing = !this.resizing
      this.$emit('resized')
    },

    // pushShowMore(filled) {
    //   let last = filled[filled.length - 1]
    //   if (last.replies?.length && this.threadWidth() &&
    //     // (this.replyDepth >= 5)) {
    //     (this.replyDepth >= 2 || (this.replyDepth > 0 && this.threadWidth() < 300))) {
    //       // let replies = Array.from(curr.replies)
    //       let event = Object.assign({}, last)
    //       event.replyCount = event.replies.length
    //       event.replies = []
    //       // curr.replies = []
    //       filled.pop()
    //       filled.push(event)
    //       filled.push({id: 'REPLIES', root: event.id, replyCount: event.replyCount})
    //       // filled.concat([curr, {id: 'FILLER', root: curr.id, replies: replies}])
    //       // console.log('filled', filled)
    //   }
    //   return filled
    // },

    threadWidth() {
      // only using resizing to trigger compute
      // if (this.resizing) return this.$refs.thread?.$el?.clientWidth
      return this.$refs.thread?.$el?.clientWidth
    },
  }
}
</script>

<style lang='scss'>

.bottom-border {
  border-bottom: 2px solid var(--q-accent);
  opacity: .25;
  height: 0;
  margin: 0 .4rem;
}
</style>
