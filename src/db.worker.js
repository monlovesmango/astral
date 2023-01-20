self.process = {env: {}}

import initSqlJs from 'sql.js'
import sqlWasm from './sql-wasm.wasm'

let relayWorker = null
let eventWorker = null
let busy = true
let queue = []
let currentTicket = null
let interval = null

function handleMessage({ data, ports }) {
  let { action, ticket, withWorker } = typeof data === 'string' ? JSON.parse(data) : data
  if (!action) return
  // console.log('handleMessage (db)', data, ports)
  switch (action) {
    case 'setPort':
      if (withWorker === 'relay') {
        relayWorker = ports[0]
        relayWorker.onmessage = handleRelayMessage
      } else if (withWorker === 'event') {
        eventWorker = ports[0]
      }
      return
    case 'submit': {
      queueTickets([ticket])
      return
    }
  }
}

function handleRelayMessage({ data }) {
  let { tickets } = data
  // console.log('tickets-db', tickets, queue)
  queueTickets(tickets)
}


function queueTickets(tickets) {
  queue.push(...tickets)
  if (!busy) start()
}

function start() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
  busy = true
  if (relayWorker) relayWorker.postMessage({ status: 'busy' })
  let ticket = queue.shift()
  while (ticket) {
    processTicket(ticket)
    ticket = queue.shift()
  }
  stop()
}

function stop() {
  busy = false
  if (relayWorker) relayWorker.postMessage({ status: 'ready' })
  // interval = setInterval(() => {
  //   if (relayWorker) relayWorker.postMessage({ status: 'ready' })
  // }, 200)
}

function processTicket(ticket) {
  currentTicket = ticket
  let { action, call } = currentTicket.dbWork
  // if (ticket.id.startsWith('dbStreamTagKin')) console.log('dbStreamTagKind processing ', ticket)
  switch (action) {
    // case 'stream':
      case 'save': {
      let eventsToSave = currentTicket.relayWork.eventsToSave
      // let eventsToSave = Object.values(currentTicket.relayWork.eventsToSave)
      delete currentTicket.relayWork.eventsToSave
      try {
        currentTicket.results = saveEventsToDb(eventsToSave)
        currentTicket.success = true
      } catch (error) {
        currentTicket.success = false
        currentTicket.error = error
      }
      // console.log('ticket-db end', currentTicket)
      self.postMessage({ action: 'complete', ticket: currentTicket })
      return
    }
    case 'stream': {
      let eventsToSave = currentTicket.relayWork.eventsToSave
      // let eventsToSave = Object.values(currentTicket.relayWork.eventsToSave)
  // if (ticket.id.startsWith('dbStreamTagKin')) console.log('dbStreamTagKind events to save ', eventsToSave)
      delete currentTicket.relayWork.eventsToSave
      eventWorker.postMessage({ action: 'stream', ticket: currentTicket })
      try {
        saveEventsToDb(eventsToSave)
        currentTicket.success = true
      } catch (error) {
        currentTicket.success = false
        currentTicket.error = error
      }
      eventWorker.postMessage({ action: 'end', ticket: currentTicket })
      return
    }
    case 'query': {
      let { name, args } = call
      try {
        currentTicket.results = methods[name](...args)
        currentTicket.success = true
      } catch (error) {
        currentTicket.success = false
        currentTicket.error = error
      }
      // if (name === 'dbTagKind') console.log({ action: 'complete', ticket: currentTicket, name, args })
      self.postMessage({ action: 'complete', ticket: currentTicket })
      return
    }
  }
}


const cacheSize = 2000
const pageSize = 8192
const dbName = `events`
let SQL = null
let db = null


async function initDb() {
  // if (db) return
  if (SQL === null) SQL = await initSqlJs({ locateFile: () => sqlWasm })
  db = new SQL.Database()
  db.run(`
    PRAGMA cache_size=-${cacheSize};
    PRAGMA journal_mode=MEMORY;
    PRAGMA page_size=${pageSize};
    VACUUM;
  `)
  console.log(`Opened ${dbName} cache size: ${cacheSize}`)

  createTables(db)
  return
}

function handleInsertedEvent(event) {
  let { streamEvents } = currentTicket.dbWork
  if (!streamEvents) return
  event = JSON.parse(event)
  eventWorker.postMessage({ action: 'event', event })
}

function handleUpdatedEvent(event) {
  let { streamUpdates } = currentTicket.dbWork
  if (!streamUpdates) return
  event = JSON.parse(event)
  eventWorker.postMessage({ action: 'event', event })
}

