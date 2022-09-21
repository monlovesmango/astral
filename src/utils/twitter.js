// This will ONLY work with TypeScript on module: "commonjs"
import {TwitterApi} from 'twitter-api-v2'


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

  //const appOnlyClientFromConsumer = await client.appLogin()
  //const user = await twitterClient.v2.userByUsername('plhery')
  //console.log(user)
  await twitterClient.v1.tweet('Hello, this is a test.')
}
