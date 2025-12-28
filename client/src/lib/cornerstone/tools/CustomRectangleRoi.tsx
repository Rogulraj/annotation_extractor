/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-plusplus */

import cornerstoneTools from 'cornerstone-tools';
import { getUnixTimeStamp } from '../../date/date-utils';
import { AppToolConfig } from '../config/AppToolConfig';
import { createTextBox } from './utils/custom-rectangle-roi.util';

const draw = cornerstoneTools.importInternal('drawing/draw')
const drawRect = cornerstoneTools.importInternal('drawing/drawRect')
const drawHandles = cornerstoneTools.importInternal('drawing/drawHandles')
const setShadow = cornerstoneTools.importInternal('drawing/setShadow')
const getNewContext = cornerstoneTools.importInternal('drawing/getNewContext')

// Modern green color palette
const greenPalette = {
  primary: '#22c55e',      // Green 500
  primaryDark: '#16a34a',  // Green 600
  primaryDeep: '#15803d',  // Green 700
  accent: '#4ade80',       // Green 400 (lighter for highlights)
  active: '#86efac',       // Green 300 (for active state)
  deleteRed: '#EF4444',    // Red 500
  deleteRedHover: '#DC2626', // Red 600
  white: '#FFFFFF',
  shadow: 'rgba(34, 197, 94, 0.4)', // Green shadow
};

const globalConfig = {
  mouseEnabled: true,
  touchEnabled: true,
  globalToolSyncEnabled: false,
  showSVGCursors: false,
  autoResizeViewports: true,
  lineDash: [6, 4], // Slightly longer dashes for modern look
};

export const CustomRectangleRoiToolName = 'CustomRectangleRoi'

const customConfiguration = {
  drawHandles: true,
  drawHandlesOnHover: false,
  hideHandlesIfMoving: false,
  renderDashed: false,
}

