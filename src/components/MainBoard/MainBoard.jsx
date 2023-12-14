import { fabric } from 'fabric';
import React, { useEffect, useRef, useState } from 'react';
import PdfReader from '../PdfReader/PDFReader';

import styles from './index.module.scss';
import LineOptionsPopup from './LineOptionsPopup';

let drawInstance = null;
let mouseDown = false;

const options = {
  currentMode: '',
  currentColor: '#000000',
  currentWidth: 5,
  fill: false,
  group: {},
};

const modes = {
  LINE: 'LINE',
};

const MainBoard = ({ aspectRatio = 4 / 3 }) => {
  const [canvas, setCanvas] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 10, left: 10 });
  const [fileReaderInfo, setFileReaderInfo] = useState({
    file: '',
    totalPages: null,
    currentPageNumber: 1,
    currentPage: '',
  });
  const canvasRef = useRef(null);
  const mainboardRef = useRef(null);

  const [showLineOptions, setShowLineOptions] = useState(false);
  const [lineOptions, setLineOptions] = useState({
    color: '#000000',
    width: 5,
  });

  const initCanvas = (width, height) => {
    const canvas = new fabric.Canvas('canvas', { height, width });
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.borderColor = '#4447A9';
    fabric.Object.prototype.cornerColor = '#4447A9';
    fabric.Object.prototype.cornerSize = 6;
    fabric.Object.prototype.padding = 10;
    fabric.Object.prototype.borderDashArray = [5, 5];

    canvas.on('object:added', (e) => {
      e.target.on('mousedown', removeObject(canvas));
    });
    canvas.on('path:created', (e) => {
      e.path.on('mousedown', removeObject(canvas));
    });

    return canvas;
  };
  function removeObject(canvas) {
    return (e) => {
      const activeObject = e.target;

      if (options.currentMode === modes.ERASER) {
        canvas.remove(activeObject);
      } else {
        if (activeObject && activeObject.type === 'line') {
          const pointer = canvas.getPointer(e.e);
          setShowLineOptions(true);
          setLineOptions({
            color: activeObject.stroke,
            width: activeObject.strokeWidth,
          });
          setPopupPosition({ top: pointer.y, left: pointer.x });
        }
      }
    };
  }

  function stopDrawing() {
    mouseDown = false;
  }

  function removeCanvasListener(canvas) {
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
  }

  function createLine(canvas) {
    if (modes.currentMode !== modes.LINE) {
      options.currentMode = modes.LINE;

      removeCanvasListener(canvas);
      canvas.on('mouse:down', startAddLine(canvas));
      canvas.on('mouse:move', startDrawingLine(canvas));
      canvas.on('mouse:up', stopDrawing);

      canvas.selection = false;
      canvas.hoverCursor = 'auto';
      canvas.isDrawingMode = false;
      canvas.getObjects().map((item) => item.set({ selectable: false }));
      canvas.discardActiveObject().requestRenderAll();
    }
  }

  function startAddLine(canvas) {
    return ({ e }) => {
      mouseDown = true;
      setShowLineOptions(false); // Hide line options popup when drawing a line

      let pointer = canvas.getPointer(e);
      drawInstance = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        strokeWidth: options.currentWidth, // Use default width
        stroke: options.currentColor, // Use default color
        selectable: true,
      });

      canvas.add(drawInstance);
      canvas.requestRenderAll();

      drawInstance.on('added', () => {
        drawInstance.set({
          stroke: options.currentColor, // Update line color after it's added to the canvas
        });
        canvas.requestRenderAll();
      });
    };
  }

  function startDrawingLine(canvas) {
    return ({ e }) => {
      if (mouseDown) {
        const pointer = canvas.getPointer(e);
        drawInstance.set({
          x2: pointer.x,
          y2: pointer.y,
        });
        drawInstance.setCoords();
        canvas.requestRenderAll();
      }
    };
  }

  function handleResize(callback) {
    const resize_ob = new ResizeObserver(callback);

    return resize_ob;
  }

  function resizeCanvas(canvas, mainboard) {
    return () => {
      const ratio = canvas.getWidth() / canvas.getHeight();
      const mainboardWidth = mainboard.clientWidth;

      const scale = mainboardWidth / canvas.getWidth();
      const zoom = canvas.getZoom() * scale;
      canvas.setDimensions({ width: mainboardWidth, height: mainboardWidth / ratio });
      canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
    };
  }

  useEffect(() => {
    if (mouseDown) {
      setShowLineOptions(true); // Show the line options popup after drawing a line
    }
  }, [mouseDown]);

  useEffect(() => {
    if (!canvas && canvasRef.current) {
      const canvas = initCanvas(
        mainboardRef.current.clientWidth,
        mainboardRef.current.clientWidth / aspectRatio,
      );
      setCanvas(() => canvas);

      handleResize(resizeCanvas(canvas, mainboardRef.current)).observe(mainboardRef.current);
    }
  }, [canvasRef]);

  useEffect(() => {
    if (canvas) {
      const center = canvas.getCenter();
      fabric.Image.fromURL(fileReaderInfo.currentPage, (img) => {
        img.scaleToHeight(canvas.height);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          top: center.top,
          left: center.left,
          originX: 'center',
          originY: 'center',
        });

        canvas.renderAll();
      });
    }
  }, [fileReaderInfo.currentPage]);

  function changeLineColor(e) {
    const newColor = e.target.value;
    setLineOptions({ ...lineOptions, color: newColor });

    // Update the stroke color of the currently drawn line
    if (drawInstance) {
      drawInstance.set('stroke', newColor);
      canvas.requestRenderAll();
    }
  }

  function changeLineWidth(e) {
    const newWidth = parseInt(e.target.value, 10);
    setLineOptions({ ...lineOptions, width: newWidth });
  }

  function closeLineOptions() {
    setShowLineOptions(false);
    options.currentColor = lineOptions.color; // Update the current color after popup close
    options.currentWidth = lineOptions.width; // Update the current width after popup close
  }

  function onFileChange(event) {
    updateFileReaderInfo({ file: event.target.files[0], currentPageNumber: 1 });
  }

  function updateFileReaderInfo(data) {
    setFileReaderInfo({ ...fileReaderInfo, ...data });
  }

  return (
    <div ref={mainboardRef} className={styles.mainboard}>
      <div className={styles.toolbar}>
        <div className={styles.header}>
          <label htmlFor="fileInput">
            <div className={styles.inputbutton}>
              <span>Upload PDF</span>
              <input type="file" id="fileInput" onChange={onFileChange} />
            </div>
          </label>
          <button type="button" onClick={() => createLine(canvas)} disabled={!fileReaderInfo.file}>
            Line
          </button>
          {showLineOptions && (
            <LineOptionsPopup
              onClose={closeLineOptions}
              onChangeColor={changeLineColor}
              onChangeWidth={changeLineWidth}
              position={popupPosition}
            />
          )}
        </div>
      </div>
      <canvas ref={canvasRef} id="canvas" />
      <div>
        <PdfReader fileReaderInfo={fileReaderInfo} updateFileReaderInfo={updateFileReaderInfo} />
      </div>
    </div>
  );
};

export default MainBoard;
