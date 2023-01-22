let dbWorker
// let currentTicket
// let currentTicketEvents = {}
let ticketResults = {}
let currentTicketId = null
// let completedQueue = {}

function handleMessage({ data, ports }) {
  let { action } = typeof data === 'string' ? JSON.parse(data) : data
  if (!action) return
  // console.log('handleMessage (db)', data, ports)
  switch (action) {
    case 'setPort':
      dbWorker = ports[0]
      dbWorker.onmessage = handleDbMessage
      return
  }
}
// let log
function handleDbMessage({ data }) {
  let { action, ticket, event } = data
  // if (currentTicket && currentTicket.id.startsWith('dbStreamTagKin')) console.log('dbStreamTagKind processing ', currentTicket, data)
  switch (action) {
    case 'stream':
      // if (completedQueue[ticket.id]) {
      //   currentTicket = completedQueue[ticket.id]
      // } else currentTicket = ticket
      // currentTicketEvents = {}
      currentTicketId = ticket.id
      // console.log('handleDbMessage stream ticket', currentTicketId, JSON.parse(JSON.stringify(ticketResults)))
      ticketResults[currentTicketId] = ticketResults[currentTicketId] || {
        ticket,
        events: {},
        end: null
      }
      ticketResults[currentTicketId].end = null
      // console.log('handleDbMessage stream ticket', currentTicketId, JSON.parse(JSON.stringify(ticketResults)))
      // log = currentTicket.id.startsWith('streamMainProfilesFollows')
      return
    case 'event':
      // currentTicketEvents[event.id] = event
      ticketResults[currentTicketId].events[event.id] = event

      // console.log('handleDbMessage event', event, JSON.parse(JSON.stringify(ticketResults)))
    // if (event.id === '86d15bcf6e26042083ecfc69542feabf05bbf56fe6969471efface442890ed47') console.log('adding root event 86d15bcf6e26042083ecfc69542feabf05bbf56fe6969471efface442890ed47 to results', currentTicket, currentTicketEvents, completedQueue)
      return
    case 'end':
      // if (Object.keys(currentTicketEvents).length) {
      //   if (completedQueue[currentTicket.id]) {
      //     currentTicket.results.unshift(...Object.values(currentTicketEvents))
      //   } else {
      //     currentTicket.results = Object.values(currentTicketEvents)
      //     currentTicket.success = true
      //     completedQueue[currentTicket.id] = currentTicket
      //   }
      // }
      if (!Object.keys(ticketResults[currentTicketId].events).length) delete ticketResults[currentTicketId]
      else ticketResults[currentTicketId].end = Math.floor(Date.now() / 1000)
      currentTicketId = null
  // if (log) console.log('handleDbMessage end', currentTicket, currentTicketEvents, completedQueue)
      return
  }
}

function run() {
  self.onmessage = handleMessage

  setInterval(() => {
  // if (Object.keys(completedQueue).length) console.log('setInterval', completedQueue)
    // let tickets = Object.values(completedQueue)
    // completedQueue = {}
    // let ticket = tickets.shift()
    // while (ticket) {
    //   self.postMessage({ action: 'complete', ticket })
    //   ticket = tickets.shift()
    // }
    let completedTicketIds = Object.values(ticketResults).filter(({end}) => end < Math.floor(Date.now() / 1000) - 1).map(({ticket}) => ticket.id)
    // console.log('eventworker interval starting', ticketResults, completedTicketIds)
    for (let ticketId of completedTicketIds) {
      let { ticket, events, end } = ticketResults[ticketId]
      if (!end) continue
      delete ticketResults[ticketId]
      ticket.results = Object.values(events)
      ticket.success = true
      // if (ticket.results.length) console.log('eventworker interval', { action: 'complete', ticket }, ticketResults)
      if (ticket.results.length) self.postMessage({ action: 'complete', ticket })
    }
    // for (let ticket of Object.values(completedQueue)) self.postMessage({ action: 'complete', ticket })
  }, 1000)
}

run()
