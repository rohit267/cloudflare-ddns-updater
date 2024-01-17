const axios = require("axios");
const https = require("https");

const v4Agemt = new https.Agent({
    family: 4,
});

async function getPublicIp(v = 4) {
    try {
        const url =
            v == 4
                ? "https://api.ipify.org?format=json"
                : "https://api64.ipify.org?format=json";
        const response = await axios.get(url);
        const ip = response.data.ip;
        return ip;
    } catch (error) {
        console.error("Failed to get public IP", error);
        return null;
    }
}

// Get record from cloudflare
async function getRecord(zoneIdentifier, recordName, v = "A") {
    const { auth } = require("./config.json");
    try {
        const response = await axios.get(
            `https://api.cloudflare.com/client/v4/zones/${zoneIdentifier}/dns_records?type=${v}&name=${recordName}`,
            {
                headers: {
                    "X-Auth-Email": auth.email,
                    "Authorization": "Bearer "+ auth.token,
                    "Content-Type": "application/json",
                },
                httpsAgent: v4Agemt,
            }
        );
        if (response.data.result_info.count === 0) {
            console.error(
                `Record does not exist, perhaps create one first? for ${recordName}`
            );
            return null;
        }
        return response.data.result[0];
    } catch (error) {
        console.error("Failed to get record", error.message);
        console.error(JSON.stringify(error?.response?.data, null, 2));
        return null;
    }
}

// Update record in cloudflare
async function updateRecord(
    zoneIdentifier,
    recordIdentifier,
    ip,
    proxied = false
) {
    const { auth } = require("./config.json");
    try {
        await axios.patch(
            `https://api.cloudflare.com/client/v4/zones/${zoneIdentifier}/dns_records/${recordIdentifier}`,
            {
                content: ip,
                ttl: 300,
                proxied,
            },
            {
                headers: {
                    "X-Auth-Email": auth.email,
                    "Authorization": "Bearer " + auth.token,
                    "Content-Type": "application/json",
                },
                httpsAgent: v4Agemt,
            }
        );
        return true;
    } catch (error) {
        console.error("Failed to update record", error.message);
        console.error(JSON.stringify(error?.response?.data, null, 2));
        return false;
    }
}

async function startUpdate() {
    console.log("Starting cycle");
    const { records } = require("./config.json");

    for (let i = 0; i < records.length; i++) {
        const { name, proxied, type, zoneId } = records[i];
        console.log("Updating record", name);

        console.log("Fetching public IP...");
        const ip = await getPublicIp(type == "AAAA" ? 6 : 4);
        if (!ip) {
            console.error("Failed to get public IP");
            continue;
        }
        console.log("Public IP is", ip);

        console.log("Fetching record...");
        const recordData = await getRecord(zoneId, name, type);
        if (!recordData) {
            console.error("Failed to get record for record", name);
            continue;
        }
        console.log("Record IP is", recordData.content);
        if (recordData.content == ip) {
            console.log("IP has not changed for record", name);
            continue;
        }
        console.log("IP has changed for record", name);

        console.log("Updating record...");
        const result = await updateRecord(zoneId, recordData.id, ip, proxied);
        if (!result) {
            console.error("Failed to update record for record", records[i]);
            continue;
        }
        console.log("Updated record", recordData.name, recordData.content, ip);
    }

    console.log("Cycle complete");
}

const interval = setInterval(startUpdate, require("./config.json").interval * 60 * 1000);

console.log("Service started");

process.on("SIGTERM", () => {
    clearInterval(interval);
    process.exit();
});

process.on("SIGINT", () => {
    clearInterval(interval);
    process.exit();
});
