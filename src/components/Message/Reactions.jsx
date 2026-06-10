import { useEffect, useRef } from 'react';
import styles from './Reactions.module.css';

export default function Reactions({ reactions, emojiMap, onSelect, onClose, anchorRect }) {
  const panelRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  const panelStyle = anchorRect
    ? {
        position: 'fixed',
        top: anchorRect.top - 50,
        left: anchorRect.left
      }
    : {};
  
  return (
    <div ref={panelRef} className={styles.panel} style={panelStyle}>
      {reactions.map((reaction) => (
        <button
          key={reaction}
          type="button"
          onClick={() => onSelect(reaction)}
          className={styles.reaction}
        >
          {emojiMap[reaction]}
        </button>
      ))}
    </div>
  );
}