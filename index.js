import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { promises as fsPromises } from "fs";
import puppeteer from "puppeteer";
import { v4 as uuid } from "uuid";

dotenv.config();
console.log("Started");
let URL = null;
let MESSAGE_ID = "";
let uploading = false;

const bot = new TelegramBot(process.env.token, {
    polling: true,
});

const isURL = (text) => {
    return /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi.test(
        text
    );
};

bot.on("text", async (msg) => {
    const text = msg?.text;

    if (!text || text.startsWith("/") || uploading) return;

    if (text === "🖼 Image" && URL) {
        uploading = true;

        const screenshotMsg = await bot.sendMessage(
            msg.chat.id,
            "Taking Screenshot😏"
        );

        console.log("Launching Browser");

        const browser = await puppeteer.launch({
            headless: "new",
            defaultViewport: null,
        });
        const page = await browser.newPage();

        await page.goto(URL, { timeout: 0 });

        const filePath = `${uuid()}.jpg`;

        await page.screenshot({
            path: filePath,
            fullPage: true,
            quality: 100,
        });

        const pageInfo = await page.evaluate(() => {
            const title = document.title;
            const width = document.body.clientWidth;
            const height = document.body.clientHeight;

            return { title, width, height };
        });

        await bot.editMessageText("Uploading to Telegram...", {
            chat_id: msg.chat.id,
            message_id: screenshotMsg.message_id,
        });

        const stats = await fsPromises.stat(filePath);

        await bot.sendPhoto(
            msg.chat.id,
            filePath,
            {
                reply_to_message_id: MESSAGE_ID,
                caption: `<a href="${URL}">${pageInfo.title}</a>`,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: `JPG (${pageInfo.width} x ${
                                    pageInfo.height
                                } ${Math.round(stats.size / 1024)} KB)`,
                                callback_data: "test",
                            },
                        ],
                    ],
                },
            },
            {
                contentType: "image/png",
            }
        );

        await bot.deleteMessage(msg.chat.id, screenshotMsg.message_id);

        await browser.close();

        await fsPromises.unlink(filePath);

        URL = null;
        MESSAGE_ID = "";
        uploading = false;

        bot.sendMessage(msg.chat.id, "Ready to receive new link 😏", {
            reply_markup: {
                remove_keyboard: true,
            },
        });

        return;
    }

    if (text === "📄 PDF" && URL) {
        uploading = true;

        const browser = await puppeteer.launch({
            headless: "new",
            defaultViewport: null,
        });
        const page = await browser.newPage();

        await page.goto(URL, { timeout: 0 });

        const filePath = `${uuid()}.pdf`;

        const pdftMsg = await bot.sendMessage(
            msg.chat.id,
            "Converting to PDF😏"
        );

        await page.pdf({
            path: filePath,
            format: "A4",
        });

        const pageInfo = await page.evaluate(() => {
            const title = document.title;

            return { title };
        });

        await bot.editMessageText("Uploading to Telegram...", {
            chat_id: msg.chat.id,
            message_id: pdftMsg.message_id,
        });

        await bot.sendDocument(
            msg.chat.id,
            filePath,
            {
                caption: `<a href="${URL}">${pageInfo.title}</a>`,
                parse_mode: "HTML",
                reply_to_message_id: MESSAGE_ID,
            },
            {
                contentType: "application/pdf",
            }
        );

        await bot.deleteMessage(msg.chat.id, pdftMsg.message_id);

        await browser.close();

        await fsPromises.unlink(filePath);

        URL = null;
        MESSAGE_ID = "";
        uploading = false;

        bot.sendMessage(msg.chat.id, "Ready to receive new link 😏", {
            reply_markup: {
                remove_keyboard: true,
            },
        });

        return;
    }

    if (!isURL(text)) {
        bot.sendMessage(msg.chat.id, "Please send a valid URL", {
            reply_to_message_id: msg.message_id,
        });

        return;
    }

    URL = text;
    MESSAGE_ID = msg.message_id;

    bot.sendMessage(msg.chat.id, "Select Format", {
        reply_to_message_id: msg.message_id,
        reply_markup: {
            resize_keyboard: true,
            keyboard: [["🖼 Image", "📄 PDF"]],
        },
    });
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        "I take screenshots of websites. I also convert websites to PDF\n\nJust send me a URL and let me manage the rest 😁",
        {
            reply_to_message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📢 About", callback_data: "About" },
                        { text: "👨‍💻Creator", url: "https://t.me/lex_tech" },
                    ],
                ],
            },
        }
    );
});

bot.on("callback_query", (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;

    if (action === "About") {
        const AboutText = `◻ <b>Bot</b> : <a href="https://t.me/url2imgfreeBot">URL To IMG</a>\n◻ <b>Creator</b> : <a href="https://t.me/lex_tech">Lite 🤩</a> \n◻ <b>Language</b> : <a href="https://nodejs.org">NodeJS</a>\n◻ <b>Version</b> : v0.0.1`;

        bot.editMessageText(AboutText, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            disable_web_page_preview: true,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "⏪Back", callback_data: "Back" },
                        { text: "👨‍💻Creator", url: "https://t.me/lex_tech" },
                    ],
                ],
            },
        });
    }

    if (action === "Back") {
        const BackText =
            "I take screenshots of websites. I also convert websites to PDF\n\nJust send me a URL and let me manage the rest 😁";

        bot.editMessageText(BackText, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📢 About", callback_data: "About" },
                        { text: "👨‍💻Creator", url: "https://t.me/lex_tech" },
                    ],
                ],
            },
        });
    }
});

process.on("uncaughtException", async (err) => {
    console.log(err.message);
    process.exit(1);
});
