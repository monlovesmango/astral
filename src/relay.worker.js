import { relayInit, matchFilter } from 'nostr-tools'

const relays = {}
let dbReady = false
let dbWorker = null
let intakeQueue = []
let intakeBusy = false

function run() {
  // pool = relayPool()
  self.onmessage = handleMessage
}

run()

function handleMessage({ data, ports }) {
  let { action, ticket } = typeof data === 'string' ? JSON.parse(data) : data
  if (!action) return

  switch (action) {
    case 'setPort':
      dbWorker = ports[0]
      dbWorker.onmessage = handleDbMessage
      return
    case 'submit': {
      if (ticket.type === 'status') {
        let status = getRelayStatus()
        ticket.results = status
        ticket.success = true
        console.log('get relay status', ticket, status)
        self.postMessage({ action: 'complete', ticket})
        return
      }
      intakeQueue.push(ticket)
      if (!intakeBusy) startIntake()
      // console.log('ticket-relay', ticket)
      return
    }
  }
}

async function startIntake() {
  if (intakeBusy === true) return
  intakeBusy = true
  let ticket = intakeQueue.shift()
  while (ticket) {
    await processTicket(ticket)
    ticket = intakeQueue.shift()
  }
  intakeBusy = false
}

let dbTicketQueue = {}

function handleDbMessage({ data }) {
  // console.log('handleDbMessage', data)
  let { status } = data
  if (status === 'ready') {
    if (Object.keys(dbTicketQueue).length) advanceTicketsToDb()
    else dbReady = true
    // dbReady = true
  } else dbReady = false
}

function advanceTicketsToDb() {
  let tickets = JSON.parse(JSON.stringify(Object.values(dbTicketQueue).filter(ticket => ticket.relayWork.eventsToSave.length)))
  Object.values(dbTicketQueue).filter(ticket => ['stream', 'update'].includes(ticket.type)).forEach(ticket => ticket.relayWork.eventsToSave = [])
  dbWorker.postMessage({ tickets })
  dbTicketQueue = {}
  // let tickets = JSON.parse(JSON.stringify(Object.values(dbTicketQueue).filter(ticket => Object.keys(ticket.relayWork.eventsToSave).length)))
  // dbWorker.postMessage({ tickets })
  // Object.values(dbTicketQueue).filter(ticket => ['stream', 'update'].includes(ticket.type)).forEach(ticket => ticket.relayWork.eventsToSave = {})
  // dbTicketQueue = {}
}

function checkTicketForCompletion(ticket) {
  // // if all relays have returned eose
  // let relaysAwaitingEose = ticket.relayWork.relays.filter(url => {
  //   let relayStatus = getRelayStatus()
  //   if (!relayStatus[url] || !relayStatus[url].connected) return false
  //   if (Object.keys(ticket.eose).includes(url)) return false
  //   return true
  // })
  // if (relaysAwaitingEose.length === 0) {
  // console.log('relays', ticket, getRelayStatus(), dbReady)
  // if (ticket.id.startsWith('dbStreamTagKin')) console.log('dbStreamTagKind ticket checking ', ticket, JSON.parse(JSON.stringify(ticket.relayWork.eventsToSave)), dbTicketQueue)
  if (!ticket.eose) return
  if (Object.keys(ticket.eose).length < 3 && ticket.type === 'call') return
  // if ((!ticket.eose || Object.keys(ticket.eose).length < 3) && ticket.type === 'call') return
    if (!dbTicketQueue[ticket.id]) dbTicketQueue[ticket.id] = ticket
    if (dbReady) advanceTicketsToDb()
    if (ticket.type === 'call') cancelTicket(ticket)
  // }
}

// function relayPool() {
  /*
  SELECT * FROM nostr_events
where id = '5750fff21769fdf86928d0be04e7a3be522f01bfe4085630d42464b5afd313fb';
-- SELECT * FROM nostr_users;
  */

  async function processTicket(ticket) {
    // if (!ticket.dbWork) ticket.dbWork = { eventsToSave: [] }
    // console.log('process ticket', ticket)
    if (!ticket.relayWork.eventsToSave) ticket.relayWork.eventsToSave = []
    ticket.relayWork.subName = ticket.relayWork.subName || 'adhoc'
    // let unconnectedUrls = ticket.relayWork.relays.filter(url => !relays[url])
    // await Promise.allSettled(unconnectedUrls.map(url => relayHandler(url).then(handler => relays[url] = handler)))
    // for (let url of unconnectedUrls) {
    //   if (!relays[url]) relays[url] = await relayHandler(url)
    // }
    ticket.relayWork.relays.forEach(async (url) => {
      if (!relays[url]) relays[url] = await relayHandler(url)
      relays[url].processTicket(ticket)
    })
  }

  function cancelTicket(ticket) {
    ticket.type = 'cancel'
    // console.log('cancelticket', relays, getRelayStatus(), ticket)
    for (let url in ticket.relayWork.relays) if (relays[url]) relays[url].processTicket(ticket)
  }

  // return {
  //   processTicket,
    function getRelayStatus() {
      let status = {}
      for (let url in relays) {
        status[url] = relays[url].status()
      }
      return status
    }
