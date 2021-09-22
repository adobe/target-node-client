import { isDefined, isFunction, isUndefined } from "@adobe/target-tools";
import { Messages } from "../messages";

function withLabel(label, value) {
  if (isUndefined(value)) {
    return undefined;
  }
  return `\n${label}: ${value}`;
}

function isValidLogger(logger) {
  return isDefined(logger) && isFunction(logger.debug);
}

export function logApiResponse(
  logger,
  response,
  decisioningMethod,
  requestURL = undefined
) {
  if (isValidLogger(logger)) {
    logger.debug(
      ...[
        Messages.RESPONSE_RECEIVED,
        decisioningMethod,
        requestURL,
        withLabel("payload", JSON.stringify(response, null, 2))
      ].filter(isDefined)
    );
  }
  return response;
}

export function logApiRequest(
  logger,
  { request, decisioningMethod, uri, imsOrgId, sessionId, version }
) {
  if (isValidLogger(logger)) {
    logger.debug(
      ...[
        Messages.REQUEST_SENT,
        decisioningMethod,
        uri,
        withLabel("ims org id", imsOrgId),
        withLabel("session id", sessionId),
        withLabel("version", version),
        withLabel("payload", JSON.stringify(request, null, 2))
      ].filter(isDefined)
    );
  }

  return request;
}
