const fs = require('fs')
const path = require('path')
const { StringSession } = require('telegram/sessions')
const { TelegramClient } = require('telegram')

const dataDir = path.join(process.cwd(), 'data') // Папка для хранения данных
const sessionFilePath = path.join(dataDir, 'sessions.json') // Путь к файлу сессий

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

function readSessions() {
  if (!fs.existsSync(sessionFilePath)) return []
  return JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'))
}

async function initAllTelegramClients(config) {
  const sessions = readSessions()
  if (sessions.length === 0) {
    console.log('Нет доступных сессий для инициализации.')
    return []
  }

  const clients = []

  for (const sessionData of sessions) {
    const session = new StringSession(sessionData.session)
    const client = new TelegramClient(session, config.telegram.apiId, config.telegram.apiHash, {
      connectionRetries: 5,
    })

    try {
      await client.connect()
      console.log(`Клиент для пользователя "${sessionData.username}" успешно подключен.`)
      clients.push({ username: sessionData.username, client })
    } catch (error) {
      console.error(`Ошибка подключения для пользователя "${sessionData.username}":`, error)
    }
  }

  return clients
}

async function getUserId(client) {
  try {
    const user = await client.getMe()
    return user.id
  } catch (error) {
    console.error('Ошибка при получении ID пользователя:', error)
    return null
  }
}

async function getChatMessages(client, chatId, limit = 10) {
  try {
    const inputEntity = await client.getInputEntity(chatId) // Получаем InputEntity
    const messages = await client.getMessages(inputEntity, {
      limit: limit,
    })

    console.log(`Сообщения с пользователем ID ${chatId}:`)
    messages.forEach((msg) => {
      console.log(`[${msg.date}] ${msg.sender?.username || 'Неизвестно'}: ${msg.message}`)
    })

    return messages
  } catch (error) {
    console.error(`Ошибка при получении сообщений с ID ${chatId}:`, error)
  }
}

async function parseAndForwardMessages(sourceClient, targetClient, sourceChatId, targetChatId) {
  try {
    // Убедимся, что все сущности доступны
    await sourceClient.getDialogs()
    await targetClient.getDialogs()

    const sourceEntity = await sourceClient.getInputEntity(sourceChatId)
    const sourceChannelInfo = await sourceClient.getEntity(sourceChatId)
    const targetEntity = await targetClient.getInputEntity(targetChatId)
    const targetChannelInfo = await targetClient.getEntity(targetChatId)

    sourceClient.addEventHandler(async (event) => {
      if (event.message && event.message.peerId.channelId) {
        if (event.message.peerId.channelId.value === sourceEntity.channelId.value) {
          console.log(`Получено сообщение из группы: ${event.message.message}`)

          let messageText = event.message.message || ''
          let additionalText = '\n\n👉 Write to me: @Natan_Sharp_AI_TRADING'

          const mentionRegex = /@[\w_]+/g
          if (mentionRegex.test(messageText)) {
            console.log('Обнаружено упоминание в сообщении.')

            messageText = messageText.replace(mentionRegex, '@Natan_Sharp_AI_TRADING')
            additionalText = ''
          }

          if (event.message.media) {
            await targetClient.sendFile(targetEntity, {
              file: event.message.media,
              caption: messageText + additionalText,
            })
          } else {
            await targetClient.sendMessage(targetEntity, {
              message: messageText + additionalText,
            })
          }
          console.log(`Сообщение отправлено в целевую группу/канал.`)
        }
      }
    })

    console.log(`Парсим сообщения из группы ${sourceChannelInfo.title} и отправляем в ${targetChannelInfo.title}.`)
  } catch (error) {
    console.error('Ошибка при парсинге и пересылке сообщений:', error)
  }
}

module.exports = { initAllTelegramClients, getChatMessages, getUserId, parseAndForwardMessages }