//   }
// }

async function relayHandler(url) {
  let subControl = {
    main: { queue: [], mode: 'stream' },
    feed: { queue: [], mode: 'call' },
    page: { queue: [], mode: 'stream' },
    profiles: { queue: [], mode: 'call' },
    events: { queue: [], mode: 'call' },
    adhoc: { queue: [], mode: 'call' },
  }
  let status = 'unconnected'
  let idSuffix = ' ' + Math.random().toString().slice(-4)
  // let connected = false
  // let connecting = false
  let hasEose = false
  const relay = relayInit(url)
  relay.on('connect', () => {
    console.log(`connected to ${url}`)
    status = 'connected'
    Object.keys(subControl).forEach(subName => startSub(subName))
  })
  relay.on('disconnect', () => {
    console.log(`disconnected from ${url}`)
    status = 'disconnected'
  })
  relay.on('notice', (notice) => {
    console.log(`notice from ${url}: ${notice}`)
  })
  relay.on('error', () => {
    console.log(`error on connection to ${url}`)
    status = 'error'
  })

  function getNextTicket(subName) {
    return subControl[subName].queue.shift() || null
  }

  function getSubFilter(subName) {
    let { ticket, queue } = subControl[subName]
    if (ticket) {
      let { filter } = ticket.relayWork
      return [filter]
    } else if (queue && queue.length) {
      let filters = queue.map(ticket => {
        // let since = ticket.eose[url]
        let { filter } = ticket.relayWork
        // if (hasEose) filter.since = since
        // console.log('startStreamTickets', url, filter, since)
        // if (!filter.limit) filter.limit = 200
        return filter
      })
      return filters
    } else return []
  }

  async function connect() {
    try {
      status = 'connecting'
      await relay.connect()
    } catch (error) {
      // console.log('error connecting to ', url, error)
    }
  }

  function startSub(subName) {
    if (!subControl[subName].queue?.length) return
    let filter = getSubFilter(subName)
    let sub = relay.sub(filter, {id: subName + idSuffix})
    sub.on('event', (event) => handleEvent(event, subName))
    sub.on('eose', () => handleEose(subName))
    subControl[subName].sub = sub
    subControl[subName].filter = filter
    subControl[subName].active = true
    if (subControl[subName].mode === 'stream') startStreamTickets(subName, true)
    else if (subControl[subName].mode === 'call') startNextTicket(subName, true)
  }

  function closeSub(subName) {
    if (subControl[subName].sub) subControl[subName].sub.unsub()
    delete subControl[subName].sub
    subControl[subName].active = false
    subControl[subName].ticket = null
    subControl[subName].filter = null
  }

  function startNextTicket(subName, subStarted = false) {
    let ticket = getNextTicket(subName)
    if (!ticket) closeSub(subName)
    else {
      subControl[subName].ticket = ticket
      let filter = getSubFilter(subName)
      // let { filter } = ticket.relayWork
      if (!subStarted && filter !== subControl[subName].filter) subControl[subName].sub.sub(filter)
      subControl[subName].filter = filter
      // subControl[subName].mode = 'query'
      subControl[subName].timeout = setTimeout(() => handleEose(subName, true), 5000)
    }
  }

  function startStreamTickets(subName, subStarted = false) {
    let tickets = subControl[subName].queue
    if (tickets && tickets.length) {
      subControl[subName].ticket = null
      let filter = getSubFilter(subName)
      if (!subStarted && filter !== subControl[subName].filter) subControl[subName].sub.sub(filter)
      subControl[subName].filter = filter
      // if (!subStarted) subControl[subName].sub.sub(getSubFilter(subName))
    // or close sub
    } else {
      closeSub(subName)
    }
  }

  function completeTicket(ticket, time = Math.round(Date.now() / 1000)) {
    // mark ticket with eose time for this relay and check if ticket is complete
    ticket.eose = ticket.eose || {}
    ticket.eose[url] = time
    if (time > 0 && ticket.type !== 'cancel') checkTicketForCompletion(ticket)

    // figure out what to sub next
    let { subName } = ticket.relayWork

    // move onto next ticket
    startNextTicket(subName)
  }

  function handleEvent(event, subName) {
    // console.log('handleEvent', queue, subName, event)
    let { mode, ticket, timeout, queue } = subControl[subName]
    // if (subName === 'main') console.log('handleEvent for main', event, subControl[subName])
    if (mode === 'call') {
      addEventToTicket(event, ticket)
      if (!hasEose) {
        if (timeout) clearTimeout(timeout)
        subControl[subName].timeout = setTimeout(() => handleEose(subName, true), 2000)
      }
    } else if (mode === 'stream') {
      let tickets = queue
      tickets.forEach(ticket => {
        if (matchFilter(ticket.relayWork.filter, event)) {
          addEventToTicket(event, ticket)
          checkTicketForCompletion(ticket)
        }
      })
    }
  }

  function handleEose(subName, manual = false) {
    // if (subName === 'main') console.log('handleEose for main', subControl[subName])
    if (!hasEose && !manual) {
      hasEose = true
      clearTimeout(subControl[subName].timeout)
      delete subControl[subName].timeout
    }
    let { mode, ticket, queue } = subControl[subName]
    // console.log('handleEose', queue, subName, ticket)
    if (mode === 'call') {
      if (!ticket) return
      completeTicket(ticket, manual ? 0 : Math.round(Date.now() / 1000))
      if (!manual && ticket.relayWork.eose) self.postMessage({ ticket: { id: ticket.id, eose: ticket.eose, success: true }})
    } else if (mode === 'stream') {
      let tickets = queue
      tickets.forEach(ticket => {
        ticket.eose = ticket.eose || {}
        ticket.eose[url] = Math.round(Date.now() / 1000)
        if (!manual && ticket.relayWork.eose) self.postMessage({ ticket: { id: ticket.id, eose: ticket.eose, success: true }})
      })
    }
  }

  function addEventToTicket(event, ticket) {
    // if (!ticket.relayWork.eventsToSave[event.id]) ticket.relayWork.eventsToSave[event.id] = { event, relays: {[url]: true}}
    // else ticket.relayWork.eventsToSave[event.id].relays[url] = true
    ticket.relayWork.eventsToSave.push({ event, relay: url})
  }

  async function addTicketToQueue(ticket, subName) {
    subControl[subName].queue.push(ticket)
    // if (!connected) return
    if (status === 'unconnected') await connect()
    else if (status === 'connected' && !subControl[subName].sub) startSub(subName)
    else if (status === 'connected' && subControl[subName].mode === 'stream') startStreamTickets(subName)
  }

  function updateTicket(ticket, subName) {
    // remove ticket from queue
    // console.log('updateTicket', ticket, subName, JSON.parse(JSON.stringify(subControl)))
    let index = subControl[subName].queue.findIndex(tck => tck.id === ticket.id)
    // console.log('updateTicket', index, ticket, subName, JSON.parse(JSON.stringify(subControl)))
    if (index !== -1) {
      if (JSON.stringify(subControl[subName].queue[index].relayWork.filter) === JSON.stringify(ticket.relayWork.filter)) return
      subControl[subName].queue[index].relayWork.filter = ticket.relayWork.filter
      if (!subControl[subName].sub) startSub(subName)
      else if (subControl[subName].mode === 'stream') startStreamTickets(subName)
    }
    // console.log('updateTicket', ticket, subName, JSON.parse(JSON.stringify(subControl)))
  }

  function cancelTicket(ticket, subName) {
    if (subControl[subName].ticket && subControl[subName].ticket.id === ticket.id) {
      subControl[subName].ticket.type = 'cancel'
      completeTicket(subControl[subName].ticket, 0)
    } else {
      // remove ticket from queue
      let index = subControl[subName].queue.findIndex(tck => tck.id === ticket.id)
      if (index !== -1) subControl[subName].queue.splice(index, 1)
      // if (subControl[subName].mode === 'stream' && subControl[subName].queue?.length) startStreamTickets(subName)
    }
    // console.log('cancelTicket', ticket, subName, JSON.parse(JSON.stringify(subControl)))
  }

  function publishTicket(ticket) {
    let { event } = ticket.relayWork
    let pub = relay.publish(event)
    pub.on('ok', () => {
      console.log(`${url} PUBLISH OK: event ${event.id} accepted`)
      addEventToTicket(event, ticket)
      checkTicketForCompletion(ticket)
      self.postMessage({ ticket: { id: ticket.id, results: true, success: true }})
    })
    pub.on('seen', () => {
      console.log(`${url} PUBLISH SEEN: event ${event.id} was seen`)
      addEventToTicket(event, ticket)
      checkTicketForCompletion(ticket)
      self.postMessage({ ticket: { id: ticket.id, results: true, success: true }})
    })
    pub.on('failed', reason => {
      console.log(`${url} PUBLISH FAILED: event ${event.id} failed because ${reason}`)
      self.postMessage({ ticket: { id: ticket.id, results: false, success: true }})
    })
  }

  const processTicket = (ticket) => {
    let { type } = ticket
    let { subName } = ticket.relayWork
    switch (type) {
      case 'call':
      case 'stream':
        addTicketToQueue(ticket, subName)
        return
      case 'update':
        // only for stream subs
        updateTicket(ticket, subName)
        return
      case 'cancel':
        cancelTicket(ticket, subName)
        return
      case 'publish':
        if (status === 'connected') publishTicket(ticket)
        return
    }
  }

  return {
    processTicket,
    status() {
      let subs = JSON.parse(JSON.stringify(subControl))
      return {
        status,
        subs
      }
    }
  }
}
