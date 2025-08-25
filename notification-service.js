import axios from "axios";
import { readFileSync } from "fs";

// notification-service to handle different notification types
export default class NotificationService {
    constructor(config) {
        console.log("NotificationService initialized");
        this.config = config;
    }

    async sendNotification(message) {
        await this.sendSlackNotification(message);
    }

    // Slack notification
    async sendSlackNotification(message) {
        const slack = this.config.slack;
        if (!slack?.webhookUrl || !slack?.enabled) return;

        const postToSlackChannel = async (message, channel, slack) => {
            const payload = {
                text: message,
                channel: channel,
            };

            await axios
                .post(slack.webhookUrl, payload, {
                    timeout: 3000,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${slack.token}`,
                    },
                })
                .catch((error) => {
                    console.error(`Failed to send Slack notification to channel ${channel}:`, error.message);
                });
        };

        await Promise.allSettled(slack.channels.map((ch) => postToSlackChannel(message, ch, slack)));
    }
}
