import {
  browserFromUserAgentOrClientHintUA,
  ChannelType,
  isDefined,
  isPlainObject,
  isString,
  operatingSystemFromUserAgentOrClientHints
} from "@adobe/target-tools";
import { parseURL, unflatten } from "./utils";

/**
 * @type { import("@adobe/target-tools/delivery-api-client/models/Context").Context }
 */
const EMPTY_CONTEXT = {
  channel: ChannelType.Web
};

function getLowerCaseAttributes(obj) {
  const result = {};

  Object.keys(obj).forEach(key => {
    result[`${key}_lc`] = isString(obj[key])
      ? obj[key].toLowerCase()
      : obj[key];
  });

  return result;
}

function withLowerCaseStringValues(obj) {
  const result = { ...obj };

  Object.keys(obj).forEach(key => {
    if (isString(result[key])) {
      result[`${key}_lc`] = result[key].toLowerCase();
    }

    if (isPlainObject(obj[key])) {
      result[key] = withLowerCaseStringValues(result[key]);
    }
  });

  return result;
}

const BROWSER_PLATFORMS_MAPPING = {
  "Windows": "windows",
  "Macintosh": "mac",
  "Mac OS": "mac",
  "macOS": "mac",
  "Linux": "linux"
};

const toTargetPlatform = platform =>
  isDefined(BROWSER_PLATFORMS_MAPPING[platform])
    ? BROWSER_PLATFORMS_MAPPING[platform]
    : platform;

/**
 * @param { import("@adobe/target-tools/delivery-api-client/models/Context").Context } context
 * @return { import("../types/DecisioningContext").UserContext }
 */
function createBrowserContext(context) {
  const { userAgent = "", clientHints } = context;

  const browser = browserFromUserAgentOrClientHintUA(userAgent, clientHints);

  const platform = operatingSystemFromUserAgentOrClientHints(
    userAgent,
    clientHints
  );

  return {
    browserType: browser.name.toLowerCase(),
    platform: toTargetPlatform(platform),
    locale: "en", // TODO: determine where this comes from
    browserVersion: browser.version
  };
}

/**
 * @param { string } url
 * @return { import("../types/DecisioningContext").PageContext }
 */
function createUrlContext(url, parseURLImpl) {
  if (!url || !isString(url)) {
    // eslint-disable-next-line no-param-reassign
    url = "";
  }

  let urlAttributes;

  if (parseURLImpl) {
    urlAttributes = parseURLImpl(url);
  } else {
    urlAttributes = parseURL(url);
  }

  return {
    ...urlAttributes,
    ...getLowerCaseAttributes(urlAttributes)
  };
}

/**
 * @param { import("@adobe/target-tools/delivery-api-client/models/Address").Address } address
 * @return { import("../types/DecisioningContext").PageContext }
 */
export function createPageContext(address, parseURLImpl) {
  return createUrlContext(address ? address.url : "", parseURLImpl);
}

/**
 * @param { import("@adobe/target-tools/delivery-api-client/models/Address").Address } address
 * @return { import("../types/DecisioningContext").PageContext }
 */
export function createReferringContext(address, parseURLImpl) {
  return createUrlContext(address ? address.referringUrl : "", parseURLImpl);
}

/**
 * @param { import("@adobe/target-tools/delivery-api-client/models/MboxRequest").MboxRequest } mboxRequest
 * @return { import("../types/DecisioningContext").MboxContext }
 */
export function createMboxContext(mboxRequest) {
  if (!mboxRequest) {
    return {};
  }

  const parameters = mboxRequest.parameters || {};

  return withLowerCaseStringValues({
    ...unflatten(parameters)
  });
}

/**
 * @param { import("@adobe/target-tools/delivery-api-client/models/Geo").Geo } geoContext
 * @return { import("../types/DecisioningContext").GeoContext}
 */
export function createGeoContext(geoContext = {}) {
  return {
    country: geoContext.countryCode,
    region: geoContext.stateCode,
    city: geoContext.city,
    latitude: geoContext.latitude,
    longitude: geoContext.longitude
  };
}

function createTimingContext() {
  const now = new Date();

  const twoDigitString = value => (value < 10 ? `0${value}` : String(value));

  const currentHours = twoDigitString(now.getUTCHours());
  const currentMinutes = twoDigitString(now.getUTCMinutes());

  const currentTime = `${currentHours}${currentMinutes}`;
  const currentDay = now.getUTCDay(); // 0 for Sunday, 1 for Monday, 2 for Tuesday, and so on.

  return {
    current_timestamp: now.getTime(), // in ms
    current_time: currentTime, // 24-hour time, UTC, HHmm
    current_day: currentDay === 0 ? 7 : currentDay // 1-7, 1 = monday, 7 = sunday
  };
}

/**
 *
 * The TargetDecisioningEngine initialize method
 * @param { import("@adobe/target-tools/delivery-api-client/models/DeliveryRequest").DeliveryRequest } deliveryRequest
 * @param { import("@adobe/target-tools/src/parsing").default } parseURLImpl
 * @return { import("../types/DecisioningContext").DecisioningContext }
 */
export function createDecisioningContext(deliveryRequest, parseURLImpl) {
  const { context = EMPTY_CONTEXT } = deliveryRequest;
  return {
    ...createTimingContext(),
    user: createBrowserContext(context),
    page: createPageContext(context.address, parseURLImpl),
    referring: createReferringContext(context.address, parseURLImpl),
    geo: createGeoContext(context.geo || {})
  };
}
