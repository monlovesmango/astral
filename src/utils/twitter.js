// This will ONLY work with TypeScript on module: "commonjs"
import TwitterApi from 'twitter-api-v2'

// OAuth 1.0a (User context)
const userClient = new TwitterApi({
  appKey: this.$store.state.keys.CONSUMER_KEY,
  appSecret: this.$store.state.keys.CONSUMER_SECRET,
  // Following access tokens are not required if you are
  // at part 1 of user-auth process (ask for a request token)
  // or if you want a app-only client (see below)
  accessToken: this.$store.state.keys.ACCESS_TOKEN,
  accessSecret: this.$store.state.keys.ACCESS_TOKEN_SECRET,
})




export function getFeed() {
  // OAuth2 (app-only or user context)
// Create a client with an already known bearer token
// const appOnlyClient = new TwitterApi('bearerToken');
// OR - you can also create a app-only client from your consumer keys -
 appOnlyClientFromConsumer = await userClient.appLogin()

  const jsTweets = await appOnlyClientFromConsumer.v2.search('JavaScript', { 'media.fields': 'url' });

  // Consume every possible tweet of jsTweets (until rate limit is hit)
  for await (const tweet of jsTweets) {
    console.log(tweet);
  }
}
