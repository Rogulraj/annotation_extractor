/* eslint-disable consistent-return */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-plusplus */
import cornerstoneTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';

const throttle = cornerstoneTools.importInternal('util/throttle');
const getPixelSpacing = cornerstoneTools.importInternal('util/getPixelSpacing');
const calculateSUV = cornerstoneTools.importInternal('util/calculateSUV');
const numbersWithCommas = cornerstoneTools.importInternal('util/numbersWithCommas');
const getROITextBoxCoords = cornerstoneTools.importInternal('util/getROITextBoxCoords');
const drawLinkedTextBox = cornerstoneTools.importInternal('drawing/drawLinkedTextBox');


// MAIN
export const createTextBox = (image: any, element: any, data: any, eventData: any, context: any, configuration: any, customStyle: {color: string, lineWidth: number}) => {

  const throttledUpdateCachedStats = _throttledUpdateCachedStatsFn();

  const modality = _modalityFromMetaData(image);
  
  const hasPixelSpacing = _hasPixelSpacing(image);

  // Update textbox stats
  if (data.invalidated === true) {
    if (data.cachedStats) {
      throttledUpdateCachedStats(image, element, data);
    } else {
      updateCachedStats(image, element, data);
    }
  }

  // Default to textbox on right side of ROI
  if (!data.handles.textBox.hasMoved) {
    const defaultCoords = getROITextBoxCoords(
      eventData.viewport,
      data.handles
    );

    Object.assign(data.handles.textBox, defaultCoords);
  }

  const textBoxAnchorPoints = (handles: { start: any; end: any; }) =>
    _findTextBoxAnchorPoints(handles.start, handles.end);
  const textBoxContent = _createTextBoxContent(
    context,
    image.color,
    data.cachedStats,
    modality,
    hasPixelSpacing,
    configuration
  );

  data.unit = _getUnit(modality, configuration.showHounsfieldUnits);

  drawLinkedTextBox(
    context,
    element,
    data.handles.textBox,
    textBoxContent,
    data.handles,
    textBoxAnchorPoints,
    customStyle.color,
    customStyle.lineWidth,
    10,
    true
  );
}

export function updateCachedStats(image: { imageId: any; }, element: any, data: { handles: any; cachedStats: any; invalidated: boolean; }) {
  const seriesModule =
    cornerstone.metaData.get('generalSeriesModule', image.imageId) ||
    {};
  const {modality} = seriesModule;
  const pixelSpacing = getPixelSpacing(image);

  const stats = _calculateStats(
    image,
    element,
    data.handles,
    modality,
    pixelSpacing
  );

  data.cachedStats = stats;
  data.invalidated = false;
}

export function _throttledUpdateCachedStatsFn() {
  return throttle(updateCachedStats, 110);
}

// UTILS
function _hasPixelSpacing(image: any) {
  const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);
  return rowPixelSpacing && colPixelSpacing
}

export function _modalityFromMetaData(image: any) {
  const seriesModule =
      cornerstone.metaData.get('generalSeriesModule', image.imageId) ||
      {};

    const {modality} = seriesModule;
    return modality;
}

export function _getPixelSpacing(image: any) {
  const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);
  return {rowPixelSpacing, colPixelSpacing}
}


/**
 * TODO: This is the same method (+ GetPixels) for the other ROIs
 * TODO: The pixel filtering is the unique bit
 *
 * @param {*} startHandle
 * @param {*} endHandle
 * @returns {{ left: number, top: number, width: number, height: number}}
 */
function _getRectangleImageCoordinates(startHandle: { x: number; y: number; }, endHandle: { x: number; y: number; }) {
  return {
    left: Math.min(startHandle.x, endHandle.x),
    top: Math.min(startHandle.y, endHandle.y),
    width: Math.abs(startHandle.x - endHandle.x),
    height: Math.abs(startHandle.y - endHandle.y),
  };
}

/**
 *
 *
 * @param {*} image
 * @param {*} element
 * @param {*} handles
 * @param {*} modality
 * @param {*} pixelSpacing
 * @returns {Object} The Stats object
 */
export function _calculateStats(
  image: { imageId: any; },
  element: any,
  handles: { start: any; end: any; },
  modality: string,
  pixelSpacing: { colPixelSpacing: any; rowPixelSpacing: any; }
) {
  // Retrieve the bounds of the rectangle in image coordinates
  const roiCoordinates = _getRectangleImageCoordinates(
    handles.start,
    handles.end
  );

  // Retrieve the array of pixels that the rectangle bounds cover
  const pixels = cornerstone.getPixels(
    element,
    roiCoordinates.left,
    roiCoordinates.top,
    roiCoordinates.width,
    roiCoordinates.height
  );

  // Calculate the mean & standard deviation from the pixels and the rectangle details
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const roiMeanStdDev = _calculateRectangleStats(pixels, roiCoordinates);

  let meanStdDevSUV;

  if (modality === 'PT') {
    meanStdDevSUV = {
      mean: calculateSUV(image, roiMeanStdDev.mean, true) || 0,
      stdDev: calculateSUV(image, roiMeanStdDev.stdDev, true) || 0,
    };
  }

  // Calculate the image area from the rectangle dimensions and pixel spacing
  const area =
    roiCoordinates.width *
    (pixelSpacing.colPixelSpacing || 1) *
    (roiCoordinates.height * (pixelSpacing.rowPixelSpacing || 1));

  const perimeter =
    roiCoordinates.width * 2 * (pixelSpacing.colPixelSpacing || 1) +
    roiCoordinates.height * 2 * (pixelSpacing.rowPixelSpacing || 1);

  return {
    area: area || 0,
    perimeter,
    count: roiMeanStdDev.count || 0,
    mean: roiMeanStdDev.mean || 0,
    variance: roiMeanStdDev.variance || 0,
    stdDev: roiMeanStdDev.stdDev || 0,
    min: roiMeanStdDev.min || 0,
    max: roiMeanStdDev.max || 0,
    meanStdDevSUV,
  };
}

