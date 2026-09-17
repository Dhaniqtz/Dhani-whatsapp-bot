      const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const readline = require("readline");

const OWNER_NAME = "DHANI";
const PREFIX = "/";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  if (!sock.authState.creds.registered) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question("Enter WhatsApp number (+94XXXXXXXXX): ", async (number) => {
      rl.close();

      const phoneNumber = number.replace(/\D/g, "");

      try {
        const code = await sock.requestPairingCode(phoneNumber);

        console.log("\n================================");
        console.log("🤖 DHANI BOT PAIRING CODE");
        console.log("================================");
        console.log(code);
        console.log("================================\n");
      } catch (error) {
        console.error("Pairing failed:", error.message);
      }
    });
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ DHANI BOT CONNECTED!");
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
        startBot();
      } else {
        console.log("❌ WhatsApp session logged out.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const command = text.trim().toLowerCase();

    if (command === "/ping") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "🏓 Pong!\n🤖 DHANI BOT is online."
      });
    }

    if (command === "/owner") {
      await sock.sendMessage(msg.key.remoteJid, {
        text:
`╭─「 👑 BOT OWNER 」─
│
│ 👤 Name: ${OWNER_NAME}
│ 🤖 Bot: DHANI BOT
│ 🇱🇰 Country: Sri Lanka
│
╰────────────────`
      });
    }

    if (command === "/menu") {
      await sock.sendMessage(msg.key.remoteJid, {
        text:
`╭─「 🤖 DHANI BOT 」─
│
│ 🏓 /ping
│ 👑 /owner
│ 📋 /menu
│
╰────────────────
More features coming... 🔥`
      });
    }
  });
}

startBot().catch(console.error);
