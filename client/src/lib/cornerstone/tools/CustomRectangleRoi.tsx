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

const globalConfig = {
  mouseEnabled: true,
  touchEnabled: true,
  globalToolSyncEnabled: false,
  showSVGCursors: false,
  autoResizeViewports: true,
  lineDash: [4, 4],
};

export const CustomRectangleRoiToolName = 'CustomRectangleRoi'

const customConfiguration = {
  drawHandles: true,
  drawHandlesOnHover: false,
  hideHandlesIfMoving: false,
  renderDashed: false,
  // showMinMax: false,
  // showHounsfieldUnits: true
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
   * Override renderToolData to customize drawing behavior
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

    // const lineWidth = cornerstoneTools.toolStyle.getToolWidth();
    const lineWidth = 3
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
      // iterate tool data set and draw it
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < toolData.data.length; i++) {
        const data = toolData.data[i];

        if (data.visible === false) {
          // eslint-disable-next-line no-continue
          continue;
        }

        /**
         * NOTE:
         *  reason for below comment code is, to bypass the active rectangle box color
         */
        // const color = cornerstoneTools.toolColors.getColorIfActive(data);

        // default active color
        let color = "blue"

        if(!data.active) {
          color = data.color

          // default non-active color
          if(!color) {
            color = "#1d4ed8"
          }
        }

        const handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving,
        };

        setShadow(context, this.configuration);

        const rectOptions: any = { color, lineWidth };

        if (renderDashed) {
          rectOptions.lineDash = lineDash;
        }

        // Draw
        drawRect(
          context,
          element,
          data.handles.start,
          data.handles.end,
          rectOptions,
          'pixel',
          data.handles.initialRotation
        );

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
        }

        // Draw the label at the bottom center of the rectangle
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
        const bottom = Math.max(startCanvas.y, endCanvas.y);
        const top = Math.min(startCanvas.y, endCanvas.y);


        // Calculate the center of the bottom edge
        const centerX = (left + right) / 2;

        if(AppToolConfig?.showDeleteIconForCustomRectangleRoi) {

          const deleteOption = data?._deleteIconOptions

          const deleteIconBoxHeight = deleteOption?.height ?? 15;
          const deleteIconBoxWidth = deleteOption?.width ?? 15;
          const deleteIconX = deleteOption?.x ?? (right - deleteIconBoxWidth) + 1;
          const deleteIconY = deleteOption?.y ?? top - 15;
        
          // Draw the delete icon (a red rectangle here for simplicity)
          context.fillStyle = 'red';
          context.fillRect(deleteIconX, deleteIconY, deleteIconBoxWidth, deleteIconBoxHeight);


          // Add "X" text to the delete icon
          context.fillStyle = 'white'; // Text color
          context.font = 'bold 10px Arial'; // Font style
          context.textAlign = 'center'; // Center the text horizontally
          context.textBaseline = 'middle'; // Center the text vertically
          context.fillText(
            'X',
            deleteIconX + deleteIconBoxWidth / 2, // Center of the icon
            deleteIconY + deleteIconBoxHeight / 2 // Center of the icon
          );
        
          // Save the delete icon bounds for click detection
          data._deleteIconBounds = {
            x: deleteIconX,
            y: deleteIconY,
            width: deleteIconBoxWidth,
            height: deleteIconBoxHeight,
          };
        }

        // Define label properties
        const labelText = data?._rectLabel || "Label";

        let truncatedText = labelText;

        // Define maximum width for label text box to avoid overlap with delete icon
        const maxLabelWidth = data?._deleteIconBounds?.x ? data._deleteIconBounds.x - left - 10 : left - 10

        
        const fontSize = 14;
        const padding = 4;

        // Set font to measure text size
        context.save();
        context.font = `${fontSize}px Arial bold`;
        const textWidth = context.measureText(labelText).width;
        const textHeight = fontSize; // Approximate height based on font size

        // If text exceeds the maximum width, truncate it with ellipsis
        if (textWidth > maxLabelWidth) {
          const widthAvailable = maxLabelWidth; // Account for padding
          truncatedText = labelText;

          // Calculate how much space we have and truncate the text with ellipsis
          while (context.measureText(`${truncatedText  }..`).width > widthAvailable && truncatedText.length > 0) {
            truncatedText = truncatedText.slice(0, -1); // Remove last character
          }
          truncatedText += '..'; // Add ellipsis
        }

        // Draw the background rectangle for the label
        // If text exceeds max width, truncate it
        const adjustedTextWidth = Math.min(textWidth, maxLabelWidth);
        const bgX = left - 1; // Center the background
        const bgY = top - textHeight - padding * 2; // Position below the rectangle
        const bgWidth = adjustedTextWidth + padding * 2;
        const bgHeight = textHeight + padding * 2;

        context.fillStyle = color; // Background color
        context.fillRect(bgX, bgY, bgWidth, bgHeight);

        // Draw the label text
        context.fillStyle = 'white'; // Text color
        context.textAlign = 'left';
        context.textBaseline = 'middle'; // Vertically center the text
        const textX = bgX + padding; // Center X position
        const textY = bgY + bgHeight / 2; // Center Y position in the background
        context.fillText(truncatedText, textX, textY);

        // Store label bounds for click detection
        data._labelBounds = { x: bgX, y: bgY, width: bgWidth, height: bgHeight };

        if(AppToolConfig?.showTextBoxForCustomRectangleRoi) {
          createTextBox(
            image, 
            element, 
            data,
            eventData,
            context,
            this.configuration,
            {color, lineWidth}
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