# astral

[astral](https://astral.ninja) is a web client for interacting with [Nostr](https://github.com/fiatjaf/nostr), a protocol that attempts to make decentralized social media a reality. astral began as a fork of [Branle](https://github.com/fiatjaf/branle).

## Install the dependencies
```bash
yarn install
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
yarn start
# or
npm run start
```

### Lint the files
```bash
yarn lint
# or
npm run lint
```

### Format the files
```bash
yarn format
# or
npm run format
```

### Build the app for production in PWA mode:
```bash
yarn build:pwa
# or
npm run build:pwa
```

### Build the app for production in SPA mode:
```bash
yarn build:spa
# or
npm run build:spa
```

## Docker

### Build the docker image (uses PWA mode):
```bash
docker build -t astral .
```

### Run the container:
```bash
docker run -d -p 8080:8000 --name astral astral
```

and connect to 'http://localhost:8080/'
