const baseURL = 'https://bird.trom.tf/'

export function fortmatResponse(res) {
      return JSON.stringify(res, null, 2)
    }

export async function getAllData() {
      try {
        const res = await fetch(
          `${baseURL}/${this.$store.state.keys.CONSUMER_KEY}/rss`
        )

        if (!res.ok) {
          const message = `An error has occured: ${res.status} - ${res.statusText}`
          throw new Error(message)
        }

        const data = await res.json()

        const result = {
          status: res.status + '-' + res.statusText,
          headers: {
            'Content-Type': res.headers.get('Content-Type'),
            'Content-Length': res.headers.get('Content-Length'),
          },
          length: res.headers.get('Content-Length'),
          data: data,
        }

        return this.fortmatResponse(result.data)
      } catch (err) {
        return err.message
      }
    }

