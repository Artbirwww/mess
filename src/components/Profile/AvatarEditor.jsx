import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './AvatarEditor.module.css';

export default function AvatarEditor({ initialImage, onSave, onCancel }) {
  const [image, setImage] = useState(initialImage || null);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, size: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target.result);
      setCropRect({ x: 0, y: 0, size: 200 });
    };
    reader.readAsDataURL(file);
  };
  
  const handleImageLoad = (e) => {
    const img = e.currentTarget;
    imageRef.current = img;
    const container = containerRef.current;
    if (!container) return;
    
    const maxSize = Math.min(container.clientWidth, 400);
    const scale = maxSize / Math.max(img.naturalWidth, img.naturalHeight);
    const displayWidth = img.naturalWidth * scale;
    const displayHeight = img.naturalHeight * scale;
    
    setCropRect({
      x: (displayWidth - 200) / 2,
      y: (displayHeight - 200) / 2,
      size: 200
    });
  };
  
  const handleMouseDown = (e) => {
    if (!imageRef.current) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropRect.x, y: e.clientY - cropRect.y });
  };
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !imageRef.current) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const maxX = imageRef.current.clientWidth - cropRect.size;
    const maxY = imageRef.current.clientHeight - cropRect.size;
    
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    setCropRect(prev => ({ ...prev, x: newX, y: newY }));
  }, [isDragging, dragStart, cropRect.size]);
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleSave = () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    
    canvas.width = 200;
    canvas.height = 200;
    
    ctx.drawImage(
      img,
      cropRect.x * scaleX,
      cropRect.y * scaleY,
      cropRect.size * scaleX,
      cropRect.size * scaleY,
      0,
      0,
      200,
      200
    );
    
    const croppedImage = canvas.toDataURL('image/jpeg', 0.9);
    onSave(croppedImage);
  };
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);
  
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Редактировать аватар</h3>
          <button type="button" onClick={onCancel} className={styles.close}>×</button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.uploadSection}>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileSelect}
              className={styles.fileInput}
              id="avatar-upload"
            />
            <label htmlFor="avatar-upload" className={styles.uploadLabel}>
              Выбрать изображение
            </label>
          </div>
          
          {image && (
            <div className={styles.editor}>
              <div
                ref={containerRef}
                className={styles.imageContainer}
                onMouseDown={handleMouseDown}
              >
                <img
                  src={image}
                  alt=""
                  className={styles.editorImage}
                  onLoad={handleImageLoad}
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                />
                {imageRef.current && (
                  <div
                    className={styles.cropOverlay}
                    style={{
                      left: cropRect.x,
                      top: cropRect.y,
                      width: cropRect.size,
                      height: cropRect.size
                    }}
                  >
                    <div className={styles.cropBorder} />
                  </div>
                )}
              </div>
              
              <div className={styles.previewSection}>
                <div className={styles.previewLabel}>Предпросмотр:</div>
                <div className={styles.preview}>
                  <canvas ref={canvasRef} width={200} height={200} className={styles.previewCanvas} />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!image}
            className={styles.saveButton}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}