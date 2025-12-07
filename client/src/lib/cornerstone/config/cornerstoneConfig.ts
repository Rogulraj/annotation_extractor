// Cornerstone Configuration and Initialization

import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import cornerstoneMath from 'cornerstone-math';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import cornerstoneFileImageLoader from 'cornerstone-file-image-loader';
import cornerstoneWebImageLoader from 'cornerstone-web-image-loader';
import Hammer from 'hammerjs';
import * as dicomParser from 'dicom-parser';

let isInitialized = false;

export function initCornerstone() {
  if (isInitialized) {
    return { cornerstone, cornerstoneTools };
  }

  // Register external dependencies
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
  cornerstoneFileImageLoader.external.cornerstone = cornerstone;
  cornerstoneWebImageLoader.external.cornerstone = cornerstone;

  // Configure WADO image loader
  cornerstoneWADOImageLoader.configure({
    useWebWorkers: true,
    decodeConfig: {
      convertFloatPixelDataToInt: false,
      use16BitDataType: true,
    },
    // @ts-ignore
    // beforeSend: (xhr: XMLHttpRequest) => {
    //   // Add auth headers if needed
    //   const token = localStorage.getItem('access_token');
    //   if (token) {
    //     xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    //   }
    // },
  });

  // Initialize cornerstone tools
  cornerstoneTools.external.cornerstone = cornerstone;
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
  cornerstoneTools.external.Hammer = Hammer;
  
  cornerstoneTools.init({
    mouseEnabled: true,
    touchEnabled: true,
    globalToolSyncEnabled: false,
    showSVGCursors: true,
    autoResizeViewports: true,
  });

  isInitialized = true;

  return { cornerstone, cornerstoneTools };
}

export function resetCornerstoneInit() {
  isInitialized = false;
}
