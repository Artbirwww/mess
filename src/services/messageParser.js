
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;

export const isDirectImageUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return IMAGE_EXTENSIONS.test(pathname);
  } catch {
    return false;
  }
};

export const extractUrls = (text) => {
  const urls = [];
  let match;
  while ((match = URL_REGEX.exec(text)) !== null) {
    urls.push({
      url: match[0],
      isImage: isDirectImageUrl(match[0])
    });
  }
  return urls;
};

export const parseMessageContent = (text) => {
  if (!text) return { text: '', images: [] };
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  URL_REGEX.lastIndex = 0;
  
  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const startIndex = match.index;
    
    if (startIndex > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, startIndex)
      });
    }
    
    const isImage = isDirectImageUrl(url);
    parts.push({
      type: isImage ? 'image' : 'link',
      url: url,
      content: url
    });
    
    lastIndex = startIndex + url.length;
  }
  
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  const images = parts.filter(p => p.type === 'image').map(p => p.url);
  const textParts = parts.filter(p => p.type === 'text');
  const links = parts.filter(p => p.type === 'link');
  
  let finalText = '';
  for (const part of parts) {
    if (part.type === 'text') {
      finalText += part.content;
    } else if (part.type === 'link') {
      finalText += part.url;
    }
  }
  
  return {
    text: finalText.trim(),
    images: images,
    links: links.map(l => l.url)
  };
};

export const processMessageForSend = (text, existingImages = []) => {
  const parsed = parseMessageContent(text);
  
  return {
    text: parsed.text,
    imageUrls: [...existingImages, ...parsed.images],
    hasAutoImages: parsed.images.length > 0
  };
};