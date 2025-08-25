import axios from "axios";
import https from "https";
import { readFileSync } from "fs";
import NotificationService from "./notification-service.js";

class CloudflareDDNSUpdater {
    constructor() {
        this.config = this.loadConfig();
        this.ns = new NotificationService(this.config);

        // Constants
        this.AGENTS = {
            v4: new https.Agent({ family: 4 }),
            v6: new https.Agent({ family: 6 }),
        };

        this.URLS = {
            CLOUDFLARE_TRACE: "https://cloudflare.com/cdn-cgi/trace",
            CLOUDFLARE_API: "https://api.cloudflare.com/client/v4",
            IPIFY_V4: "https://api.ipify.org?format=json",
            IPIFY_V6: "https://api64.ipify.org?format=json",
        };

        // State management
        this.state = {
            inProgress: false,
            currentIPs: { v4: "", v6: "" },
            recordIPs: {},
            counter: 1,
        };
        this.interval = null;
    }

    // Helper method to load config
    loadConfig() {
        return JSON.parse(readFileSync("./config.json", "utf8"));
    }

    // IP retrieval with fallback
    async getPublicIP(version = 4) {
        const agent = version === 4 ? this.AGENTS.v4 : this.AGENTS.v6;

        try {
            const response = await axios.get(this.URLS.CLOUDFLARE_TRACE, {
                httpsAgent: agent,
                timeout: this.config.timeout,
            });
            const match = response.data.match(/ip=(.*)/);
            if (match) return match[1];
            throw new Error("IP not found in trace response");
        } catch (error) {
            try {
                const url = version === 4 ? this.URLS.IPIFY_V4 : this.URLS.IPIFY_V6;
                const response = await axios.get(url, { timeout: config.timeout });
                return response.data.ip;
            } catch (fallbackError) {
                console.error(`Failed to get IPv${version} from all sources:`, fallbackError.message);
                await this.ns.sendNotification(`❌ Failed to get IPv${version} address from all sources`);
                return null;
            }
        }
    }

    // Cloudflare API functions
    async createCloudflareHeaders() {
        try {
            const { cloudflare } = this.config;
            return {
                "X-Auth-Email": cloudflare.email,
                Authorization: `Bearer ${cloudflare.token}`,
                "Content-Type": "application/json",
            };
        } catch (error) {
            console.error("Failed to load auth config:", error.message);
            await this.ns.sendNotification(`❌ Failed to load authentication config: ${error.message}`);
            throw error;
        }
    }

    async getRecord(zoneId, recordName, recordType = "A") {
        try {
            const headers = await this.createCloudflareHeaders();
            const response = await axios.get(`${this.URLS.CLOUDFLARE_API}/zones/${zoneId}/dns_records`, {
                params: { type: recordType, name: recordName },
                headers,
                httpsAgent: this.AGENTS.v4,
            });

            if (response.data.result_info.count === 0) {
                console.error(`No ${recordType} record found for ${recordName}`);
                await this.ns.sendNotification(`❌ No ${recordType} record found for ${recordName}`);
                return null;
            }

            return response.data.result[0];
        } catch (error) {
            console.error(`Failed to get record ${recordName}:`, error.message);
            await this.ns.sendNotification(`❌ Failed to get DNS record ${recordName}: ${error.message}`);
            return null;
        }
    }

    async updateRecord(zoneId, recordId, ip, proxied = false) {
        try {
            const headers = await this.createCloudflareHeaders();
            await axios.patch(
                `${this.URLS.CLOUDFLARE_API}/zones/${zoneId}/dns_records/${recordId}`,
                { content: ip, ttl: 300, proxied },
                { headers, httpsAgent: this.AGENTS.v4 }
            );
            return true;
        } catch (error) {
            console.error(`Failed to update record ${recordId}:`, error.message);
            await this.ns.sendNotification(`❌ Failed to update DNS record: ${error.message}`);
            return false;
        }
    }

