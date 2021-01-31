import BaseAnnotationTool from '../base/BaseAnnotationTool.js';
// State
import { getToolState } from './../../stateManagement/toolState.js';
import toolStyle from './../../stateManagement/toolStyle.js';
import toolColors from './../../stateManagement/toolColors.js';
// Drawing
import {
  getNewContext,
  draw,
  setShadow,
  drawLine,
} from './../../drawing/index.js';
import drawLinkedTextBox from './../../drawing/drawLinkedTextBox.js';
import drawHandles from './../../drawing/drawHandles.js';
import lineSegDistance from './../../util/lineSegDistance.js';
import { lengthCursor } from '../cursors/index.js';
import { getLogger } from '../../util/logger.js';
import getPixelSpacing from '../../util/getPixelSpacing';
import throttle from '../../util/throttle';
import { getModule } from '../../store/index';

const logger = getLogger('tools:annotation:LengthTool');

/**
 * @public
 * @class LengthTool
 * @memberof Tools.Annotation
 * @classdesc Tool for measuring distances.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class LengthTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'Length',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      svgCursor: lengthCursor,
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
      },
    };

    super(props, defaultProps);

    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  // consume by src\eventDispatchers\mouseEventHandlers\addNewMeasurement.js or other like touch eventHandler
  createNewMeasurement(eventData) {
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }

    const { x, y } = eventData.currentPoints.image;

    return {
      visible: true,
      active: true,
      color: undefined,
      invalidated: true,
      handles: {
        start: {
          x,
          y,
          highlight: true,
          active: false,
        },
        end: {
          x,
          y,
          highlight: true,
          active: true,
        },
        textBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
        },
      },
    };
  }

  /**
   * This helper can identify dist from line segment to a point
   * This method consumed by BaseAnnotationTool.mouseMoveCallback
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {Boolean}
   */
  pointNearTool(element, data, coords) {
    const hasStartAndEndHandles =
      data && data.handles && data.handles.start && data.handles.end;
    const validParameters = hasStartAndEndHandles;

    if (!validParameters) {
      logger.warn(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );

      return false;
    }

    if (data.visible === false) {
      return false;
    }

    return (
      lineSegDistance(element, data.handles.start, data.handles.end, coords) <
      25
    );
  }

  /**
   * Update length data and set invalidate to false
   * This method will be modified to throttledUpdateCachedStats
   * and consumed by renderToolData
   */
  updateCachedStats(image, element, data) {
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);

    // Set rowPixelSpacing and columnPixelSpacing to 1 if they are undefined (or zero)
    const dx =
      (data.handles.end.x - data.handles.start.x) * (colPixelSpacing || 1);
    const dy =
      (data.handles.end.y - data.handles.start.y) * (rowPixelSpacing || 1);

    // Calculate the length, and create the text variable with the millimeters or pixels suffix
    const length = Math.sqrt(dx * dx + dy * dy);

    // Store the length inside the tool for outside access
    data.length = length;
    data.invalidated = false;
  }

  /**
   * consumed by imageRenderedEventDispatcher.onImageRendered
   */
  renderToolData(evt) {
    const eventData = evt.detail;
    const {
      handleRadius,
      drawHandlesOnHover,
      hideHandlesIfMoving,
      renderDashed,
    } = this.configuration;
    const toolData = getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    const context = getNewContext(eventData.canvasContext.canvas);
    const { image, element } = eventData;
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);
    const lineWidth = toolStyle.getToolWidth();
    const lineDash = getModule('globalConfiguration').configuration.lineDash;

    // 1. We have tool data for this element - iterate over each one and draw it
    for (let i = 0; i < toolData.data.length; i++) {
      const data = toolData.data[i];

      // if visible false, skip this iteration
      if (data.visible === false) {
        continue;
      }

      // 1,1 actual draw
      draw(context, (context) => {
        // 1.1.1 Configurable shadow
        setShadow(context, this.configuration);
        const color = toolColors.getColorIfActive(data);
        const lineOptions = { color };
        if (renderDashed) {
          lineOptions.lineDash = lineDash;
        }

        // 1.1.2 Draw the measurement line
        drawLine(
          context,
          element,
          data.handles.start,
          data.handles.end,
          lineOptions
        );

        // 1.1.3 Draw the handles
        // for length, data.handles have 2 props, start and end
        const handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving,
        };

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
        }

        // 1.1.4 setup textBox x, y
        if (!data.handles.textBox.hasMoved) {
          const coords = {
            x: Math.max(data.handles.start.x, data.handles.end.x),
          };

          // Depending on which handle has the largest x-value,
          // Set the y-value for the text box
          if (coords.x === data.handles.start.x) {
            coords.y = data.handles.start.y;
          } else {
            coords.y = data.handles.end.y;
          }

          data.handles.textBox.x = coords.x;
          data.handles.textBox.y = coords.y;
        }

        // 1.1.5 Update stats
        if (data.invalidated === true) {
          if (data.length) {
            this.throttledUpdateCachedStats(image, element, data);
          } else {
            this.updateCachedStats(image, element, data);
          }
        }

        // 1.1.6 draw the dashed link b/n textBox and annotation
        // Move the text box slightly to the right and upwards
        // So that it sits beside the length tool handle
        const xOffset = 10;
        const text = textBoxText(data, rowPixelSpacing, colPixelSpacing);
        drawLinkedTextBox(
          context,
          element,
          data.handles.textBox,
          text,
          data.handles,
          textBoxAnchorPoints,
          color,
          lineWidth,
          xOffset,
          true
        );
      });
    }

    // - SideEffect: Updates annotation 'suffix'
    function textBoxText(annotation, rowPixelSpacing, colPixelSpacing) {
      // annotation is alias of tool data
      const measuredValue = _sanitizeMeasuredValue(annotation.length);

      // measured value is not defined, return empty string
      if (!measuredValue) {
        return '';
      }

      // Set the length text suffix depending on whether or not pixelSpacing is available
      let suffix = 'mm';
      if (!rowPixelSpacing || !colPixelSpacing) {
        suffix = 'pixels';
      }

      annotation.unit = suffix;

      return `${measuredValue.toFixed(2)} ${suffix}`;
    }

    function textBoxAnchorPoints(handles) {
      const midpoint = {
        x: (handles.start.x + handles.end.x) / 2,
        y: (handles.start.y + handles.end.y) / 2,
      };

      return [handles.start, midpoint, handles.end];
    }
  }
}

/**
 * Attempts to sanitize a value by casting as a number; if unable to cast,
 * we return `undefined`
 *
 * @param {*} value
 * @returns a number or undefined
 */
function _sanitizeMeasuredValue(value) {
  const parsedValue = Number(value);
  const isNumber = !isNaN(parsedValue);

  return isNumber ? parsedValue : undefined;
}
