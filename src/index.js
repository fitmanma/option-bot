const { initAllTelegramClients, getChatMessages} = require('./services/telegramService');
const config = require('./config');

(async () => {
    try {
        const clients = await initAllTelegramClients(config);

        if (clients.length === 0) {
            console.log('Не удалось инициализировать ни одного пользователя.');
        } else {
            for (const { client } of clients) {
                const dialogs = await client.getDialogs();

                dialogs.find(dialog => {
                    console.log(dialog.name, dialog.id.value);
                });
            }

        }
    } catch (error) {
        console.error('Ошибка при инициализации клиентов Telegram:', error);
    }
})();
