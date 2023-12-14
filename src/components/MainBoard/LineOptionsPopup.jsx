import React from 'react';
import styles from './LineOptionsPopup.module.scss';

const LineOptionsPopup = ({ onClose, onChangeColor, onChangeWidth, position }) => {
  const { top, left } = position;

  const popupStyles = {
    top: `${top}px`,
    left: `${left}px`,
  };
  return (
    <div className={styles.popup} style={popupStyles}>
      <h3>Line Options</h3>
      <label htmlFor="colorPicker">Select Color:</label>
      <input type="color" id="colorPicker" onChange={onChangeColor} />

      <label htmlFor="widthRange">Select Width:</label>
      <input type="range" id="widthRange" min="1" max="10" onChange={onChangeWidth} />

      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default LineOptionsPopup;
