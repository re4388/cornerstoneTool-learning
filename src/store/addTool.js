import store, { getModule } from './index.js';
import getToolForElement from './getToolForElement.js';
import { getLogger } from '../util/logger.js';

const logger = getLogger('addTool');

/**
 * Adds a tool to an enabled element.
 *
 * @public
 * @function addToolForElement
 * @memberof CornerstoneTools
 *
 * @param {HTMLElement} element The element to add the tool to.
 * @param {BaseTool} ApiTool The tool to add to the element.
 * @param {Object} [props] Override the default tool props
 * @returns {undefined}
 */
const addToolForElement = function (element, ApiTool, props) {
  // Instantiating the tool here makes it harder to accidentally add
  // The same tool (by reference) for multiple elements (which would reassign the tool
  // To a new element).

  // 1. Instantiating the tool
  const tool = new ApiTool(props);

  // 2. check if the tool had attached to element
  const toolAlreadyAddedToElement = getToolForElement(element, tool.name);
  if (toolAlreadyAddedToElement) {
    logger.warn('%s has already been added to the target element', tool.name);

    return;
  }

  // 3. attached element to tool and push tool to global tool
  tool.element = element;
  store.state.tools.push(tool);
};

/**
 * Adds a tool to all enabled element.
 *
 * @public
 * @function addTool
 * @memberof CornerstoneTools
 *
 * @param {BaseTool} ApiTool The tool to add to each element.
 * @param {Object} [props] Override the default tool configuration
 * @returns {undefined}
 */
const addTool = function (ApiTool, props) {
  _addToolGlobally(ApiTool, props);
  store.state.enabledElements.forEach((element) => {
    addToolForElement(element, ApiTool, props);
  });
};

/**
 * Adds tool with matching name from globally registered tools.
 * Requires `globalToolSyncEnabled` to be set to true
 *
 * @private
 * @function addToolGlobally
 *
 * @param {BaseTool} ApiTool
 * @param {Object} [props] Override the default tool configuration
 * @returns {undefined}
 */
const _addToolGlobally = function (ApiTool, props) {
  // 1. check if globalToolSyncEnabled set to true
  const { configuration } = getModule('globalConfiguration');
  if (!configuration.globalToolSyncEnabled) {
    return;
  }

  // 2. instantiate the tool
  const tool = new ApiTool(props);

  // 3. check if globally added, if yes, return
  const toolAlreadyAddedGlobally =
    store.state.globalTools[tool.name] !== undefined;

  if (toolAlreadyAddedGlobally) {
    logger.warn('%s has already been added globally', tool.name);

    return;
  }

  // 4. add to global state
  store.state.globalTools[tool.name] = {
    tool: ApiTool,
    props,
    activeBindings: [],
  };
};

export { addTool, addToolForElement };
