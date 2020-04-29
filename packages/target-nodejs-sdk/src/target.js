/* eslint-disable import/prefer-default-export */
/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import {
  getFetchWithRetry,
  decisioningEngineReady,
  requiresDecisioningEngine,
  EXECUTION_MODE
} from "@adobe/target-tools";
import { Messages } from "./messages";
import {
  createConfiguration,
  createDeliveryApi,
  createDeliveryRequest,
  createHeaders,
  getCluster,
  getDeviceId,
  getSessionId,
  getTargetHost,
  processResponse
} from "./helper";
import { parseCookies } from "./cookies";

export function executeDelivery(options, decisioningEngine) {
  const {
    visitor,
    config,
    logger,
    targetCookie,
    consumerId,
    request,
    useBeacon,
    createDeliveryApiMethod = createDeliveryApi
  } = options;

  const {
    serverDomain,
    client,
    timeout,
    secure,
    environmentId,
    executionMode
  } = config;

  const fetchWithRetry = getFetchWithRetry(config.fetchApi);

  const targetLocationHint =
    options.targetLocationHint || config.targetLocationHint;

  if (
    requiresDecisioningEngine(executionMode) &&
    !decisioningEngineReady(decisioningEngine)
  ) {
    return Promise.reject(new Error(Messages.PENDING_ARTIFACT_RETRIEVAL));
  }

  const cookies = parseCookies(targetCookie);
  const deviceId = getDeviceId(cookies);
  const cluster = getCluster(deviceId, targetLocationHint);
  const host = getTargetHost(serverDomain, cluster, client, secure);
  const sessionId = getSessionId(cookies, options.sessionId);
  const headers = createHeaders();

  const requestOptions = {
    logger,
    visitor,
    deviceId,
    consumerId,
    environmentId
  };

  const deliveryRequest = createDeliveryRequest(request, requestOptions);

  logger.debug(Messages.REQUEST_SENT, JSON.stringify(deliveryRequest, null, 2));

  const configuration = createConfiguration(
    fetchWithRetry,
    host,
    headers,
    timeout
  );

  const deliveryMethod = createDeliveryApiMethod(
    configuration,
    visitor,
    useBeacon,
    options.config.executionMode,
    targetLocationHint,
    deliveryRequest,
    decisioningEngine
  );

  return deliveryMethod
    .execute(client, sessionId, deliveryRequest, config.version)
    .then((response = {}) => {
      logger.debug(
        Messages.RESPONSE_RECEIVED,
        JSON.stringify(response, null, 2)
      );
      return Object.assign(
        { visitorState: visitor.getState(), request: deliveryRequest },
        processResponse(
          sessionId,
          cluster,
          deliveryRequest,
          response,
          typeof deliveryMethod.executionMode === "string"
            ? deliveryMethod.executionMode
            : EXECUTION_MODE.REMOTE,
          decisioningEngine
        )
      );
    });
}
