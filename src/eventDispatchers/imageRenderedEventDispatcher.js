import { state, getModule } from './../store/index.js';
import { getToolState } from '../stateManagement/toolState';
import onImageRenderedBrushEventHandler from '../eventListeners/onImageRenderedBrushEventHandler.js';
import external from './../externalModules.js';

const segmentationModule = getModule('segmentation');

const onImageRendered = function (evt) {
  const eventData = evt.detail;
  const element = eventData.element;

  // 1. Prep Annotation Tools
  const toolsToRender = state.tools.filter(
    (tool) =>
      tool.element === element &&
      (tool.mode === 'active' ||
        tool.mode === 'passive' ||
        tool.mode === 'enabled')
  );

  // 2. Prep stacks in order to use segmentation tools.
  const stackToolState = getToolState(element, 'stack');

  const segmentationConfiguration = segmentationModule.configuration;

  if (
    stackToolState &&
    (segmentationConfiguration.renderFill ||
      segmentationConfiguration.renderOutline)
  ) {
    onImageRenderedBrushEventHandler(evt);
  }

  // 3. renderTool via canvas
  const context = eventData.canvasContext.canvas.getContext('2d');

  toolsToRender.forEach((tool) => {
    if (tool.renderToolData) {
      context.save();
      tool.renderToolData(evt);
      context.restore();
    }
  });
};

const enable = function (element) {
  element.addEventListener(
    external.cornerstone.EVENTS.IMAGE_RENDERED,
    onImageRendered
  );
};

const disable = function (element) {
  element.removeEventListener(
    external.cornerstone.EVENTS.IMAGE_RENDERED,
    onImageRendered
  );
};

export default {
  enable,
  disable,
};
