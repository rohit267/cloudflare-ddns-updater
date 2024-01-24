# Cloudflare DNS Updater
Simple Node.js Service to check and update your Cloudflare DNS records whenever your IP Adreess changes.
It will check for your ip address in Cloudflare and your current ip and update it as provied in fixed intervals.

## Features:
- Supports for `A` and `AAAA`
- Depends on `https://www.ipify.org/`

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=rohit267/cloudflare-dns-updater&type=Timeline)](https://star-history.com/#rohit267/cloudflare-dns-updater&Timeline)


## Usage:
Make a config.json file with all info (in root dir of app).
```json
{
    "auth":{
        // Create a token with Edit DNS permission: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
        "token":"CLOUDFLARE_AUTH_TOKEN",
        "email": "CLOUDFLARE_EMAIL"
    },
    "records": [
        {
            "name":"example.com",
            "type":"A",
            "proxied":false,
            // Open a domain, the ZoneId should be visible on the right panel
            "zoneId":"ZONE_ID_OF_DOMAIN"
        }
    ],
    // In minutes
    "interval": 5
}
```
### Docker Compose
```yaml
version: '3'

services:
  cloudflare-updater:
    image: ghcr.io/rohit267/cloudflare-node-ddns:latest
    container_name: cloudflare-updater
    restart: unless-stopped
    volumes:
      - ./config.json:/app/config.json
    network_mode: "host"

```
