import EVENTS from '../../events.js';
import external from '../../externalModules.js';
import {
  addToolState,
  removeToolState,
} from '../../stateManagement/toolState.js';
import { moveHandle, moveNewHandle } from '../../manipulators/index.js';
import { getLogger } from '../../util/logger.js';
import triggerEvent from '../../util/triggerEvent.js';

const logger = getLogger('eventDispatchers:mouseEventHandlers');
export default function (evt, tool) {
  logger.log('addNewMeasurement');

  // evt refer to WebAPI event: https://developer.mozilla.org/zh-TW/docs/Web/API/Event

  // 1. we usually want to have full control on the event, so we turn off default behavior and don't bubble up
  evt.preventDefault();
  evt.stopPropagation();

  // 2. get data
  const eventData = evt.detail;
  const element = eventData.element;
  // notice measurementData include props: visible, active, color, invalidated and handles (start, end and textBox for length tool)
  const measurementData = tool.createNewMeasurement(eventData);

  if (!measurementData) {
    return;
  }

  // 3. addToolState: add data into state by toolStateManager and trigger add measurement event
  addToolState(element, tool.name, measurementData);

  // update image
  external.cornerstone.updateImage(element);

  // if it's length tool, measurementData.handles have 3 key, start, end and textBox
  const handleMover =
    Object.keys(measurementData.handles).length === 1
      ? moveHandle
      : moveNewHandle;

  // moveNewHandle fn signature
  // export default function(
  //   eventData,
  //   toolName,
  //   annotation,
  //   handle,
  //   options,
  //   interactionType = 'mouse',
  //   doneMovingCallback
  // )

  handleMover(
    eventData,
    tool.name,
    measurementData, // annotation
    measurementData.handles.end,
    tool.options,
    'mouse',
    (success) => {
      // if cancelled is true, we do nothing
      if (measurementData.cancelled) {
        return;
      }

      // if success is true, we trigger MEASUREMENT_COMPLETED event
      // o.w. we removeToolState
      if (success) {
        const eventType = EVENTS.MEASUREMENT_COMPLETED;
        const eventData = {
          toolName: tool.name,
          toolType: tool.name, // Deprecation notice: toolType will be replaced by toolName
          element,
          measurementData,
        };

        triggerEvent(element, eventType, eventData);
      } else {
        removeToolState(element, tool.name, measurementData);
      }
    }
  );
}
