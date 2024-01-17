# Cloudflare DNS Updater
Simple Node.js Service to check and update your Cloudfalre DNS records whenever your IP Adreess changes.

## Features:
- Supports for `A` and `AAAA`
- Depends on `https://www.ipify.org/`

## Usage:
Make a config.json file with all info (in root dir of app).
```
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
    "internalInMinutes": 5
}
```
