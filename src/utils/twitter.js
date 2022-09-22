// This will ONLY work with TypeScript on module: "commonjs"
import { TwitterApi } from 'twitter-api-v2'
import { TwitterApiV2Settings } from 'twitter-api-v2'

TwitterApiV2Settings.debug = true

export async function tweetTest(app, app_secret, access, access_secret) {
  const twitterClient = new TwitterApi({
    appKey: app,
    appSecret: app_secret,
    // Following access tokens are not required if you are
    // at part 1 of user-auth process (ask for a request token)
    // or if you want a app-only client (see below)
    accessToken: access,
    accessSecret: access_secret,
  })
  const appOnlyClientFromConsumer = await twitterClient.appLogin()

  //const appOnlyClientFromConsumer = await client.appLogin()
  //const user = await twitterClient.v2.userByUsername('plhery')
  //console.log(user)
  //await twitterClient.v1.tweet('Hello, this is a test.')
  //await appOnlyClientFromConsumer.v2.tweet('Hello, this is a test. Nostr Twastral')
  const homeTimeline = await appOnlyClientFromConsumer.v1.homeTimeline({ exclude_replies: true })

  // Consume every possible tweet of homeTimeline (until rate limit is hit)
  for await (const tweet of homeTimeline) {
    console.log(tweet)
  }
}
