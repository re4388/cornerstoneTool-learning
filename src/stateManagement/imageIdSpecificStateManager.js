import external from '../externalModules.js';

/**
 * Implements an imageId specific tool state management strategy.  This means that
 * Measurements data is tied to a specific imageId and only visible for enabled elements
 * That are displaying that imageId.
 * @public
 * @constructor newImageIdSpecificToolStateManager
 * @memberof StateManagement
 *
 * @returns {Object} An imageIdSpecificToolStateManager instance.
 */
function newImageIdSpecificToolStateManager() {
  // init imageId specific tool state
  let toolState = {};

  // get toolState by imageId
  function saveImageIdToolState(imageId) {
    return toolState[imageId];
  }

  // update toolState with providing imageId and imageIdToolState
  function restoreImageIdToolState(imageId, imageIdToolState) {
    toolState[imageId] = imageIdToolState;
  }

  // get toolState for all imageId
  function saveToolState() {
    return toolState;
  }

  // replace the toolState
  function restoreToolState(savedToolState) {
    toolState = savedToolState;
  }

  // Here we add tool state, this is done by tools as well
  // As modules that restore saved state
  //
  // Ben: not a good naming, this function actually handle missing image in enabled element
  // and then call addImageIdToolState to do the actual work
  function addElementToolState(element, toolName, data) {
    const enabledElement = external.cornerstone.getEnabledElement(element);

    // do nothing if we don't have an image for this element exit early
    if (!enabledElement.image) {
      return;
    }

    addImageIdToolState(enabledElement.image.imageId, toolName, data);
  }

  function addImageIdToolState(imageId, toolName, data) {
    // If we don't have any tool state for this imageId, add an empty object
    if (toolState.hasOwnProperty(imageId) === false) {
      toolState[imageId] = {};
    }

    const imageIdToolState = toolState[imageId];

    // If we don't have tool state for the specific tool, add an empty object with data prop for it
    if (imageIdToolState.hasOwnProperty(toolName) === false) {
      imageIdToolState[toolName] = {
        data: [],
      };
    }

    // use the specific tool to get the toolData
    const toolData = imageIdToolState[toolName];

    // add new data to it
    toolData.data.push(data);
  }

  function getElementToolState(element, toolName) {
    const enabledElement = external.cornerstone.getEnabledElement(element);

    // If the element does not have an image return undefined.
    if (!enabledElement.image) {
      return;
    }

    return getImageIdToolState(enabledElement.image.imageId, toolName);
  }

  // Here you can get state - used by tools as well as modules
  // That save state persistently
  function getImageIdToolState(imageId, toolName) {
    // If we don't have any tool state for this imageId, return undefined
    if (toolState.hasOwnProperty(imageId) === false) {
      return;
    }

    const imageIdToolState = toolState[imageId];

    // If we don't have tool state for this tool name, return undefined
    if (imageIdToolState.hasOwnProperty(toolName) === false) {
      return;
    }

    return imageIdToolState[toolName];
  }

  // Clears all tool data from this toolStateManager.
  function clearElementToolState(element) {
    const enabledElement = external.cornerstone.getEnabledElement(element);

    if (!enabledElement.image) {
      return;
    }
    clearImageIdToolState(enabledElement.image.imageId);
  }

  function clearImageIdToolState(imageId) {
    if (toolState.hasOwnProperty(imageId) === false) {
      return;
    }

    delete toolState[imageId];
  }

  return {
    get: getElementToolState,
    add: addElementToolState,
    clear: clearElementToolState,
    getImageIdToolState,
    addImageIdToolState,
    clearImageIdToolState,
    saveImageIdToolState,
    restoreImageIdToolState,
    saveToolState,
    restoreToolState,
    toolState,
  };
}

// A global imageIdSpecificToolStateManager - the most common case is to share state between all
// Visible enabled images
const globalImageIdSpecificToolStateManager = newImageIdSpecificToolStateManager();

export {
  newImageIdSpecificToolStateManager,
  globalImageIdSpecificToolStateManager,
};
