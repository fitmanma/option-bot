const fs = require('fs');
const path = require('path');
const { StringSession } = require('telegram/sessions');
const { TelegramClient } = require('telegram');

const dataDir = path.join(process.cwd(), 'data'); // Папка для хранения данных
const sessionFilePath = path.join(dataDir, 'sessions.json'); // Путь к файлу сессий

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function readSessions() {
    if (!fs.existsSync(sessionFilePath)) return [];
    return JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
}

async function initAllTelegramClients(config) {
    const sessions = readSessions();
    if (sessions.length === 0) {
        console.log('Нет доступных сессий для инициализации.');
        return [];
    }

    const clients = [];

    for (const sessionData of sessions) {
        const session = new StringSession(sessionData.session);
        const client = new TelegramClient(session, config.telegram.apiId, config.telegram.apiHash, {
            connectionRetries: 5,
        });

        try {
            await client.connect();
            console.log(`Клиент для пользователя "${sessionData.username}" успешно подключен.`);
            clients.push({ username: sessionData.username, client });
        } catch (error) {
            console.error(`Ошибка подключения для пользователя "${sessionData.username}":`, error);
        }
    }

    return clients;
}

async function getChatMessages(client, chatId, limit = 10) {
    try {
        const inputEntity = await client.getInputEntity(chatId); // Получаем InputEntity
        const messages = await client.getMessages(inputEntity, {
            limit: limit, // Количество сообщений для получения
        });

        console.log(`Сообщения с пользователем ID ${chatId}:`);
        messages.forEach((msg) => {
            console.log(`[${msg.date}] ${msg.sender?.username || 'Неизвестно'}: ${msg.message}`);
        });

        return messages;
    } catch (error) {
        console.error(`Ошибка при получении сообщений с ID ${chatId}:`, error);
    }
}

module.exports = { initAllTelegramClients, getChatMessages };