function createTables(db) {
  console.log('creating tables and indexes', db)
  db.create_function('handleInsertedEvent', event => {
    handleInsertedEvent(event)
  })
  db.create_function('handleUpdatedEvent', event => {
    handleUpdatedEvent(event)
  })
  db.exec(`
    BEGIN TRANSACTION;
    CREATE TABLE IF NOT EXISTS nostr (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_kind_created_at ON nostr (json_extract(event,'$.kind'), json_extract(event,'$.created_at') DESC);
    CREATE INDEX IF NOT EXISTS idx_kind_pubkey_created_at ON nostr (json_extract(event,'$.kind'), json_extract(event,'$.pubkey'), json_extract(event,'$.created_at') DESC);

    CREATE TABLE IF NOT EXISTS idx_kind_tag_created_at (
      kind INTEGER NOT NULL,
      tag TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      id TEXT NOT NULL,
      pubkey TEXT NOT NULL,
      PRIMARY KEY(kind, tag, created_at, id)
      );
    CREATE TRIGGER IF NOT EXISTS nostr_tags_after_insert AFTER INSERT ON nostr
      WHEN json_array_length(json_extract(new.event,'$.tags')) > 0
      BEGIN
        INSERT OR IGNORE INTO idx_kind_tag_created_at (kind, tag, created_at, id, pubkey)
        SELECT DISTINCT json_extract(new.event, '$.kind'),
          lower(iif(
            instr(substr(tag.value, instr(tag.value, ',') + 1), ','),
            substr(tag.value, 1, instr(tag.value, ',') + instr(substr(tag.value, instr(tag.value, ',') + 1), ',') - 1)||']',
            tag.value
          )),
          json_extract(new.event, '$.created_at'),
          new.id,
          json_extract(new.event, '$.pubkey')
        FROM json_each(json_extract(new.event, '$.tags')) AS tag;
      END;
    CREATE TRIGGER IF NOT EXISTS nostr_tags_after_delete AFTER DELETE ON nostr
      WHEN json_array_length(json_extract(old.event,'$.tags')) > 0
      BEGIN
        DELETE FROM idx_kind_tag_created_at
        WHERE kind = json_extract(old.event,'$.kind') AND
          tag in (
            SELECT lower(iif(
                instr(substr(tag.value, instr(tag.value, ',') + 1), ','),
                substr(tag.value, 1, instr(tag.value, ',') + instr(substr(tag.value, instr(tag.value, ',') + 1), ',') - 1)||']',
                tag.value
              ))
            FROM json_each(json_extract(old.event,'$.tags')) AS tag
          ) AND
          created_at = json_extract(old.event,'$.created_at') AND
          id = old.id;
      END;
    CREATE TRIGGER IF NOT EXISTS nostr_after_insert AFTER INSERT ON nostr
      BEGIN
        SELECT handleInsertedEvent(new.event) AS '';
      END;
    CREATE TRIGGER IF NOT EXISTS nostr_after_update AFTER UPDATE ON nostr
      BEGIN
        SELECT handleUpdatedEvent(new.event) AS '';
      END;
    CREATE VIEW IF NOT EXISTS nostr_events AS
      SELECT id,
        json_extract(event,'$.pubkey') pubkey,
        json_extract(event,'$.created_at') created_at,
        json_extract(event,'$.kind') kind,
        json_extract(event,'$.tags') tags,
        json_extract(event,'$.content') content,
        json_extract(event,'$.seen_on') seen_on,
        json_extract(event,'$.first_seen') first_seen,
        json_extract(event,'$.last_updated') last_updated
        FROM nostr;
    CREATE VIEW IF NOT EXISTS nostr_users AS
      SELECT json_extract(event,'$.pubkey') pubkey,
        json_extract(json_extract(event,'$.content'),'$.name') name,
        json_extract(json_extract(event,'$.content'),'$.picture') picture,
        json_extract(json_extract(event,'$.content'),'$.about') about,
        json_extract(json_extract(event,'$.content'),'$.nip05') nip05,
        json_extract(json_extract(event,'$.content'),'$.lud06') lud06,
        CASE (ROW_NUMBER() OVER (
            PARTITION BY json_extract(event,'$.pubkey')
            ORDER BY json_extract(event,'$.created_at') DESC
          ))
          WHEN 1 THEN 1
          ELSE 0
          END is_current,
        json_extract(event,'$.created_at') created_at,
        json_extract(event,'$.seen_on') seen_on
      FROM nostr
      WHERE json_extract(event,'$.kind') = 0;
    COMMIT;`
  )
  console.log('Done')
}

