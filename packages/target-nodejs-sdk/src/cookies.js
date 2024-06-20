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

export const TARGET_COOKIE = "mbox";
export const SESSION_ID_COOKIE = "session";
export const DEVICE_ID_COOKIE = "PC";
export const LOCATION_HINT_COOKIE = "mboxEdgeCluster";
export const QA_MODE_COOKIE = "at_qa_mode";

function createInternalCookie(name, value, expires) {
  return { name, value, expires };
}

function serializeCookie(cookie) {
  return [
    encodeURIComponent(cookie.name),
    encodeURIComponent(cookie.value),
    cookie.expires
  ].join("#");
}

function deserializeCookie(str) {
  const parts = str.split("#");
  const len = parts.length;

  if (len === 0 || len < 3) {
    return null;
  }

  if (Number.isNaN(parseInt(parts[2], 10))) {
    return null;
  }

  return createInternalCookie(
    decodeURIComponent(parts[0]),
    decodeURIComponent(parts[1]),
    Number(parts[2])
  );
}

function getInternalCookies(cookieValue) {
  return cookieValue.split("|");
}

function getExpires(cookie) {
  return cookie.expires;
}

function getMaxExpires(cookies) {
  return Math.max.apply(null, cookies.map(getExpires));
}

export function parseCookies(targetCookie) {
  const result = {};

  if (!targetCookie) {
    return result;
  }

  const rawInternalCookies = getInternalCookies(targetCookie);
  const internalCookies = rawInternalCookies.map(x => deserializeCookie(x));
  const nowInSeconds = Math.ceil(Date.now() / 1000);
  const validCookies = internalCookies.filter(
    cookie => cookie && nowInSeconds <= cookie.expires
  );

  validCookies.forEach(cookie => {
    result[cookie.name] = cookie;
  });

  return result;
}

export function createTargetCookie(cookies) {
  const now = Date.now();
  const maxAge = Math.abs(getMaxExpires(cookies) * 1000 - now);
  const serializedCookies = cookies.map(x => serializeCookie(x));

  return {
    name: TARGET_COOKIE,
    value: serializedCookies.join("|"),
    maxAge: Math.ceil(maxAge / 1000)
  };
}
