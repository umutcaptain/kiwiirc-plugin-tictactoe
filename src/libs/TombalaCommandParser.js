const TOMBALA_COMMAND_PREFIX = '!tombala';

const COMMAND_ALIASES = {
    yardim: 'yardim',
    baslat: 'baslat',
    katil: 'katil',
    basla: 'basla',
    cek: 'cek',
    seed: 'seed',
    durum: 'durum',
    kazan: 'kazan',
    bitir: 'bitir',
};

export function parseTombalaCommand(input) {
    if (!input || typeof input !== 'string') {
        return null;
    }

    const trimmed = input.trim();
    if (!trimmed.toLowerCase().startsWith(TOMBALA_COMMAND_PREFIX)) {
        return null;
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
        return { cmd: 'yardim', args: [] };
    }

    const rawSubcommand = parts[1].toLowerCase();
    const cmd = COMMAND_ALIASES[rawSubcommand];
    if (!cmd) {
        return { cmd: 'yardim', args: parts.slice(1) };
    }

    if (cmd === 'seed') {
        return {
            cmd,
            args: [parts.slice(2).join(' ').trim()].filter(Boolean),
        };
    }

    return {
        cmd,
        args: parts.slice(2),
    };
}

export function getTombalaHelpText() {
    return [
        '!tombala yardim',
        '!tombala baslat',
        '!tombala katil',
        '!tombala basla',
        '!tombala cek',
        '!tombala seed <string>',
        '!tombala durum',
        '!tombala kazan',
        '!tombala bitir',
    ].join(' | ');
}
