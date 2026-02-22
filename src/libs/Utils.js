const games = {};

export function newGame(key, game) {
    games[key] = game;
}

export function getGame(key) {
    return games[key];
}

export function setGame(key, game) {
    games[key] = game;
}

export function removeGame(key) {
    delete games[key];
}

export function getGames() {
    return games;
}

export function incrementUnread(buffer) {
    // eslint-disable-next-line no-undef
    const activeBuffer = kiwi.state.getActiveBuffer();
    if (buffer && activeBuffer && activeBuffer !== buffer && typeof buffer.incrementFlag === 'function') {
        buffer.incrementFlag('unread');
    }
}
