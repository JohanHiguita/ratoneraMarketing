
require("dotenv").config();
const XLSX = require("xlsx");
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// -------- CONFIG --------
const BATCH_SIZE = 50;
const MIN_DELAY_MS = 120000; // 2 min
const MAX_DELAY_MS = 300000; // 5 min

// -------- UTIL --------
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const randomDelay = () =>
  Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS) + MIN_DELAY_MS);

// -------- LOAD EXCEL --------
function loadContacts(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  return data.map((row) => ({
    phone: row.phone,
    name: row.name || "",
    tags: row.tags ? row.tags.split(",").map(t => t.trim()) : [],
    lastContact: row.last_contact || null,
    optOut: false,   // luego lo llenas desde DB
    blocked: false   // luego lo llenas desde webhook
  }));
}

// -------- FILTER --------
function filterContacts(contacts, requiredTags = []) {
  return contacts.filter(c => {
    if (c.optOut || c.blocked) return false;

    return requiredTags.every(tag => c.tags.includes(tag));
  });
}

// -------- MESSAGE BUILDER --------
function buildMessage(contact) {
  return `Hola ${contact.name || ""}, 
hace poco interactuaste con nosotros en un show 😄

Tenemos algo nuevo que puede interesarte. ¿Te cuento?`;
}

// -------- SEND --------
async function sendWhatsApp(to, body) {
  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:+${to}`,
      body
    });

    console.log("Sent:", to, message.sid);
  } catch (err) {
    console.error("Error sending to", to, err.message);
  }
}

// -------- BATCH PROCESS --------
async function processBatches(contacts) {
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    console.log(`Sending batch ${i / BATCH_SIZE + 1} (${batch.length})`);

    await Promise.all(
      batch.map(contact => {
        const msg = buildMessage(contact);
        return sendWhatsApp(contact.phone, msg);
      })
    );

    if (i + BATCH_SIZE < contacts.length) {
      const delay = randomDelay();
      console.log(`Waiting ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

// -------- MAIN --------
async function main() {
  const contacts = loadContacts("./contacts.xlsx");

  // ejemplo: solo los que fueron a bar_grande
  const filtered = filterContacts(contacts, ["bar_grande"]);

  console.log(`Total a enviar: ${filtered.length}`);

  await processBatches(filtered);
}

main();