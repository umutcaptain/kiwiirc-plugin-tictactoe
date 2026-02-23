# Tombala Plugin for KiwiIRC (Server-Authoritative)

Bu plugin artık **server-authoritative** mimariyle çalışır:

- KiwiIRC plugin sadece UI gösterir ve kullanıcı komutlarını kanala yollar.
- Oyun state'i, çekiliş ve doğrulama sadece **tek bir IRC botu** tarafından yapılır.
- Böylece her kullanıcı client'ında paralel çekiliş çalışması problemi çözülür.

## Mimari

1. Kullanıcılar kanalda `!tombala ...` komutları gönderir.
2. Tombala botu komutu işler ve state üretir.
3. Bot event payload'larını kanal yerine kullanıcılara `NOTICE/PM` olarak `!tombala-event <json>` gönderir (kanal ekranını kirletmez).
4. Plugin sadece bu event'leri okuyup paneli günceller.

## Build

```bash
yarn
yarn build
```

Çıktı: `dist/plugin-tombala.js`

## Plugin config.json

Repo kökündeki `config.json` örneği:

```json
{
  "allowedChannels": ["#test", "#test1"],
  "autoDrawIntervalMs": 30000,
  "singleWinnerPerStage": true
}
```

- `allowedChannels`: plugin'in aktif olacağı kanallar

## Bot kurulumu (authority)

Örnek bot dosyası: `bot/tombala-bot.js`

> Not: Bot ayrı bir Node süreci olarak çalıştırılır.

Bot ortamında kurulum:

```bash
npm i irc-framework seedrandom
```

Çalıştırma:

```bash
IRC_HOST=irc.example.net \
IRC_PORT=6697 \
IRC_TLS=true \
IRC_TLS_REJECT_UNAUTHORIZED=true \
IRC_ADMIN_NICKS="test,umut" \
IRC_STRICT_OP_CHECK=false \
IRC_NICK=TombalaBot \
IRC_CHANNELS="#test,#test1" \
TOMBALA_INTERVAL_MS=30000 \
node bot/tombala-bot.js
```


Admin algılama:
- Bot önce IRC mode/prefix bilgisinden operatörü tespit eder.
- Bazı ağlarda mode bilgisi event içinde gelmiyorsa fallback olarak `IRC_ADMIN_NICKS` kullan.
- `IRC_ADMIN_NICKS` additif çalışır; listede olmasa da kanal operatörleri yine yetkili kabul edilir.
- Prefixli nick formatları (örn. `@nick`, `&nick`, `~nick`) normalize edilerek değerlendirilir.
- `IRC_STRICT_OP_CHECK=false` (default) ise op bilgisi hiç gelmediğinde yanlış red vermemek için izin verilir.

Bağlantı tanılama (debug):
- Bot açılırken host/port/tls bilgilerini konsola yazar.
- `registered`, `join`, `socket close`, `close`, `error` ve IRC `4xx/5xx` cevapları loglanır.

Eğer test ortamında self-signed sertifika varsa geçici olarak:

```bash
IRC_TLS_REJECT_UNAUTHORIZED=false
```

(Not: Bu ayar üretimde önerilmez.)

## Komutlar

- `!tombala yardim`
- `!tombala baslat`
- `!tombala katil` (aynı kullanıcı tekrar denerse bot yeniden kart/event basmaz, sadece uyarır)
- `!tombala basla`
- `!tombala cek`
- `!tombala durum`
- `!tombala kazan`
- `!tombala bitir`
- `!tombala seed <string>`

## Event formatı

Bot istemcilere şu formatta event gönderir:

```text
!tombala-event {"type":"state", ...}
```

Kullanılan tipler:

- `state`: genel durum (`status`, `drawnNumbers`, `winners`)
- `draw`: tek çekiliş (`number`)
- `card`: oyuncuya kart (`nick`, `card`)
- `reset`: oyun temizleme

## Test

```bash
node --test tests/tombala.test.js
```

## Lisans

[Licensed under the Apache License, Version 2.0](LICENSE).
