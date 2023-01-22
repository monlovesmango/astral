const relayWorker = new Worker(new URL('./relay.worker.js', import.meta.url))
const dbWorker = new Worker(new URL('./db.worker.js', import.meta.url))
const eventWorker = new Worker(new URL('./event.worker.js', import.meta.url))


const relayToDbChannel = new MessageChannel()
relayWorker.postMessage({ action: 'setPort' }, [ relayToDbChannel.port1 ])
dbWorker.postMessage({ action: 'setPort', withWorker: 'relay' }, [ relayToDbChannel.port2 ])

const dbToEventChannel = new MessageChannel()
dbWorker.postMessage({ action: 'setPort', withWorker: 'event' }, [ dbToEventChannel.port1 ])
eventWorker.postMessage({ action: 'setPort' }, [ dbToEventChannel.port2 ])

const methods = {
  getRelayStatus(id) {
    let relayWork = {
      action: 'status',
    }
    let ticket = {
      id,
      relayWork,
      type: 'status',
    }
    return ticket
  },
  publish(event, relays, id) {
    let relayWork = {
      action: 'publish',
      relays,
      event
    }
    let dbWork = {
      action: 'save',
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'publish',
    }
    return ticket
  },
  getFeed(settings, id) {
    let {authors, limit = 10, relays, since = 0, until = Math.round(Date.now() / 1000)} = settings
    let filter = {
      kinds: [1, 2],
      since,
      until,
      limit
    }
    if (authors?.length) filter.authors = authors
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'get',
      subName: 'feed',
      filter,
      relays,
    }
    let dbWork = {
      action: 'save',
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'call',
    }
    return ticket
  },
  getProfiles(settings, id) {
    let {authors, relays} = settings
    let filter = {
      kinds: [0],
    }
    if (authors?.length) filter.authors = authors
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'get',
      subName: 'profiles',
      filter,
      relays,
    }
    let dbWork = {
      action: 'save',
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'call',
    }
    return ticket
  },
  getEvents(settings, id) {
    let {ids, relays} = settings
    let filter = {
      ids,
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'get',
      subName: 'events',
      filter,
      relays,
    }
    let dbWork = {
      action: 'save',
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'call',
    }
    return ticket
  },
  getNotes(settings, id) {
    let {authors, limit = 10, until = Math.round(Date.now() / 1000), relays} = settings
    let filter = {
      kinds: [1],
      authors,
      until,
      limit
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'get',
      subName: 'events',
      filter,
      relays,
    }
    let dbWork = {
      action: 'save',
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'call',
    }
    return ticket
  },
  streamMainProfilesFollows(settings, id) {
    let {authors, relays} = settings
    let filter = {
      kinds: [0, 3],
      authors
    }
    // if (authors?.length) filter.authors = authors
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'main',
      filter,
      relays,
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  streamMainMentions(settings, id) {
    let {authors, relays, limit = 200} = settings
    let filter = {
      kinds: [1],
      '#p': authors,
      limit,
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'main',
      filter,
      relays,
      eose: true
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  streamMainIncomingMessages(settings, id) {
    let {authors, relays, limit = 200} = settings
    let filter = {
      kinds: [4],
      '#p': authors,
      limit,
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'main',
      filter,
      relays,
      eose: true
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  streamMainOutgoingMessages(settings, id) {
    let {authors, relays, limit = 200} = settings
    let filter = {
      kinds: [4],
      authors,
      limit,
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'main',
      filter,
      relays,
      eose: true
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  streamPeerIncomingMessages(settings, id) {
    let {authors, peers, relays, limit = 500} = settings
    let filter = {
      kinds: [4],
      '#p': authors,
      authors: peers,
      limit,
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'page',
      filter,
      relays,
      eose: true,
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  streamPeerOutgoingMessages(settings, id) {
    let {authors, peers, relays, limit = 500} = settings
    let filter = {
      kinds: [4],
      authors,
      '#p': peers,
      limit,
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'page',
      filter,
      relays,
      eose: true,
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  streamProfile(settings, id) {
    let {authors, relays} = settings
    let filter = {
      kinds: [0],
      authors,
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'page',
      filter,
      relays,
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  dbStreamEvent(settings, id) {
    let {ids, relays} = settings
    let filter = {
      ids,
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'page',
      filter,
      relays,
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
      streamUpdates: true,
      call: {
        name: 'dbEvents',
        args: [ids]
      }
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  dbStreamFollows(settings, id) {
    let {author, relays} = settings
    let filter = {
      kinds: [3],
      authors: [author]
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'page',
      filter,
      relays,
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
      streamUpdates: true,
      call: {
        name: 'dbFollows',
        args: [author]
      }
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  dbStreamFollowers(settings, id) {
    let {author, relays} = settings
    let filter = {
      kinds: [3],
      '#p': [author]
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'page',
      filter,
      relays,
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
      streamUpdates: true,
      call: {
        name: 'dbFollowers',
        args: [author]
      }
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  dbStreamTagKind(settings, id) {
    let {type, values, kinds, limit = 500, relays} = settings
    let filter = {
      ['#' + type]: values,
      kinds,
      limit
    }
    relays = relays.map(url => normalizeRelayURL(url))
    let relayWork = {
      action: 'stream',
      subName: 'page',
      filter,
      relays,
    }
    let dbWork = {
      action: 'stream',
      streamEvents: true,
      call: {
        name: 'dbTagKind',
        args: [type, values, kinds]
      }
    }
    let ticket = {
      id,
      relayWork,
      dbWork,
      type: 'stream',
    }
    return ticket
  },
  dbSave(event, id) {
    let dbWork = {
      action: 'query',
      call: {
        name: 'dbSave',
        args: [event]
      }
    }
    let ticket = {
      id,
      dbWork,
    }
    return ticket
  },
  dbQuery(sql, id) {
    let dbWork = {
      action: 'query',
      call: {
        name: 'dbQuery',
        args: [sql]
      }
    }
    let ticket = {
      id,
      dbWork,
    }
    return ticket
  },
  dbEvent(eventId, id) {
    let dbWork = {
      action: 'query',
      call: {
        name: 'dbEvent',
        args: [eventId]
      }
    }
    let ticket = {
      id,
      dbWork,
    }
    return ticket
  },
  dbProfile(pubkey, id) {
    let dbWork = {
      action: 'query',
      call: {
        name: 'dbProfile',
        args: [pubkey]
      }
    }
    let ticket = {
      id,
      dbWork,
    }
    return ticket
  },
  dbFollows(pubkey, id) {
    let dbWork = {
      action: 'query',
      call: {
        name: 'dbFollows',
        args: [pubkey]
      }
    }
    let ticket = {
      id,
      dbWork,
    }
    return ticket
  },
  dbChats(pubkey, id) {
    let dbWork = {
      action: 'query',
      call: {
        name: 'dbChats',
        args: [pubkey]
      }
    }
    let ticket = {
      id,
      dbWork,
    }
    return ticket
  },
  dbMessages(userPubkey, peerPubkey, limit, until, id) {
    let dbWork = {
      action: 'query',
      call: {
        name: 'dbMessages',
        args: [userPubkey, peerPubkey, limit, until]
      }
    }
    let ticket = {
      id,
      dbWork,
    }
    return ticket
  },
  dbMentions(pubkey, limit, until, id) {
    let dbWork = {
      action: 'query',
      call: {
        name: 'dbMentions',
        args: [pubkey, limit, until]
      }
    }
    let ticket = {
      id,
      dbWork,
    }
    return ticket
  },
  dbUnreadMessagesCount(userPubkey, peerPubkey, since, id) {
    let dbWork = {
      action: 'query',
      call: {
        name: 'dbUnreadMessagesCount',
        args: [userPubkey, peerPubkey, since]
      }
    }
    let ticket = {
      id,
      dbWork,
    }
    return ticket
  },
  dbUnreadMentionsCount(pubkey, since, id) {
    let dbWork = {
      action: 'query',
      call: {
        name: 'dbUnreadMentionsCount',
        args: [pubkey, since]
      }
    }
    let ticket = {
      id,
      dbWork,
    }
    return ticket
  },
}
/*
// todo handle updates
ticket
{
  id: required
  priority: 0 - 10, 10 = highest priority
  type: call || stream || update || cancel
  relayWork: {
    action: 'get' || 'stream' || 'cancel' || 'status' || publish (required)
    subName: 'feed' || 'main' || 'page' || 'profiles' || 'events' || 'adhoc' (optional - default = 'adhoc')
    filter:
    relays:
    eose:
    eventsToSave: array of events to save
    call: {
      name: method name
      args: array of arguments
    }
  }
  dbWork: {
    action: 'query' || 'save' || 'stream' (required)
    streamEvents:
    streamUpdates:
    results:
    call: {
      name: method name
      args: array of arguments
    }
  }
  results: rsults returned
  success: boolean
  error: error message
}
*/

var tickets = {}

function handleRelayMessage({ data }) {
  let { ticket } = data
  let { id, results, success, error, eose } = ticket
  if (!tickets[id]) return
  let stream = ticket.type === 'stream' || ticket.type === 'update' || eose
  // console.log('stream relay ticket', ticket)
  if (stream && !results && !error && !eose) return
  self.postMessage({
    id,
    data: results,
    success,
    error,
    stream,
    eose,
  })
  if (!stream) delete tickets[id]
}

relayWorker.onmessage = handleRelayMessage

function handleEventMessage({ data }) {
  let { ticket } = data
  let { id, results, success, error } = ticket
  if (!tickets[id]) return
  let stream = ticket.type === 'stream' || ticket.type === 'update'
  // if (id?.startsWith('streamMainMentions')) console.log('stream ticket', ticket)
  if (stream && !results && !error) return
  self.postMessage({
    id,
    data: results,
    success,
    error,
    stream,
  })
  if (!stream) delete tickets[id]
}

dbWorker.onmessage = handleEventMessage
eventWorker.onmessage = handleEventMessage

async function handleMessage({ data }) {
  // todo handle update and cancel
  let { name, args, id, cancel } = typeof data === 'string' ? JSON.parse(data) : data

  let ticket = tickets[id]
  if (cancel) {
    if (!ticket) return
    ticket.type = 'cancel'
    delete tickets[id]
  } else if (ticket) {
    let updatedTicket = methods[name](...args, id)
    if (JSON.stringify(ticket.relayWork) === JSON.stringify(updatedTicket.relayWork)) return
    updatedTicket.type = 'update'
    ticket = updatedTicket
    tickets[id] = ticket
  } else {
    ticket = methods[name](...args, id)
    tickets[id] = ticket
  }

  if (ticket.relayWork) {
    // console.log('ticket added', ticket, tickets)
    relayWorker.postMessage({ action: 'submit', ticket })
    if (['stream', 'update'].includes(ticket.type) && ticket.dbWork.call) {
      let dbTicket = JSON.parse(JSON.stringify(ticket))
      dbTicket.dbWork.action = 'query'
      dbWorker.postMessage({ action: 'submit', ticket: dbTicket })
    }
  } else if (ticket.dbWork) {
    dbWorker.postMessage({ action: 'submit', ticket })
  }
}

self.onmessage = handleMessage


function normalizeRelayURL(url) {
  let [host, ...qs] = url.trim().split('?')
  if (host.slice(0, 4) === 'http') host = 'ws' + host.slice(4)
  if (host.slice(0, 2) !== 'ws') host = 'wss://' + host
  if (host.length && host[host.length - 1] === '/') host = host.slice(0, -1)
  return [host, ...qs].join('?')
}
