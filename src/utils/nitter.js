export function fortmatResponse(res) {
      return JSON.stringify(res, null, 2)
    }

export async function getAllData(twitter_id) {
  const baseURL = `https://twiiit.com/${twitter_id}/rss`
  console.log(baseURL)
      try {
        const res = await fetch(baseURL)
        console.log(res)
        if (!res.ok) {
          const message = `An error has occured: ${res.status} - ${res.statusText}`
          throw new Error(message)
        }

        const data = res.json()
        return this.fortmatResponse(data)
      } catch (err) {
        return err.message
      }
    }