    // Main update logic
    async updateDNSRecords() {
        if (this.state.inProgress) return [];

        this.state.inProgress = true;

        try {
            const { cloudflare } = this.config;
            const results = [];
            const updates = [];

            for (const record of cloudflare.records) {
                const { name, proxied, type, zoneId } = record;
                const version = type === "AAAA" ? 6 : 4;

                const ip = await this.getPublicIP(version);
                if (!ip) {
                    results.push(false);
                    continue;
                }

                const recordData = await this.getRecord(zoneId, name, type);
                if (!recordData) {
                    results.push(false);
                    continue;
                }

                const recordKey = `${name}-${type}`;
                this.state.recordIPs[recordKey] = recordData.content;

                if (recordData.content === ip) {
                    results.push(true);
                    continue;
                }

                console.log(`Updating ${name} (${type}): ${recordData.content} → ${ip}`);
                const success = await this.updateRecord(zoneId, recordData.id, ip, proxied);

                if (success) {
                    updates.push(`✅ ${name} (${type}): ${recordData.content} → ${ip}`);
                }

                results.push(success);
            }

            // Send Slack notification for successful updates
            if (updates.length > 0) {
                const message = `🔄 DNS Records Updated:\n${updates.join("\n")}`;
                await this.ns.sendNotification(message);
            }

            return results;
        } catch (error) {
            console.error("Error during DNS update:", error.message);
            await this.ns.sendNotification(`❌ Error during DNS update: ${error.message}`, true);
            return [];
        } finally {
            this.state.inProgress = false;
        }
    }

    // Check if update is needed
    needsUpdate(currentV4, currentV6) {
        if (currentV4 !== this.state.currentIPs.v4 || currentV6 !== this.state.currentIPs.v6) {
            return true;
        }

        return Object.values(this.state.recordIPs).some((recordIP) => recordIP !== currentV4 && recordIP !== currentV6);
    }

    // Main monitoring loop
    async monitorAndUpdate() {
        try {
            const { forceUpdateCycles } = this.config;
            // Force update every 4th cycle
            if (forceUpdateCycles > 0 && this.state.counter % forceUpdateCycles === 0) {
                this.state.counter = 1;
                await this.updateDNSRecords();
                return;
            }

            this.state.counter++;

            const [ipv4, ipv6] = await Promise.all([
                this.getPublicIP(4),
                this.config.cloudflare.ipv6Enabled ? this.getPublicIP(6) : Promise.resolve(null),
            ]);

            if (this.needsUpdate(ipv4, ipv6)) {
                const results = await this.updateDNSRecords();

                if (results.every((result) => result)) {
                    this.state.currentIPs.v4 = ipv4;
                    this.state.currentIPs.v6 = ipv6;
                } else {
                    console.error("Some records failed to update");
                    await this.ns.sendNotification("❌ Some DNS records failed to update");
                }
            }
        } catch (error) {
            console.error("Error in monitoring loop:", error.message);
            await this.ns.sendNotification(`❌ Error in monitoring loop: ${error.message}`);
        }
    }

    // Graceful shutdown
    setupGracefulShutdown() {
        const shutdown = (signal) => {
            console.log(`Received ${signal}, shutting down gracefully...`);
            this.ns.sendNotification(`🛑 DDNS Updater shutting down (${signal})`);
            this.stop();
            process.exit(0);
        };

        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
    }

    // Start the service
    async start() {
        console.log("Starting Cloudflare DDNS Updater...");
        // await this.ns.sendNotification("🚀 Cloudflare DDNS Updater started");
        this.interval = setInterval(() => this.monitorAndUpdate(), this.config.updateInterval);
        this.setupGracefulShutdown();
    }

    // Stop the service
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log("Cloudflare DDNS Updater stopped");
        }
    }
}

// Usage
const ddnsUpdater = new CloudflareDDNSUpdater();
ddnsUpdater.start();
