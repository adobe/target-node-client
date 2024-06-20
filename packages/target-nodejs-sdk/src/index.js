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
  addMboxesToRequest,
  AttributesProvider,
  EMPTY_REQUEST,
  EventProvider,
  DECISIONING_METHOD,
  getFetchApi,
  getLogger,
  parseDomainPsl,
  requiresDecisioningEngine,
  TelemetryProvider
} from "@adobe/target-tools";

import Visitor from "@adobe-mcid/visitor-js-server";
import TargetDecisioningEngine from "@adobe/target-decisioning-engine";
import { createVisitor } from "./utils";
import { Messages } from "./messages";
import { LOCATION_HINT_COOKIE, TARGET_COOKIE, QA_MODE_COOKIE } from "./cookies";
import { executeDelivery } from "./target";
import { preserveLocationHint, requestLocationHintCookie } from "./helper";

import {
  validateClientOptions,
  validateGetOffersOptions,
  validateSendNotificationsOptions
} from "./validators";
import { CLIENT_READY } from "./events";

const AMCV_PREFIX = "AMCV_";
const DEFAULT_TIMEOUT = 3000;

export default function bootstrap(fetchApi) {
  const fetchImpl = getFetchApi(fetchApi);

  if (!fetchImpl) {
    throw new Error(Messages.FETCH_UNDEFINED);
  }

  class TargetClient {
    constructor(options) {
      if (!options || !options.internal) {
        throw new Error(Messages.PRIVATE_CONSTRUCTOR);
      }
      this.config = options;
      this.config.timeout = options.timeout || DEFAULT_TIMEOUT;
      this.logger = getLogger(options.logger);
      this.telemetryProvider = TelemetryProvider(
        options.telemetryEnabled,
        options.decisioningMethod
      );
      const eventEmitter = EventProvider(this.config.events).emit;

      if (requiresDecisioningEngine(options.decisioningMethod)) {
        Promise.all([
          requestLocationHintCookie(this, this.config.targetLocationHint),
          TargetDecisioningEngine(
            {
              client: options.client,
              organizationId: options.organizationId,
              pollingInterval: options.pollingInterval,
              maximumWaitReady: options.maximumWaitReady,
              artifactFormat: options.artifactFormat,
              artifactLocation: options.artifactLocation,
              artifactPayload: options.artifactPayload,
              propertyToken: options.propertyToken,
              environment: options.environment,
              cdnEnvironment: options.cdnEnvironment,
              cdnBasePath: options.cdnBasePath,
              logger: this.logger,
              telemetryEnabled: options.telemetryEnabled,
              fetchApi: fetchImpl,
              eventEmitter,
              sendNotificationFunc: notificationOptions =>
                this.sendNotifications(notificationOptions),
              parseDomainImpl: parseDomainPsl
            },
            this.telemetryProvider
          )
        ])
          // eslint-disable-next-line no-unused-vars
          .then(([locationHintResponse, decisioningEngine]) => {
            this.decisioningEngine = decisioningEngine;
            eventEmitter(CLIENT_READY);
          })
          .catch(err => {
            this.logger.error(err.message);
          });
      } else {
        setTimeout(() => eventEmitter(CLIENT_READY), 100);
      }
    }

    /**
     * The TargetClient creation factory method
     * @param {Object} options Options map, required
     * @param {Function }options.fetchApi Fetch Implementation, optional
     * @param {String} options.client Target Client Id, required
     * @param {String} options.organizationId Target Organization Id, required
     * @param {Number} options.timeout Target request timeout in ms, default: 3000
     * @param {String} options.serverDomain Server domain, optional
     * @param {String} options.targetLocationHint Target Location Hint, optional
     * @param {boolean} options.secure Unset to enforce HTTP scheme, default: true
     * @param {Object} options.logger Replaces the default noop logger, optional
     * @param {('on-device'|'server-side'|'hybrid')} options.decisioningMethod The decisioning method, defaults to remote, optional
     * @param {Number} options.pollingInterval (Local Decisioning) Polling interval in ms, default: 30000
     * @param {Number} options.maximumWaitReady (Local Decisioning) The maximum amount of time (in ms) to wait for clientReady.  Default is to wait indefinitely.
     * @param {String} options.artifactLocation (Local Decisioning) Fully qualified url to the location of the artifact, optional
     * @param {import("@adobe/target-decisioning-engine/types/DecisioningArtifact").DecisioningArtifact} options.artifactPayload (Local Decisioning) A pre-fetched artifact, optional
     * @param {Number} options.environmentId The Target environment ID, defaults to production, optional
     * @param {String} options.environment The Target environment name, defaults to production, optional
     * @param {String} options.cdnEnvironment The CDN environment name, defaults to production, optional
     * @param {boolean} options.telemetryEnabled If set to false, telemetry data will not be sent to Adobe
     * @param {String} options.version The version number of at.js, optional
     * @param {String} options.propertyToken A property token used to limit the scope of evaluated target activities, optional
     * @param {Object.<String, Function>} options.events An object with event name keys and callback function values, optional
     */
    static create(options) {
      const error = validateClientOptions(options);

      if (error) {
        throw new Error(error);
      }

      return new TargetClient(
        Object.assign(
          {
            internal: true,
            decisioningMethod: DECISIONING_METHOD.SERVER_SIDE,
            fetchApi: fetchImpl
          },
          options
        )
      );
    }

    /**
     * The TargetClient getOffers method
     * @param {Object} options
     * @param {import("@adobe/target-tools/delivery-api-client/models/DeliveryRequest").DeliveryRequest} options.request Target View Delivery API request, required
     * @param {String} options.visitorCookie VisitorId cookie, optional
     * @param {String} options.targetCookie Target cookie, optional
     * @param {String} options.targetLocationHint Target Location Hint, optional
     * @param {String} options.consumerId When stitching multiple calls, different consumerIds should be provided, optional
     * @param {Array}  options.customerIds An array of Customer Ids in VisitorId-compatible format, optional
     * @param {String} options.sessionId Session Id, used for linking multiple requests, optional
     * @param {Object} options.visitor Supply an external VisitorId instance, optional
     * @param {('on-device'|'server-side'|'hybrid')} options.decisioningMethod The execution mode, defaults to remote, optional
     * @returns Promise<TargetDeliveryResponse>
     */
    getOffers(options) {
      const error = validateGetOffersOptions(options);

      if (error) {
        return Promise.reject(new Error(error));
      }

      const visitor = createVisitor(options, this.config);

      const targetOptions = Object.assign(
        {
          visitor,
          config: {
            ...this.config,
            decisioningMethod:
              options.decisioningMethod || this.config.decisioningMethod
          },
          logger: this.logger
        },
        options
      );

      return executeDelivery(
        targetOptions,
        this.telemetryProvider,
        this.decisioningEngine
      ).then(preserveLocationHint.bind(this));
    }

    /**
     * The TargetClient getAttributes method
     * @param {Array<String>} mboxNames A list of mbox names that contains JSON content attributes, required
     * @param {Object} options, required
     * @param {import("@adobe/target-tools/delivery-api-client/models/DeliveryRequest").DeliveryRequest} options.request Target View Delivery API request, required
     * @param {String} options.visitorCookie VisitorId cookie, optional
     * @param {String} options.targetCookie Target cookie, optional
     * @param {String} options.targetLocationHint Target Location Hint, optional
     * @param {String} options.consumerId When stitching multiple calls, different consumerIds should be provided, optional
     * @param {Array}  options.customerIds An array of Customer Ids in VisitorId-compatible format, optional
     * @param {String} options.sessionId Session Id, used for linking multiple requests, optional
     * @param {Object} options.visitor Supply an external VisitorId instance, optional
     * @param {('on-device'|'server-side'|'hybrid')} options.decisioningMethod The execution mode, defaults to remote, optional
     */
    getAttributes(mboxNames, options = {}) {
      // eslint-disable-next-line no-param-reassign
      options.request = options.request || EMPTY_REQUEST;

      return this.getOffers({
        ...options,
        request: addMboxesToRequest(mboxNames, options.request, "execute")
      }).then(res => AttributesProvider(res));
    }

    /**
     * The TargetClient sendNotifications method
     * @param {Object} options
     * @param {import("@adobe/target-tools/delivery-api-client/models/DeliveryRequest").DeliveryRequest} options.request Target View Delivery API request, required
     * @param {String} options.visitorCookie VisitorId cookie, optional
     * @param {String} options.targetCookie Target cookie, optional
     * @param {String} options.targetLocationHint Target Location Hint, optional
     * @param {String} options.consumerId When stitching multiple calls, different consumerIds should be provided, optional
     * @param {Array}  options.customerIds An array of Customer Ids in VisitorId-compatible format, optional
     * @param {String} options.sessionId Session Id, used for linking multiple requests, optional
     * @param {Object} options.visitor Supply an external VisitorId instance, optional
     */

    sendNotifications(options) {
      const error = validateSendNotificationsOptions(
        options,
        this.telemetryProvider.hasEntries()
      );

      if (error) {
        return Promise.reject(new Error(error));
      }

      const visitor = createVisitor(options, this.config);

      const targetOptions = {
        visitor,
        config: {
          ...this.config,
          decisioningMethod: DECISIONING_METHOD.SERVER_SIDE // execution mode for sending notifications must always be remote
        },
        logger: this.logger,
        useBeacon: true,
        ...options
      };

      return executeDelivery(targetOptions, this.telemetryProvider).then(
        preserveLocationHint.bind(this)
      );
    }

    static getVisitorCookieName(orgId) {
      return AMCV_PREFIX + orgId;
    }

    static get TargetCookieName() {
      return TARGET_COOKIE;
    }

    static get TargetLocationHintCookieName() {
      return LOCATION_HINT_COOKIE;
    }

    static get TargetQaModeCookieName() {
      return QA_MODE_COOKIE;
    }

    static get AuthState() {
      return Visitor.AuthState;
    }
  }

  return TargetClient;
}
