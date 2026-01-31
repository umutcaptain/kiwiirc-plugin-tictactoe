# Tombala for [Kiwi IRC] (https://kiwiirc.com)

This plugin allows IRC users to play a game of Tombala inside allowed channels.

The plugin listens for `TAGMSG` events with the `+ayna.org/tombola` message tag and
renders the local player's card in the KiwiIRC media viewer. A Tombola controller bot
should publish draw events using the same message tag.

## Configuration

Set the allowed channels in Kiwi IRC settings under `tombola.allowedChannels`.

Example:

```json
{
  "tombola": {
    "allowedChannels": ["#tombala", "#oyunlar"]
  }
}
```

## Tombola bot

This repository includes a simple `irc-framework` bot under `bot/` that controls the
Tombola draw flow. Configure it with environment variables:

```bash
TOMBOLA_HOST=irc.example.org
TOMBOLA_PORT=6667
TOMBOLA_NICK=tombola-bot
TOMBOLA_USER=tombola
TOMBOLA_REAL="Tombola Bot"
TOMBOLA_CHANNELS="#tombala,#oyunlar"
TOMBOLA_MIN_PLAYERS=3
TOMBOLA_WAIT_SECONDS=60
TOMBOLA_DRAW_INTERVAL=20
TOMBOLA_TLS=true
TOMBOLA_TLS_REJECT_UNAUTHORIZED=false
node bot/src/bot.js
```

The bot:
- Starts a 60s lobby timer when the first player joins.
- Begins draws every 20s once at least 3 players have joined.
- Publishes cards and draw events with `+ayna.org/tombola` TAGMSG to the channel.
- Stops and resets the game if player count drops below the minimum.

#### Dependencies
* node (https://nodejs.org/)
* yarn (https://yarnpkg.com/)

#### Building the source

```console
$ yarn
$ yarn build
```

The plugin will then be built into dist/plugin-tombola.js


## License

[Licensed under the Apache License, Version 2.0](LICENSE).
