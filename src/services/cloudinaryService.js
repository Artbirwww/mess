import { uploadFileToGitHub, uploadAvatarToGitHub } from './githubService';

export const uploadImageToCloudinary = async (file, fromId, toId) => {
  const chatId = [fromId, toId].sort().join('_');
  const result = await uploadFileToGitHub(file, 'chat', fromId, chatId);
  return result.url;
};

export const uploadFileToCloudinary = async (file, fromId, toId) => {
  const chatId = [fromId, toId].sort().join('_');
  return uploadFileToGitHub(file, 'chat', fromId, chatId);
};

export const uploadAvatarToCloudinary = async (file, userId) => {
  const result = await uploadFileToGitHub(file, 'avatar', userId);
  return result.url;
};