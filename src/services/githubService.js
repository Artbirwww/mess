const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const REPO_OWNER = import.meta.env.VITE_GITHUB_REPO_OWNER;
const REPO_NAME = import.meta.env.VITE_GITHUB_REPO_NAME;
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main';

const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

console.log('GitHub token exists:', !!GITHUB_TOKEN);
console.log('GitHub token length:', GITHUB_TOKEN?.length);

if (!GITHUB_TOKEN) {
  console.error('GitHub token is missing! Check your .env file');
}

function getFileExtension(filename) {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function getContentType(filename) {
  const ext = getFileExtension(filename);
  const types = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    zip: 'application/zip'
  };
  return types[ext] || 'application/octet-stream';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
}

function generatePath(type, userId, chatId, fileName) {
  const timestamp = Date.now();
  const uniqueId = `${timestamp}_${Math.random().toString(36).substring(2, 8)}`;
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  switch (type) {
    case 'avatar':
      return `avatars/${userId}/${uniqueId}_${safeName}`;
    case 'chat':
      return `chats/${chatId}/${uniqueId}_${safeName}`;
    default:
      return `files/${userId}/${uniqueId}_${safeName}`;
  }
}

export async function uploadFileToGitHub(file, type, userId, chatId = null) {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub токен не настроен. Добавьте VITE_GITHUB_TOKEN в .env');
  }

  const base64Content = await fileToBase64(file);
  const filePath = generatePath(type, userId, chatId, file.name);
  const url = `${API_BASE}/${filePath}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Upload ${filePath}`,
      content: base64Content,
      branch: BRANCH
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Ошибка загрузки в GitHub');
  }

  const data = await response.json();
  const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${filePath}`;
  
  return {
    url: rawUrl,
    path: filePath,
    name: file.name,
    size: file.size,
    type: file.type || getContentType(file.name)
  };
}

export async function uploadAvatarToGitHub(file, userId) {
  return uploadFileToGitHub(file, 'avatar', userId);
}

export async function uploadChatFileToGitHub(file, userId, chatId) {
  return uploadFileToGitHub(file, 'chat', userId, chatId);
}

export async function deleteFileFromGitHub(filePath) {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub токен не настроен');
  }

  const url = `${API_BASE}/${filePath}`;
  
  const getResponse = await fetch(url, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  
  if (!getResponse.ok) {
    return;
  }
  
  const fileData = await getResponse.json();
  
  const deleteResponse = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Delete ${filePath}`,
      sha: fileData.sha,
      branch: BRANCH
    })
  });

  if (!deleteResponse.ok) {
    throw new Error('Ошибка удаления файла');
  }
}