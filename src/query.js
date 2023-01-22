const worker = new Worker(new URL('./query.worker.js', import.meta.url))

const hub = {}

worker.onmessage = ev => {
  let { id, success, error, data, stream, type, notice, eose } = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data

  if (type) {
    // console.debug(ev.data)
    return
  }

  if (notice) {
    // Notify.create({
    //   message: `Relay ${notice.relay} says: ${notice.message}`,
    //   color: 'info'
    // })
    return
  }

  if (eose) {
    // console.log('🖴', id, '~>>', data)
    if (hub[id] && hub[id].eoseCb) hub[id].eoseCb()
    return
  }

  if (stream) {
    // console.log('🖴', id, '~>>', data)
    // if (id.startsWith('dbTagKind')) console.log('🖴', id, '~>>', data, hub[id])
    if (!success) console.log('ERROR', id, '~>>', data, hub[id], error)
    else if (hub[id] && hub[id].cb) hub[id].cb(data)
    return
  }

  if (!success) {
  // console.log('🖴', id, '->', data)
    hub[id].reject(new Error(error))
    delete hub[id]
    return
  }

  // if (data) console.debug('🖴', id, '->', data)
  // console.log('🖴', id, '->', data, hub[id])
  hub[id]?.resolve?.(data)
  delete hub[id]
}

export function call(name, args) {
  let id = name + ' ' + Math.random().toString().slice(-4)
  // console.debug('🖴', id, '<-', args)
  // console.log('🖴', id, '<-', args)
  // worker.postMessage({ id, name, args })
  worker.postMessage(JSON.parse(JSON.stringify({ id, name, args, call: true })))
  return new Promise((resolve, reject) => {
    hub[id] = { resolve, reject }
  })
}

export function stream(name, args, cb, eoseCb) {
  let id = name + ' ' + Math.random().toString().slice(-4)
  hub[id] = {cb, eoseCb}
  // console.debug('db <-', id, args)
  worker.postMessage(JSON.stringify({ id, name, args, stream: true }))
  return {
    update(...args) {
      worker.postMessage(JSON.stringify({ id, name, args, stream: true }))
    },
    cancel() {
      worker.postMessage(JSON.stringify({ id, cancel: true }))
      delete hub[id]
    }
  }
}


export async function getRelayStatus() {
  return call('getRelayStatus', [])
}

export async function publish(event, relays) {
  return call('publish', [event, relays])
}

export async function getFeed(settings = {}) {
  return call('getFeed', [settings])
}

export async function getProfiles(settings = {}) {
  return call('getProfiles', [settings])
}

export async function getEvents(settings = {}) {
  return call('getEvents', [settings])
}

export async function getNotes(settings = {}) {
  return call('getNotes', [settings])
}

export async function streamMainProfilesFollows(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('streamMainProfilesFollows', [settings], callback, eoseCallback)
}

export async function streamMainMentions(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('streamMainMentions', [settings], callback, eoseCallback)
}

export async function streamMainIncomingMessages(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('streamMainIncomingMessages', [settings], callback, eoseCallback)
}

export async function streamMainOutgoingMessages(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('streamMainOutgoingMessages', [settings], callback, eoseCallback)
}

export async function streamPeerIncomingMessages(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('streamPeerIncomingMessages', [settings], callback, eoseCallback)
}

export async function streamPeerOutgoingMessages(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('streamPeerOutgoingMessages', [settings], callback, eoseCallback)
}

export async function streamProfile(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('streamProfile', [settings], callback, eoseCallback)
}

export async function dbStreamEvent(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('dbStreamEvent', [settings], callback, eoseCallback)
}

export async function dbStreamFollows(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('dbStreamFollows', [settings], callback, eoseCallback)
}

export async function dbStreamFollowers(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('dbStreamFollowers', [settings], callback, eoseCallback)
}

export async function dbStreamTagKind(settings = {}, callback = () => {}, eoseCallback = () => {}) {
  return stream('dbStreamTagKind', [settings], callback, eoseCallback)
}

export async function dbSave(event) {
  return call('dbSave', [event])
}

export async function dbQuery(sql) {
  return call('dbQuery', [sql])
}

export async function dbEvent(id) {
  return call('dbEvent', [id])
}

export async function dbProfile(pubkey) {
  return call('dbProfile', [pubkey])
}

export async function dbFollows(pubkey) {
  return call('dbFollows', [pubkey])
}

export async function dbChats(pubkey) {
  return call('dbChats', [pubkey])
}

export async function dbMessages(userPubkey, peerPubkey, limit = 50, until = Math.round(Date.now() / 1000)) {
  return call('dbMessages', [userPubkey, peerPubkey, limit, until])
}

export async function dbMentions(pubkey, limit = 40, until = Math.round(Date.now() / 1000)) {
  return call('dbMentions', [pubkey, limit, until])
}

export async function dbUnreadMessagesCount(userPubkey, peerPubkey, since = 0) {
  return call('dbUnreadMessagesCount', [userPubkey, peerPubkey, since])
}

export async function dbUnreadMentionsCount(pubkey, since = 0) {
  return call('dbUnreadMentionsCount', [pubkey, since])
}
