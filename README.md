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
