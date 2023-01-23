import {
  dbChats,
  dbUnreadMessagesCount,
  dbUnreadMentionsCount,
  streamMainMentions,
  streamMainIncomingMessages,
} from '../query'

export default function (store) {
  const setUnreadNotifications = async () => {
    store.commit(
      'setUnreadNotifications',
      await dbUnreadMentionsCount(
        store.state.keys.pub,
        store.state.lastNotificationRead
      )
    )
  }

  const setUnreadMessages = async peer => {
    store.commit('setUnreadMessages', {
      peer,
      count: await dbUnreadMessagesCount(
        store.state.keys.pub,
        peer,
        store.state.lastMessageRead[peer] || 0
      )
    })
  }

  let sub = {}
  const streamMentionsAndMessages = async () => {
    let relays = Object.keys(store.state.relays).length ? Object.keys(store.state.relays) : Object.keys(store.state.defaultRelays)
    let streamMainMentionsEose = false
    let streamMainIncomingMessagesEose = false
    let streamMainIncomingMessagesPeers = {}
    if (store.state.keys.pub) {
      if (sub.streamMainMentions) sub.streamMainMentions.update({ authors: [store.state.keys.pub], relays })
      else sub.streamMainMentions = await streamMainMentions({ authors: [store.state.keys.pub], relays },
        () => { if (streamMainMentionsEose) setUnreadNotifications() },
        () => {
          if (!streamMainMentionsEose) {
            streamMainMentionsEose = true
            setUnreadNotifications()
          }
        })

      if (sub.streamMainIncomingMessages) sub.streamMainIncomingMessages.update({ authors: [store.state.keys.pub], relays })
      else sub.streamMainIncomingMessages = await streamMainIncomingMessages({ authors: [store.state.keys.pub], relays },
        events => {
          if (streamMainIncomingMessagesEose) for (let event of events) setUnreadMessages(event.pubkey)
          else streamMainIncomingMessagesPeers[event.pubkey] = true
        },
        () => {
          if (!streamMainIncomingMessagesEose) {
            streamMainIncomingMessagesEose = true
            for (let pubkey of Object.keys(streamMainIncomingMessagesPeers)) setUnreadMessages(pubkey)
          }
        })

      setUnreadNotifications()
      dbChats(store.state.keys.pub).then(chats => { chats.forEach(chat => { setUnreadMessages(chat.peer) }) })
    }
  }


  store.subscribeAction(({type, payload}, state) => {
    switch (type) {
      case 'restartMainSubscription':
        streamMentionsAndMessages()
        break
    }
  })

  store.subscribe(({type, payload}, state) => {
    switch (type) {
      case 'haveReadNotifications':
        setUnreadNotifications()
        break
      case 'haveReadMessage':
        setUnreadMessages(payload)
        break
    }
  })
}
