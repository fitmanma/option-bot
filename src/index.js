const { initAllTelegramClients, getUserId, parseAndForwardMessages } = require('./services/telegramService')
const config = require('./config')

;(async () => {
  try {
    const clients = await initAllTelegramClients(config)

    if (clients.length < 2) {
      console.log('Не удалось инициализировать оба аккаунта. Убедитесь, что оба сессии доступны.')
      return
    }

    let sourceClient, targetClient

    for (const { username, client } of clients) {
      const userId = await getUserId(client)
      if (!userId) {
        console.log(`Не удалось получить ID для пользователя "${username}".`)
        continue
      }

      if (userId.value === config.telegram.idAccountParser) {
        sourceClient = client
        console.log(`Аккаунт "${username}" настроен для парсинга сообщений.`)
      } else if (userId.value === config.telegram.idAccountSender) {
        targetClient = client
        console.log(`Аккаунт "${username}" настроен для отправки сообщений.`)
      }
    }

    if (!sourceClient || !targetClient) {
      console.error('Один из клиентов не настроен. Проверьте конфигурацию.')
      return
    }

    console.log('Настраиваем парсинг и пересылку сообщений...')
    await parseAndForwardMessages(
      sourceClient,
      targetClient,
      config.telegram.sourceChannel,
      config.telegram.targetTestChannel,
    )

    // const dialogs = await sourceClient.getDialogs()
    //
    // dialogs.find((dialog) => {
    //   console.log(dialog.name, dialog.id.value)
    // })
  } catch (error) {
    console.error('Ошибка при инициализации клиентов Telegram:', error)
  }
})()
