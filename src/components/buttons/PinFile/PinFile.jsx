import styles from './PinFile.module.css';

export default function PinFile({ fileInputRef, generalInputRef, uploading, onImageSelect, onFileSelect }) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageSelect}
        hidden
      />
      <input ref={generalInputRef} type="file" onChange={onFileSelect} hidden />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={styles.button}
        title="Attach image"
      >
        Image
      </button>
      <button
        type="button"
        onClick={() => generalInputRef.current?.click()}
        disabled={uploading}
        className={styles.button}
        title="Attach file"
      >
        File
      </button>
    </>
  );
}