/**
 * Helper function to draw a rounded rectangle
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export class CustomRectangleRoiTool extends cornerstoneTools.RectangleRoiTool {
  name: string;
  
  configuration: any;
  
  constructor() {
    super({
      name: CustomRectangleRoiToolName,
      configuration: customConfiguration
    });
    this.name = CustomRectangleRoiToolName;
    this.configuration = customConfiguration;
  }

  /**
   * Override renderToolData to customize drawing behavior with modern green UI
   */
  renderToolData(evt: {
    currentTarget: any; detail: any; 
  }) {

    const toolData = cornerstoneTools.getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    const eventData = evt.detail;
    const { image, element } = eventData;

    const lineWidth = 2.5; // Slightly thinner for modern look
    const {lineDash} = globalConfig;

    const {
      handleRadius,
      drawHandlesOnHover,
      hideHandlesIfMoving,
      renderDashed,
    } = this.configuration;
    const context = getNewContext(eventData.canvasContext.canvas);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    draw(context, (context: any) => {
      for (let i = 0; i < toolData.data.length; i++) {
        const data = toolData.data[i];

        if (data.visible === false) {
          continue;
        }

        // Use green color scheme
        let color = greenPalette.active; // Active state - lighter green
        let labelBgColor = greenPalette.primary;

        if (!data.active) {
          color = data.color || greenPalette.primary;
          labelBgColor = data.color || greenPalette.primary;
        }

        const handleOptions = {
          color: greenPalette.accent,
          handleRadius: handleRadius || 5,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving,
        };

        setShadow(context, this.configuration);

        // Add subtle glow effect for the rectangle
        context.save();
        context.shadowColor = greenPalette.shadow;
        context.shadowBlur = 8;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 2;

        const rectOptions: any = { color, lineWidth };

        if (renderDashed) {
          rectOptions.lineDash = lineDash;
        }

        drawRect(
          context,
          element,
          data.handles.start,
          data.handles.end,
          rectOptions,
          'pixel',
          data.handles.initialRotation
        );

        context.restore();

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
        }

        // Get canvas coordinates
        const startCanvas = cornerstoneTools.external.cornerstone.pixelToCanvas(
          element,
          data.handles.start
        );
        const endCanvas = cornerstoneTools.external.cornerstone.pixelToCanvas(
          element,
          data.handles.end
        );

        const left = Math.min(startCanvas.x, endCanvas.x);
        const right = Math.max(startCanvas.x, endCanvas.x);
        const top = Math.min(startCanvas.y, endCanvas.y);

        // Modern Delete Icon with rounded corners and gradient
        if (AppToolConfig?.showDeleteIconForCustomRectangleRoi) {
          const deleteOption = data?._deleteIconOptions;

          const deleteIconBoxHeight = deleteOption?.height ?? 18;
          const deleteIconBoxWidth = deleteOption?.width ?? 18;
          const deleteIconX = deleteOption?.x ?? (right - deleteIconBoxWidth) + 2;
          const deleteIconY = deleteOption?.y ?? top - deleteIconBoxHeight - 4;
          const borderRadius = 4;
        
          // Draw shadow for delete button
          context.save();
          context.shadowColor = 'rgba(0, 0, 0, 0.3)';
          context.shadowBlur = 4;
          context.shadowOffsetX = 0;
          context.shadowOffsetY = 2;

          // Draw rounded delete button with gradient
          const gradient = context.createLinearGradient(
            deleteIconX, 
            deleteIconY, 
            deleteIconX, 
            deleteIconY + deleteIconBoxHeight
          );
          gradient.addColorStop(0, greenPalette.deleteRed);
          gradient.addColorStop(1, greenPalette.deleteRedHover);
          
          context.fillStyle = gradient;
          drawRoundedRect(context, deleteIconX, deleteIconY, deleteIconBoxWidth, deleteIconBoxHeight, borderRadius);
          context.fill();
          context.restore();

          // Draw "×" symbol (cleaner than X)
          context.fillStyle = greenPalette.white;
          context.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(
            '×',
            deleteIconX + deleteIconBoxWidth / 2,
            deleteIconY + deleteIconBoxHeight / 2 + 1
          );
        
          data._deleteIconBounds = {
            x: deleteIconX,
            y: deleteIconY,
            width: deleteIconBoxWidth,
            height: deleteIconBoxHeight,
          };
        }

        // Modern Label Badge
        const labelText = data?._rectLabel || "Label";
        let truncatedText = labelText;

        const maxLabelWidth = data?._deleteIconBounds?.x 
          ? data._deleteIconBounds.x - left - 12 
          : right - left - 10;

        const fontSize = 12;
        const paddingX = 8;
        const paddingY = 5;
        const borderRadius = 4;

        context.save();
        context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        const textWidth = context.measureText(labelText).width;
        const textHeight = fontSize;

        // Truncate text if needed
        if (textWidth > maxLabelWidth) {
          truncatedText = labelText;
          while (context.measureText(`${truncatedText}…`).width > maxLabelWidth && truncatedText.length > 0) {
            truncatedText = truncatedText.slice(0, -1);
          }
          truncatedText += '…';
        }

        const adjustedTextWidth = Math.min(textWidth, maxLabelWidth);
        const bgX = left;
        const bgY = top - textHeight - paddingY * 2 - 4;
        const bgWidth = adjustedTextWidth + paddingX * 2;
        const bgHeight = textHeight + paddingY * 2;

        // Draw label shadow
        context.shadowColor = 'rgba(0, 0, 0, 0.25)';
        context.shadowBlur = 6;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 2;

        // Draw gradient background for label
        const labelGradient = context.createLinearGradient(bgX, bgY, bgX, bgY + bgHeight);
        labelGradient.addColorStop(0, labelBgColor);
        labelGradient.addColorStop(1, greenPalette.primaryDeep);

        context.fillStyle = labelGradient;
        drawRoundedRect(context, bgX, bgY, bgWidth, bgHeight, borderRadius);
        context.fill();

        // Reset shadow for text
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;

        // Draw label text
        context.fillStyle = greenPalette.white;
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        const textX = bgX + paddingX;
        const textY = bgY + bgHeight / 2;
        context.fillText(truncatedText, textX, textY);

        context.restore();

        data._labelBounds = { x: bgX, y: bgY, width: bgWidth, height: bgHeight };

        if (AppToolConfig?.showTextBoxForCustomRectangleRoi) {
          createTextBox(
            image, 
            element, 
            data,
            eventData,
            context,
            this.configuration,
            { color: greenPalette.primary, lineWidth }
          );
        }
      }
    });
  }

  handleSelectedCallback(evt: any, toolData: any, handle: any, interactionType = 'mouse') {
    super.handleSelectedCallback(evt, toolData, handle, interactionType)
    const unixTimestamp = getUnixTimeStamp();
    toolData._modifiedAt = unixTimestamp
  }

}