/**
 *
 *
 * @param {*} sp
 * @param {*} rectangle
 * @returns {{ count, number, mean: number,  variance: number,  stdDev: number,  min: number,  max: number }}
 */
function _calculateRectangleStats(sp: number[], rectangle: { left: any; top: any; width: any; height: any; }) {
  let sum = 0;
  let sumSquared = 0;
  let count = 0;
  let index = 0;
  let min: any  = sp ? sp[0] : null;
  let max: any = sp ? sp[0] : null;

  for (let y = rectangle.top; y < rectangle.top + rectangle.height; y++) {
    for (let x = rectangle.left; x < rectangle.left + rectangle.width; x++) {
      sum += sp[index];
      sumSquared += sp[index] * sp[index];
      min = Math.min(min, sp[index]);
      max = Math.max(max, sp[index]);
      // eslint-disable-next-line no-plusplus
      count++; // TODO: Wouldn't this just be sp.length?
      // eslint-disable-next-line no-plusplus
      index++;
    }
  }

  if (count === 0) {
    return {
      count,
      mean: 0.0,
      variance: 0.0,
      stdDev: 0.0,
      min: 0.0,
      max: 0.0,
    };
  }

  const mean = sum / count;
  const variance = sumSquared / count - mean * mean;

  return {
    count,
    mean,
    variance,
    stdDev: Math.sqrt(variance),
    min,
    max,
  };
}

/**
 *
 *
 * @param {*} startHandle
 * @param {*} endHandle
 * @returns {Array.<{x: number, y: number}>}
 */
function _findTextBoxAnchorPoints(startHandle: any, endHandle: any) {
  const { left, top, width, height } = _getRectangleImageCoordinates(
    startHandle,
    endHandle
  );

  return [
    {
      // Top middle point of rectangle
      x: left + width / 2,
      y: top,
    },
    {
      // Left middle point of rectangle
      x: left,
      y: top + height / 2,
    },
    {
      // Bottom middle point of rectangle
      x: left + width / 2,
      y: top + height,
    },
    {
      // Right middle point of rectangle
      x: left + width,
      y: top + height / 2,
    },
  ];
}

/**
 *
 *
 * @param {*} area
 * @param {*} hasPixelSpacing
 * @returns {string} The formatted label for showing area
 */
function _formatArea(area: number, hasPixelSpacing: any) {
  // This uses Char code 178 for a superscript 2
  const suffix = hasPixelSpacing
    ? ` mm${String.fromCharCode(178)}`
    : ` px${String.fromCharCode(178)}`;

  return `Area: ${numbersWithCommas(area.toFixed(2))}${suffix}`;
}

function _getUnit(modality: string, showHounsfieldUnits: boolean) {
  return modality === 'CT' && showHounsfieldUnits !== false ? 'HU' : '';
}

/**
 * TODO: This is identical to EllipticalROI's same fn
 * TODO: We may want to make this a utility for ROIs with these values?
 *
 * @param {*} context
 * @param {*} isColorImage
 * @param {*} { area, mean, stdDev, min, max, meanStdDevSUV }
 * @param {*} modality
 * @param {*} hasPixelSpacing
 * @param {*} [options={}]
 * @returns {string[]}
 */
function _createTextBoxContent(
  context: { measureText: (arg0: string) => { (): any; new(): any; width: number; }; },
  isColorImage: any,
  { area, mean, stdDev, min, max, meanStdDevSUV }: any,
  modality: any,
  hasPixelSpacing: any,
  options = {} as any
) {
  const showMinMax = options.showMinMax || false;
  const textLines = [];

  const otherLines = [];

  if (!isColorImage) {
    const hasStandardUptakeValues = meanStdDevSUV && meanStdDevSUV.mean !== 0;
    const unit = _getUnit(modality, options.showHounsfieldUnits);

    let meanString = `Mean: ${numbersWithCommas(mean.toFixed(2))} ${unit}`;
    const stdDevString = `Std Dev: ${numbersWithCommas(
      stdDev.toFixed(2)
    )} ${unit}`;

    // If this image has SUV values to display, concatenate them to the text line
    if (hasStandardUptakeValues) {
      const SUVtext = ' SUV: ';

      const meanSuvString = `${SUVtext}${numbersWithCommas(
        meanStdDevSUV.mean.toFixed(2)
      )}`;
      const stdDevSuvString = `${SUVtext}${numbersWithCommas(
        meanStdDevSUV.stdDev.toFixed(2)
      )}`;

      const targetStringLength = Math.floor(
        context.measureText(`${stdDevString}     `).width
      );

      while (context.measureText(meanString).width < targetStringLength) {
        meanString += ' ';
      }

      otherLines.push(`${meanString}${meanSuvString}`);
      otherLines.push(`${stdDevString}     ${stdDevSuvString}`);
    } else {
      otherLines.push(`${meanString}`);
      otherLines.push(`${stdDevString}`);
    }

    if (showMinMax) {
      let minString = `Min: ${min} ${unit}`;
      const maxString = `Max: ${max} ${unit}`;
      const targetStringLength = hasStandardUptakeValues
        ? Math.floor(context.measureText(`${stdDevString}     `).width)
        : Math.floor(context.measureText(`${meanString}     `).width);

      while (context.measureText(minString).width < targetStringLength) {
        minString += ' ';
      }

      otherLines.push(`${minString}${maxString}`);
    }
  }

  textLines.push(_formatArea(area, hasPixelSpacing));
  otherLines.forEach(x => textLines.push(x));

  return textLines;
}
