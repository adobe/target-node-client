import { getLogger, isDefined, isUndefined } from "@adobe/target-tools";
import { createDecisioningContext } from "./contextProvider";
import DecisionProvider from "./decisionProvider";
import ArtifactProvider from "./artifactProvider";
import Messages from "./messages";
import { hasRemoteDependency, matchMajorVersion } from "./utils";
import { SUPPORTED_ARTIFACT_MAJOR_VERSION } from "./constants";
import { validDeliveryRequest } from "./requestProvider";
import { TraceProvider } from "./traceProvider";
import { GeoProvider } from "./geoProvider";
import { ArtifactInstance } from "../types/ArtifactInstance";
import { DecisioningArtifact } from "../types/DecisioningArtifact";
import { OnDeviceDeliveryResponse } from "../types/OnDeviceDeliveryResponse";

/**
 * The TargetDecisioningEngine initialize method
 * @param {import("../types/DecisioningConfig").DecisioningConfig} config Options map, required
 * @param {import("@adobe/target-tools/src/telemetryProvider")} telemetryProvider TelemetryProvider function, required
 */
export default function TargetDecisioningEngine(config, telemetryProvider) {
  const logger = getLogger(config.logger);
  let artifactProvider: ArtifactInstance;
  let artifact: DecisioningArtifact;

  /**
   * The get offers method
   * @param {import("../types/TargetDeliveryRequest").TargetDeliveryRequest} targetOptions
   */
  function getOffers(targetOptions): Promise<OnDeviceDeliveryResponse> {
    let { request } = targetOptions;

    if (isUndefined(artifact)) {
      return Promise.reject(new Error(Messages.ARTIFACT_NOT_AVAILABLE));
    }

    if (
      !matchMajorVersion(artifact.version, SUPPORTED_ARTIFACT_MAJOR_VERSION)
    ) {
      return Promise.reject(
        new Error(
          Messages.ARTIFACT_VERSION_UNSUPPORTED(
            artifact.version,
            SUPPORTED_ARTIFACT_MAJOR_VERSION
          )
        )
      );
    }

    return validDeliveryRequest(
      request,
      targetOptions.targetLocationHint,
      GeoProvider(config, artifact)
    ).then(validRequest => {
      request = validRequest;

      const options = {
        ...targetOptions,
        request
      };

      const traceProvider = TraceProvider(
        config,
        options,
        artifactProvider.getTrace()
      );

      return DecisionProvider(
        config,
        options,
        createDecisioningContext(request),
        artifact,
        logger,
        traceProvider
      );
    });
  }

  function isReady() {
    return isDefined(artifact);
  }

  return ArtifactProvider(
    {
      ...config,
      logger
    },
    telemetryProvider
  ).then((providerInstance: ArtifactInstance) => {
    artifactProvider = providerInstance;
    artifact = artifactProvider.getArtifact();

    if (isUndefined(artifact)) {
      throw new Error(Messages.ARTIFACT_NOT_AVAILABLE);
    }

    // subscribe to new artifacts that are downloaded on the polling interval
    artifactProvider.subscribe(data => {
      artifact = data;
    });

    return {
      getRawArtifact: () => artifact,
      stopPolling: () => artifactProvider.stopPolling(),
      getOffers: targetOptions => getOffers(targetOptions),
      hasRemoteDependency: request => hasRemoteDependency(artifact, request),
      isReady
    };
  });
}
