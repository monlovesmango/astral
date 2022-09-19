import { TwitterApi } from 'twitter-api-v2'

const userClient = new TwitterApi({
  appKey: this.$store.state.keys.CONSUMER_KEY,
  appSecret: this.$store.state.keys.CONSUMER_SECRET,
  // Following access tokens are not required if you are
  // at part 1 of user-auth process (ask for a request token)
  // or if you want a app-only client (see below)
  accessToken: this.$store.state.keys.ACCESS_TOKEN,
  accessSecret: this.$store.state.keys.ACCESS_TOKEN_SECRET,
})


// OAuth2 (app-only or user context)
// Create a client with an already known bearer token
const appOnlyClientFromConsumer = await userClient.appLogin()
