/* eslint-disable no-restricted-syntax */
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
require("jest-fetch-mock").enableMocks();
const TargetTools = require("@adobe/target-tools");
const Visitor = require("@adobe-mcid/visitor-js-server");
const target = require("../src/target");
const utils = require("../src/utils");
const { Messages } = require("../src/messages");

const AUTH_STATE = { UNKNOWN: 0, AUTHENTICATED: 1, LOGGED_OUT: 2 };
const VISITOR_CUSTOMER_IDS = {
  userid: {
    id: "67312378756723456",
    authState: 1
  },
  puuid: "550e8400-e29b-41d4-a716-446655440000"
};
const testLogger = {
  debug: message => message,
  error: message => message
};

let TargetClient;

describe("Target Client factory", () => {
  beforeAll(() => {
    jest
      .spyOn(target, "executeDelivery")
      .mockImplementation(() => Promise.resolve({ response: "response" }));

    jest.spyOn(utils, "createVisitor");
    jest.spyOn(TargetTools, "getLogger");

    // eslint-disable-next-line global-require
    TargetClient = require("../src/index.server").default;
  });

  afterEach(() => {
    target.executeDelivery.mockClear();
    utils.createVisitor.mockClear();
    TargetTools.getLogger.mockClear();
  });

  it("should throw when instantiated via new", () => {
    expect(() => new TargetClient()).toThrow(
      new Error(Messages.PRIVATE_CONSTRUCTOR)
    );
  });

  it("should throw when options are missing", () => {
    expect(() => TargetClient.create({})).toThrow(
      new Error(Messages.OPTIONS_REQUIRED)
    );
  });

  it("should throw when organization ID is missing", () => {
    expect(() => TargetClient.create({ client: "client" })).toThrow(
      new Error(Messages.ORG_ID_REQUIRED)
    );
  });

  it("should throw if an invalid evaluation mode is given", () => {
    expect(() =>
      TargetClient.create({
        client: "client",
        organizationId: "orgId",
        decisioningMethod: "wicked"
      })
    ).toThrow(new Error(Messages.DECISIONING_METHOD_INVALID));
  });

  it("should not throw when client, orgId and fetchApi are present", () => {
    expect(() =>
      TargetClient.create({
        client: "client",
        organizationId: "orgId",
        fetchApi: fetch
      })
    ).not.toThrow();
  });

  it("should set logger on creation", () => {
    expect(() =>
      TargetClient.create({
        client: "client",
        organizationId: "orgId",
        fetchApi: fetch,
        logger: testLogger
      })
    ).not.toThrow();
    expect(TargetTools.getLogger).toHaveBeenCalledTimes(1);
    const logger =
      TargetTools.getLogger.mock.results[
        TargetTools.getLogger.mock.calls.length - 1
      ].value;
    expect(logger.debug).toEqual(expect.any(Function));
    expect(logger.error).toEqual(expect.any(Function));
  });

  it("should return Target cookie name", () => {
    expect(TargetClient.TargetCookieName).toBe("mbox");
  });

  it("should return Target location hint cookie name", () => {
    expect(TargetClient.TargetLocationHintCookieName).toBe("mboxEdgeCluster");
  });

  it("should return visitor cookie name", () => {
    expect(TargetClient.getVisitorCookieName("foo@AdobeOrg")).toBe(
      "AMCV_foo@AdobeOrg"
    );
  });

  it("should return qa mode cookie name", () => {
    expect(TargetClient.TargetQaModeCookieName).toBe("at_qa_mode");
  });

  it("should return Visitor Auth State", () => {
    expect(TargetClient.AuthState).toEqual(AUTH_STATE);
  });

  it("getOffers should throw when options are missing", async () => {
    const client = TargetClient.create({
      client: "client",
      organizationId: "orgId",
      fetchApi: fetch
    });

    await expect(client.getOffers({})).rejects.toEqual(
      new Error(Messages.OPTIONS_REQUIRED)
    );
  });

  it("getOffers should throw when request is missing", async () => {
    const client = TargetClient.create({
      client: "client",
      organizationId: "orgId",
      fetchApi: fetch
    });

    await expect(client.getOffers({ consumerId: "test123" })).rejects.toEqual(
      new Error(Messages.REQUEST_REQUIRED)
    );
  });

  it("getOffers should throw when execute fields are missing", async () => {
    const client = TargetClient.create({
      client: "client",
      organizationId: "orgId",
      fetchApi: fetch
    });

    await expect(
      client.getOffers({ request: { execute: { badField: "bad" } } })
    ).rejects.toEqual(new Error(Messages.EXECUTE_FIELDS_REQUIRED));
  });

  it("getOffers should throw when prefetch fields are missing", async () => {
    const client = TargetClient.create({
      client: "client",
      organizationId: "orgId",
      fetchApi: fetch
    });

    await expect(
      client.getOffers({ request: { prefetch: { badField: "bad" } } })
    ).rejects.toEqual(new Error(Messages.PREFETCH_FIELDS_REQUIRED));
  });

  it("should return Promise response on getOffers call", async () => {
    const client = TargetClient.create({
      client: "client",
      organizationId: "orgId",
      fetchApi: fetch
    });
    const request = {
      execute: {
        mboxes: [{ name: "testmbox" }]
      }
    };

    await expect(
      client.getOffers({ request, customerIds: VISITOR_CUSTOMER_IDS })
    ).resolves.toEqual({
      response: "response"
    });
    expect(target.executeDelivery.mock.calls.length).toBe(1);
    expect(utils.createVisitor.mock.calls.length).toBe(1);
    const visitor =
      utils.createVisitor.mock.results[
        utils.createVisitor.mock.calls.length - 1
      ].value;

    expect(visitor).toEqual(expect.any(Visitor));
    const visitorState = JSON.stringify(visitor.getState());
    expect(visitorState).toEqual(
      '{"orgId@AdobeOrg":{"customerIDs":{"userid":{"id":"67312378756723456","authState":1},"puuid":"550e8400-e29b-41d4-a716-446655440000"}}}'
    );
  });

  it("sendNotifications should throw when options are missing", async () => {
    const client = TargetClient.create({
      client: "client",
      organizationId: "orgId",
      fetchApi: fetch
    });

    await expect(client.sendNotifications({})).rejects.toEqual(
      new Error(Messages.OPTIONS_REQUIRED)
    );
  });

  it("sendNotifications should throw when request is missing", async () => {
    const client = TargetClient.create({
      client: "client",
      organizationId: "orgId",
      fetchApi: fetch
    });

    await expect(
      client.sendNotifications({ consumerId: "test123" })
    ).rejects.toEqual(new Error(Messages.REQUEST_REQUIRED));
  });

  it("sendNotifications should throw when notifications are missing", async () => {
    const client = TargetClient.create({
      client: "client",
      organizationId: "orgId",
      fetchApi: fetch
    });

    await expect(
      client.sendNotifications({ request: { trace: {} } })
    ).rejects.toEqual(new Error(TargetTools.NOTIFICATIONS_REQUIRED));
  });

  it("should return Promise response on sendNotifications call", async () => {
    const client = TargetClient.create({
      client: "client",
      organizationId: "orgId",
      fetchApi: fetch
    });
    const request = {
      notifications: [
        {
          id: "1234",
          type: "display"
        }
      ]
    };

    await expect(client.sendNotifications({ request })).resolves.toEqual({
      response: "response"
    });
    expect(target.executeDelivery.mock.calls.length).toBe(1);
    expect(utils.createVisitor.mock.calls.length).toBe(1);
    const visitor =
      utils.createVisitor.mock.results[
        utils.createVisitor.mock.calls.length - 1
      ].value;

    expect(visitor).toEqual(expect.any(Visitor));
    expect(visitor.getState()).toEqual(
      expect.objectContaining({ "orgId@AdobeOrg": {} })
    );
  });
});
