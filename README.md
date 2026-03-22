# Firebase Messenger 💬

Мессенджер в терминальном стиле с поддержкой обмена изображениями через Cloudinary.

## Особенности

- 🔐 Аутентификация через Firebase
- 💬 Обмен сообщениями в реальном времени
- 🖼️ Отправка изображений через Cloudinary
- 📱 Адаптивный дизайн для ПК и мобильных
- 🔔 Уведомления о новых сообщениях
- 📋 Список активных чатов
- 🔍 Поиск пользователей по email

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка Firebase

1. Создайте проект на [Firebase Console](https://console.firebase.google.com/)
2. Включите **Authentication** (Email/Password)
3. Создайте **Firestore Database**
4. Скопируйте конфигурацию из проекта

### 3. Настройка Cloudinary (для изображений)

1. Зарегистрируйтесь на [Cloudinary](https://cloudinary.com/)
2. Создайте **Upload Preset** с режимом **Unsigned**
3. Получите **Cloud Name**

Подробная инструкция в [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md)

### 4. Создание файла .env

Скопируйте `.env.example` в `.env` и заполните переменные:

```bash
# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=messenger_uploads
```

### 5. Запуск

```bash
npm run dev
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск dev-сервера |
| `npm run build` | Сборка проекта |
| `npm run preview` | Предпросмотр сборки |
| `npm run deploy` | Деплой на GitHub Pages |

## Технологии

- **React 18** + TypeScript
- **Vite** — сборка
- **Firebase** — Auth, Firestore
- **Cloudinary** — хранение изображений

## Структура проекта

```
src/
├── components/
│   ├── Auth.tsx         # Форма входа/регистрации
│   ├── Chat.tsx         # Компонент чата
│   ├── Search.tsx       # Поиск пользователей
│   ├── ActiveChatsList.tsx  # Список чатов
│   └── Notifications.tsx    # Уведомления
├── lib/
│   └── cloudinary.ts    # Интеграция с Cloudinary
├── firebase.ts          # Firebase конфигурация
├── App.tsx              # Главный компонент
└── main.tsx             # Точка входа
```

## Правила Firestore

Для работы мессенджера добавьте следующие правила в Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Пользователи
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Чаты и сообщения
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
      
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Временные метки прочтения
    match /readTimes/{readTimeId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Бесплатные лимиты

### Firebase (Spark Plan)
- Auth: 10K пользователей/мес
- Firestore: 1 GB хранения, 50K чтений/день

### Cloudinary (Free Plan)
- 25 GB хранилища
- 25 GB трафика/мес
- 25 000 трансформаций/мес

## Лицензия

MIT
