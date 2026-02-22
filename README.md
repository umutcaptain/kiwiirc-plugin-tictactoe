# Tombala Plugin for KiwiIRC

Bu plugin, KiwiIRC üzerinde kanal içinde Tombala oyunu akışını yönetmek için hazırlanmıştır.

## Kurulum / Build

### Gereksinimler
- Node.js
- Yarn

### Kurulum
```bash
yarn
```

### Build
```bash
yarn build
```

Build çıktısı:

- `dist/plugin-tombala.js`

## `config.json` örneği

Aşağıdaki örnek, plugin'in hangi kanallarda çalışacağını (`allowlist`) ve çekiliş interval süresini (`interval`) gösterir.

```json
{
  "plugins": [
    {
      "name": "tombala",
      "src": "/static/plugins/plugin-tombala.js",
      "config": {
        "allowlist": ["#genel", "#oyun"],
        "interval": 8
      }
    }
  ]
}
```

- `allowlist`: Plugin komutlarının aktif olacağı kanal listesi.
- `interval`: Sayı çekiliş turu arası saniye cinsinden bekleme süresi.

## Komut tablosu

| Komut | Açıklama | Yetki |
|---|---|---|
| `!tombala baslat` | Kanalda yeni oyunu başlatır. | Operatör |
| `!tombala katil` | Oyuncuyu aktif oyuna dahil eder ve kart dağıtır. | Tüm kullanıcılar |
| `!tombala kartim` | Kullanıcının kartını özel mesaj veya uygun çıktı formatıyla gösterir. | Tüm kullanıcılar |
| `!tombala cinko` | Çinko iddiası yapar, doğrulama yapılır. | Aktif oyuncu |
| `!tombala tombala` | Tombala iddiası yapar, doğrulama yapılır. | Aktif oyuncu |
| `!tombala durum` | Oyunun mevcut durumunu (çekilen sayı, kalan oyuncu vb.) listeler. | Tüm kullanıcılar |
| `!tombala bitir` | Aktif oyunu zorla sonlandırır. | Operatör |

## Kanal / operatör kısıtları

- Plugin sadece `allowlist` içinde tanımlanan kanallarda komut kabul eder.
- `baslat` ve `bitir` komutları kanal operatör yetkisi gerektirir.
- `cinko` ve `tombala` komutları yalnızca o turda kartı bulunan aktif oyuncular için geçerlidir.
- Oyun dışı kanalda veya özel mesajda yapılan oyun komutları yok sayılır.

## Örnek oyun akışı

1. Operatör `!tombala baslat` komutunu girer.
2. Oyuncular `!tombala katil` ile oyuna dahil olur.
3. Sistem kartları üretir ve çekiliş turunu başlatır.
4. Çekiliş ilerledikçe oyuncular kartlarını kontrol eder.
5. Bir oyuncu satır tamamladığında `!tombala cinko` der; sistem doğrular ve sonucu anons eder.
6. Tüm kart tamamlandığında oyuncu `!tombala tombala` der; doğrulama başarılıysa oyun biter.
7. Gerekirse operatör `!tombala bitir` ile oyunu sonlandırır.

## Geliştirme testleri

```bash
yarn test
```

## Lisans

[Licensed under the Apache License, Version 2.0](LICENSE).