function queryDb(sql) {
  let stmt = db.prepare(sql)
  let rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function saveEventsToDb(events) {
  if (!db) return
  if (!events.length) return
  let start = Date.now()
  // console.log('events', events)
  console.debug(`saving ${events.length} events...`)
  db.exec(`BEGIN TRANSACTION;
  `)

  let stmt = db.prepare(`
  INSERT INTO nostr (id, event)
    VALUES(?, ?)
    ON CONFLICT(id) DO UPDATE SET
    event=json_set(
      event,
      '$.seen_on',json_insert(json_extract(event,'$.seen_on'),'$[#]',json_extract(excluded.event,'$.seen_on[0]')),
      '$.last_updated',json_extract(excluded.event,'$.last_updated')
    )
    WHERE INSTR(json_extract(event,'$.seen_on'), json_extract(excluded.event,'$.seen_on[0]')) = 0;
    `)
  for (let i = 0; i < events.length; i++) {
    let { event, relay } = events[i]
    // let { event, relays } = events[i]
    if (event.created_at > (Math.round(Date.now() / 1000) + (10 * 60))) continue
    // if (!relays?.length) relays = [null]
    // for (let relay of relays) {
      event.first_seen = Math.round(Date.now() / 1000)
      event.last_updated = Math.round(Date.now() / 1000)
      event.seen_on = []
      if (relay) event.seen_on.push(relay)
      event.tags = event.tags.map(tag => tag.map(element => element.toLowerCase()))
      stmt.run([event.id, JSON.stringify(event)])
    // }
  }
  db.exec('COMMIT')
  stmt.free()
  let took = Date.now() - start
  console.debug('Done! Took: ' + took + ` for ${events.length} events`)
  return events.map(({event, relays}) => {
    event.seen_on = relays || []
    return event
  })
}

const methods = {
  dbSave(event) {
    let events = [{ event }]
    saveEventsToDb(events)
    return event
  },

  dbChats(pubkey) {
    let result = queryDb(`
      SELECT peer, MAX(last_message) last_message
      FROM (
        SELECT pubkey AS peer,
          MAX(created_at) last_message
        FROM idx_kind_tag_created_at
        WHERE kind = 4
          AND trim(substr(tag, 2, instr(tag, ',') - 2), '"') = 'p'
          AND trim(rtrim(substr(tag, instr(tag, ',') + 1), ']'), '"') = '${pubkey}'
        GROUP BY tag, pubkey

        UNION ALL

        SELECT trim(rtrim(substr(tag, instr(tag, ',') + 1), ']'), '"') AS peer,
          MAX(created_at) last_message
        FROM idx_kind_tag_created_at
        WHERE kind = 4
          AND trim(substr(tag, 2, instr(tag, ',') - 2), '"') = 'p'
          AND pubkey = '${pubkey}'
        GROUP BY tag, pubkey
      )
      GROUP BY peer
    `)

    return result
      .sort((a, b) => b.last_message - a.last_message)
      .map(row => {
        return {
          peer: row.peer,
          lastMessage: row.last_message
        }
      })
  },

  dbMessages(userPubkey, peerPubkey, limit, until) {
    let result = queryDb(`
      SELECT n.event
      FROM idx_kind_tag_created_at idx
      LEFT JOIN nostr n ON idx.id = n.id
      WHERE idx.kind = 4 AND
        ((idx.tag = '["p","${userPubkey}"]' AND idx.pubkey = '${peerPubkey}') OR
        (idx.tag = '["p","${peerPubkey}"]' AND idx.pubkey = '${userPubkey}')) AND
        idx.created_at <= ${until}
      ORDER BY idx.created_at DESC
      LIMIT ${limit}
    `)
    let messages = result
      .map(row => JSON.parse(row.event))
    return messages
  },

  dbEvent(id) {
    let result = queryDb(`
      SELECT event
      FROM nostr
      WHERE id = '${id}'
    `)
    return result.length ? JSON.parse(result[0].event) : null
  },

  dbEvents(ids) {
    let result = queryDb(`
      SELECT event
      FROM nostr
      WHERE id IN (${JSON.stringify(...ids)})
    `)
    return result.map(row => JSON.parse(row.event))
  },

  dbMentions(pubkey, limit, until) {
    let result = queryDb(`
      SELECT n.event
      FROM idx_kind_tag_created_at idx
      LEFT JOIN nostr n ON idx.id = n.id
      WHERE idx.kind = 1 AND
        idx.tag = '["p","${pubkey}"]' AND
        idx.created_at <= ${until}
      ORDER BY idx.created_at DESC
      LIMIT ${limit}
    `)
    return result.map(row => JSON.parse(row.event))
  },

  dbUnreadMentionsCount(pubkey, since) {
    let result = queryDb(`
      SELECT COUNT(*) count
      FROM idx_kind_tag_created_at
      WHERE kind = 1 AND
        tag = '["p","${pubkey}"]' AND
        created_at >= ${since}
    `)
    return result[0]?.count ? result[0].count : 0
  },

  dbUnreadMessagesCount(userPubkey, peerPubkey, since) {
    let result = queryDb(`
      SELECT COUNT(*) count
      FROM nostr
      WHERE json_extract(event,'$.kind') = 4 AND
        json_extract(event,'$.pubkey') = '${peerPubkey}' AND
        json_extract(event,'$.created_at') >= ${since} AND
        instr(json_extract(event,'$.tags'),'["p","${userPubkey}"')
    `)
    return result[0]?.count ? result[0].count : 0
  },

  dbProfile(pubkey) {
    let result = queryDb(`
      SELECT event
      FROM nostr
      WHERE json_extract(event,'$.kind') = 0 AND
        json_extract(event,'$.pubkey') = '${pubkey}'
      LIMIT 1
    `)
    return result.length ? JSON.parse(result[0].event) : null
  },

  dbFollows(pubkey) {
    let result = queryDb(`
      SELECT event
      FROM nostr
      WHERE json_extract(event,'$.kind') = 3 AND
        json_extract(event,'$.pubkey') = '${pubkey}'
      LIMIT 1
    `)
    return result.map(row => JSON.parse(row.event))
  },

  dbFollowers(pubkey) {
    let pubkeyTag = `'["p","${pubkey}"]'`
    let result = queryDb(`
      SELECT n.event
      FROM idx_kind_tag_created_at idx
      LEFT JOIN nostr n ON idx.id = n.id
      WHERE json_extract(event,'$.kind') = 3 AND
        idx.tag = ${pubkeyTag}
    `)
    return result.map(row => JSON.parse(row.event))
  },

  dbTagKind(type, value, kind, callback) {
    let values = Array.isArray(value) ? value : [value]
    let kinds = Array.isArray(kind) ? kind : [kind]
    let tagList = `(
      ${values.map(value => `'["${type}","${value}"]'`).join(',')}
    )`
    let result = queryDb(`
      SELECT n.event
      FROM idx_kind_tag_created_at idx
      LEFT JOIN nostr n ON idx.id = n.id
      WHERE idx.kind IN (${JSON.stringify(...kinds)}) AND
        idx.tag IN ${tagList}
    `)
    return result.map(row => JSON.parse(row.event))
  },

  dbQuery(sql) {
    return queryDb(sql)
  },

  // dbUserNotes(pubkey, until, limit) {
  //   let result = queryDb(`
  //     SELECT event
  //     FROM nostr
  //     WHERE json_extract(event,'$.kind') = 1 AND
  //       json_extract(event,'$.pubkey') = '${pubkey}' AND
  //       json_extract(event,'$.created_at') <= ${until}
  //     LIMIT ${limit}
  //   `)
  //   return result.map(row => JSON.parse(row.event))
  // },

  // dbStreamUserProfile(pubkey, callback) {
  //   let pubkeys = Array.isArray(pubkey) ? pubkey : [pubkey]
  //   let pubkeyList = `(
  //     ${pubkeys.map(pubkey => `'["p","${pubkey}"]'`).join(',')}
  //   )`
  //   let result = queryDb(`
  //     SELECT event
  //     FROM nostr
  //     WHERE json_extract(event,'$.kind') = 0 AND
  //       json_extract(event,'$.pubkey') IN ${pubkeyList}
  //   `)
  //   if (result.length) result.forEach(row => callback(JSON.parse(row.event)))
  //   return {
  //     filter: {
  //       kinds: [0],
  //       authors: pubkeys
  //     },
  //     callback,
  //     subName: 'subUserProfile',
  //     subArgs: [pubkeys]
  //   }
  // },

  // dbStreamUserFollows(pubkey, callback) {
  //   let pubkeys = Array.isArray(pubkey) ? pubkey : [pubkey]
  //   let result = queryDb(`
  //     SELECT event
  //     FROM nostr
  //     WHERE json_extract(event,'$.kind') = 3 AND
  //       json_extract(event,'$.pubkey') IN (${JSON.stringify(...pubkeys)})
  //   `)
  //   if (result.length) result.forEach(row => callback(JSON.parse(row.event)))
  //   return {
  //     filter: {
  //       kinds: [3],
  //       authors: pubkeys
  //     },
  //     callback,
  //     subName: 'subUserFollows',
  //     subArgs: [pubkeys]
  //   }
  // },

}

async function run() {
  self.onmessage = handleMessage
  // initialize db
  if (db === null) await initDb()

  // db is initialized now, start processing ticket queue
  start()
}

run()
