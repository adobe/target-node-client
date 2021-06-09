/* eslint-disable import/prefer-default-export */

import { now } from "./lodash";
import { DECISIONING_METHOD } from "./enums";

/**
 * The get TelemetryProvider initialization method
 * @param {function} sendTelemetriesFunc function used to send the telemetries, required
 */
export function TelemetryProvider(
  executeTelemetriesFunc,
  telemetryEnabled = true,
  mode = DECISIONING_METHOD.SERVER_SIDE
) {
  let telemetryEntries = [];

  /**
   * @param {import("@adobe/target-tools/delivery-api-client/models/TelemetryEntry").TelemetryEntry} entry
   */
  function addEntry(request, entry = {}, decisioningMethod = mode) {
    if (!telemetryEnabled) {
      return;
    }

    const { requestId } = request;
    const timestamp = now();

    telemetryEntries.push({
      requestId,
      timestamp,
      features: {
        decisioningMethod
      },
      ...entry
    });
  }

  function clearEntries() {
    telemetryEntries = [];
  }

  function executeTelemetries(deliveryRequest) {
    if (telemetryEntries.length > 0) {
      const result = executeTelemetriesFunc(deliveryRequest, telemetryEntries);
      clearEntries();
      return result;
    }
    return deliveryRequest;
  }

  function getEntries() {
    return telemetryEntries;
  }

  return {
    addEntry,
    clearEntries,
    executeTelemetries,
    getEntries
  };
}

export default TelemetryProvider;
