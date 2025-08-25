# 🌩️ Cloudflare DDNS Updater

A lightweight, feature-rich Node.js service that automatically updates your Cloudflare DNS records when your IP address changes. Perfect for dynamic IP environments and home servers.

## ✨ Features

- 🚀 **Lightweight & Fast** - Minimal resource usage with efficient updates
- 🌐 **Dual Stack Support** - Both IPv4 (`A`) and IPv6 (`AAAA`) records
- 📱 **Slack Notifications** - Get notified when your IP changes
- 🔄 **Automatic Updates** - Configurable check intervals
- 🐳 **Docker Ready** - Easy deployment with Docker Compose
- ⚡ **Force Updates** - Manual update cycles when needed
- 🛡️ **Reliable** - Uses Cloudflare's own IP detection service

## 🔧 Dependencies

- `https://cloudflare.com/cdn-cgi/trace` - Cloudflare's IP detection
- `https://www.ipify.org/` - External IP verification

## 📊 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=rohit267/cloudflare-dns-updater&type=Timeline)](https://star-history.com/#rohit267/cloudflare-dns-updater&Timeline)

## 🚀 Quick Start

### 1. Configuration

Create a `config.json` file in the root directory or copoy from `config.example.json` and rename it to `config.json`. Update the fields with your Cloudflare and Slack details.

```json
{
    "cloudflare": {
        // Enable IPv6 support for DNS records
        "ipv6Enabled": false,
        // Cloudflare API token - replace with your actual token: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
        "token": "YOUR_CLOUDFLARE_API_TOKEN",
        // Cloudflare account email - replace with your email
        "email": "your-email@example.com",
        // Number of forced update cycles (0 = disabled)
        "forceUpdateCycles": 0,
        // DNS records to update
        "records": [
            {
                // Domain name to update
                "name": "subdomain.yourdomain.com",
                // Record type (A for IPv4, AAAA for IPv6)
                "type": "A",
                // Whether to proxy through Cloudflare
                "proxied": false,
                // Cloudflare zone ID - replace with your zone ID
                "zoneId": "YOUR_ZONE_ID"
            }
        ]
    },
    "slack": {
        "enabled": true,
        "webhookUrl": "https://slack.com/api/chat.postMessage",
        // Slack channel IDs to send notifications to
        "channels": ["YOUR_CHANNEL_ID"],
        // Slack bot token - replace with your token: https://api.slack.com/messaging/sending. Make sure bot is added to the channel.
        "token": "YOUR_SLACK_BOT_TOKEN"
    },
    // Request timeout in milliseconds
    "timeout": 3000,
    // Check interval in milliseconds (e.g., 15000 = 15 seconds)
    "updateInterval": 15000
}
```

### 2. Docker Deployment

```yaml
version: "3"

services:
    cloudflare-updater:
        image: ghcr.io/rohit267/cloudflare-node-ddns:latest
        container_name: cloudflare-updater
        restart: unless-stopped
        volumes:
            - ./config.json:/app/config.json
        network_mode: "host"
```

Run with: `docker-compose up -d`

## 📋 Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `ipv6Enabled` | Enable IPv6 support | `false` |
| `forceUpdateCycles` | Force update every N cycles | `0` |
| `updateInterval` | Check interval (ms) | `15000` |
| `timeout` | Request timeout (ms) | `3000` |
| `slack.enabled` | Enable Slack notifications | `false` |

## 🔔 Slack Notifications

Stay informed about your IP changes with built-in Slack integration. Configure your webhook URL and bot token to receive real-time notifications when DNS records are updated.
