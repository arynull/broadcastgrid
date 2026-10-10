# broadcastgrid

Self-hosted social command center: schedule once, publish everywhere.

`broadcastgrid` is a minimal, dependency-free Node.js CLI. It queues posts for
your channels in a local `data.json` file and publishes them one at a time.

## Requirements

- Node.js 18 or newer (stdlib only, no dependencies)

## Install

```sh
npm ci
npx broadcastgrid --version
```

Or run directly without installing:

```sh
node bin/broadcastgrid.js --version
```

## Commands

```sh
broadcastgrid --version
broadcastgrid --help
broadcastgrid post add --channel NAME --text TEXT
broadcastgrid post list [--limit N]
broadcastgrid queue run --once
```

### `post add --channel NAME --text TEXT`

Queue a new post. Prints `QUEUED <id>`.

```sh
broadcastgrid post add --channel mastodon --text "ship it"
# QUEUED p1
```

### `post list [--limit N]`

List posts (queued and published), oldest first. Prints one row per post as
`<id>\t<status>\t<channel>\t<text>`. `--limit` caps the number of rows and must
be a positive integer; anything else exits with code `2`. Default lists all.

```sh
broadcastgrid post list --limit 1
# p1	queued	mastodon	ship it
```

### `queue run --once`

Publish the oldest queued post, mark it published, and print `PUBLISHED <id>`.
Prints `QUEUE EMPTY` when nothing is queued.

```sh
broadcastgrid queue run --once
# PUBLISHED p1
```

## Data

State lives in `data.json` in the current directory. Point elsewhere with the
`BROADCASTGRID_DATA` environment variable.

## Development

```sh
npm run lint    # syntax check the CLI
npm run smoke   # end-to-end add/list/limit/run walkthrough
```

## License

MIT
