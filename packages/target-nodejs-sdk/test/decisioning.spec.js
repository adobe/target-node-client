import {
  DECISIONING_ENGINE_NOT_READY,
  DECISIONING_METHOD
} from "@adobe/target-tools";

import { ARTIFACT_FORMAT_JSON } from "@adobe/target-decisioning-engine/src/constants";

const ARTIFACT_AB_SIMPLE = require("@adobe/target-decisioning-engine/test/schema/artifacts/TEST_ARTIFACT_AB_SIMPLE.json");
const ARTIFACT_BLANK = require("@adobe/target-decisioning-engine/test/schema/artifacts/TEST_ARTIFACT_BLANK.json");

const HttpStatus = require("http-status-codes");

const MockDate = require("mockdate");
require("jest-fetch-mock").enableMocks();
const TargetClient = require("../src/index.server").default;

const TARGET_REQUEST = {
  prefetch: {
    mboxes: [
      {
        name: "mbox-something",
        index: 1
      }
    ]
  }
};

const CONFIG = {
  client: "someClientId",
  organizationId: "someOrgId",
  artifactFormat: ARTIFACT_FORMAT_JSON, // setting this tells the artifactProvider deobfuscation is not needed
  targetLocationHint: "28",
  pollingInterval: 0,
  maximumWaitReady: 500,
  telemetryEnabled: false
};

describe("target on-device decisioning", () => {
  let client;

  beforeEach(() => {
    MockDate.reset();
    fetch.resetMocks();
    if (client) {
      client = undefined;
    }
  });

  describe("initializes", () => {
    it("creates an instance of target-decisioning-engine if decisioning method is on-device", () => {
      fetch.mockResponse(JSON.stringify(ARTIFACT_BLANK));

      return new Promise(done => {
        client = TargetClient.create({
          ...CONFIG,
          decisioningMethod: DECISIONING_METHOD.ON_DEVICE,
          events: {
            clientReady: () => {
              expect(client.decisioningEngine).not.toBeUndefined();
              expect(typeof client.decisioningEngine.getOffers).toEqual(
                "function"
              );
              done();
            }
          }
        });
      });
    });

    it("does not create an instance of target-decisioning-engine if evaluation mode is remote", () => {
      expect.assertions(2);
      fetch.mockResponse(JSON.stringify(ARTIFACT_BLANK));

      return new Promise(done => {
        client = TargetClient.create({
          ...CONFIG,
          decisioningMethod: DECISIONING_METHOD.SERVER_SIDE,
          events: {
            clientReady: () => {
              expect(client).toBeDefined();
              expect(
                Object.prototype.hasOwnProperty.call(
                  client,
                  "decisioningEngine"
                )
              ).toEqual(false);
              done();
            }
          }
        });
      });
    });
  });

  describe("throws an error", () => {
    it("if a getOffers request is made before the decisioning artifact is available", () => {
      expect.assertions(1);
      let timer;

      fetch.mockResponse(
        () =>
          new Promise(resolve => {
            timer = setTimeout(() => {
              resolve(JSON.stringify(ARTIFACT_BLANK));
            }, 100);
          })
      );

      return new Promise(async done => {
        client = TargetClient.create({
          ...CONFIG,
          decisioningMethod: DECISIONING_METHOD.ON_DEVICE
        });

        // make the request immediately (before the artifact has been fetched)
        await expect(
          client.getOffers({
            request: TARGET_REQUEST,
            sessionId: "dummy_session"
          })
        ).rejects.toEqual(new Error(DECISIONING_ENGINE_NOT_READY));

        if (timer) {
          clearTimeout(timer);
        }
        done();
      });
    });

    it("if getOffers is called, but the artifact could not be retrieved", () => {
      fetch.mockResponses(
        ["", { status: HttpStatus.UNAUTHORIZED }],
        ["", { status: HttpStatus.NOT_FOUND }],
        ["", { status: HttpStatus.NOT_ACCEPTABLE }],
        ["", { status: HttpStatus.NOT_IMPLEMENTED }],
        ["", { status: HttpStatus.FORBIDDEN }],
        ["", { status: HttpStatus.SERVICE_UNAVAILABLE }],
        ["", { status: HttpStatus.BAD_REQUEST }],
        ["", { status: HttpStatus.BAD_GATEWAY }],
        ["", { status: HttpStatus.TOO_MANY_REQUESTS }],
        ["", { status: HttpStatus.GONE }],
        ["", { status: HttpStatus.INTERNAL_SERVER_ERROR }]
      );

      const artifactDownloadFailed = jest.fn();
      const artifactDownloadSucceeded = jest.fn();
      const clientReady = jest.fn();

      return new Promise(async done => {
        client = TargetClient.create({
          ...CONFIG,
          decisioningMethod: DECISIONING_METHOD.ON_DEVICE,
          maximumWaitReady: 500,
          events: {
            clientReady,
            artifactDownloadFailed,
            artifactDownloadSucceeded
          }
        });

        await expect(
          client.getOffers({
            request: TARGET_REQUEST,
            sessionId: "dummy_session"
          })
        ).rejects.toEqual(new Error(DECISIONING_ENGINE_NOT_READY));

        const timer = setTimeout(async () => {
          await expect(
            client.getOffers({
              request: TARGET_REQUEST,
              sessionId: "dummy_session"
            })
          ).rejects.toEqual(new Error(DECISIONING_ENGINE_NOT_READY));

          expect(clientReady).not.toHaveBeenCalled();
          expect(artifactDownloadSucceeded).not.toHaveBeenCalled();
          expect(artifactDownloadFailed).toHaveBeenCalledTimes(11);

          expect(artifactDownloadFailed.mock.calls[0][0]).toEqual(
            expect.objectContaining({
              type: "artifactDownloadFailed",
              artifactLocation: expect.any(String),
              error: expect.any(Error)
            })
          );

          clearTimeout(timer);
          done();
        }, 500);
      });
    });
  });

  describe("models delivery api", () => {
    const DELIVERY_API_RESPONSE = {
      status: 200,
      requestId: "0979a315df524c74aa420a9d03c8d921",
      client: "targettesting",
      id: {
        tntId: "338e3c1e51f7416a8e1ccba4f81acea0.28_0",
        marketingCloudVisitorId: "07327024324407615852294135870030620007"
      },
      edgeHost: "mboxedge28.tt.omtrdc.net",
      prefetch: {
        mboxes: [
          {
            index: 2,
            name: "mbox-magician",
            options: [
              {
                content: { doMagic: true, importantValue: 150 },
                type: "json",
                eventToken:
                  "abzfLHwlBDBNtz9ALey2fJNWHtnQtQrJfmRrQugEa2qCnQ9Y9OaLL2gsdrWQTvE54PwSz67rmXWmSnkXpSSS2Q==",
                responseTokens: {}
              }
            ]
          }
        ]
      }
    };

    const targetRequest = {
      id: {
        tntId: "338e3c1e51f7416a8e1ccba4f81acea0.28_0",
        marketingCloudVisitorId: "07327024324407615852294135870030620007"
      },
      context: {
        channel: "web",
        address: {
          url: "http://adobe.com"
        },
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:73.0) Gecko/20100101 Firefox/73.0",
        beacon: false
      }
    };

    const prefetchRequestOptions = {
      request: {
        ...targetRequest,
        prefetch: {
          mboxes: [
            {
              name: "mbox-magician",
              index: 2
            }
          ]
        }
      },
      sessionId: "dummy_session"
    };

    const executeRequestOptions = {
      request: {
        ...targetRequest,
        execute: {
          mboxes: [
            {
              name: "mbox-magician",
              index: 2
            }
          ]
        }
      },
      sessionId: "dummy_session"
    };

    const targetClientOptions = {
      client: "targettesting",
      organizationId: "74F652E95F1B16FE0A495C92@AdobeOrg",
      artifactFormat: "json", // setting this tells the artifactProvider deobfuscation is not needed
      pollingInterval: 0,
      maximumWaitReady: 500,
      telemetryEnabled: false
    };

    const targetResult = {
      visitorState: {
        "74F652E95F1B16FE0A495C92@AdobeOrg": {
          sdid: {
            supplementalDataIDCurrent: expect.any(String),
            supplementalDataIDCurrentConsumed: {
              "payload:target-global-mbox": true
            },
            supplementalDataIDLastConsumed: {}
          }
        }
      },
      request: {
        requestId: expect.any(String),
        id: {
          tntId: "338e3c1e51f7416a8e1ccba4f81acea0.28_0",
          marketingCloudVisitorId: "07327024324407615852294135870030620007"
        },
        context: {
          channel: "web",
          address: {
            url: "http://adobe.com"
          },
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:73.0) Gecko/20100101 Firefox/73.0",
          beacon: false
        },
        experienceCloud: {
          analytics: {
            supplementalDataId: expect.any(String),
            logging: "server_side"
          }
        },
        prefetch: {
          mboxes: [
            {
              index: 2,
              name: "mbox-magician"
            }
          ]
        }
      },
      targetCookie: {
        name: "mbox",
        value: expect.stringContaining("session#dummy_session"),
        maxAge: 63244801
      },
      response: {
        status: 200,
        requestId: expect.any(String),
        id: {
          tntId: "338e3c1e51f7416a8e1ccba4f81acea0.28_0",
          marketingCloudVisitorId: "07327024324407615852294135870030620007"
        },
        client: "targettesting",
        prefetch: {
          mboxes: [
            {
              index: 2,
              name: "mbox-magician",
              options: [
                {
                  content: {
                    doMagic: true,
                    importantValue: 150
                  },
                  eventToken: expect.any(String),
                  type: "json",
                  responseTokens: expect.any(Object)
                }
              ]
            }
          ]
        }
      }
    };
    describe("targetLocationHintCookie", () => {
      it("is makes a preemptive delivery request to get the mboxEdgeCluster on init", () => {
        fetch
          .once(
            JSON.stringify({
              status: 200,
              requestId: "1387f0ea-51d6-43df-ba32-f2fe79c356bd",
              client: "someClientId",
              id: {
                tntId: "someSessionId.28_0"
              },
              edgeHost: "mboxedge28.tt.omtrdc.net"
            })
          )
          .once(JSON.stringify(ARTIFACT_AB_SIMPLE));

        return new Promise(done => {
          async function clientReady() {
            const result = await client.getOffers(prefetchRequestOptions);

            expect(result.targetLocationHintCookie).toEqual({
              name: "mboxEdgeCluster",
              value: "28",
              maxAge: 1860
            });
            done();
          }

          client = TargetClient.create({
            ...targetClientOptions,
            decisioningMethod: DECISIONING_METHOD.ON_DEVICE,
            events: { clientReady }
          });
        });
      });

      it("recovers if the delivery request fails", () => {
        fetch.mockResponses(
          ["", { status: HttpStatus.SERVICE_UNAVAILABLE }],
          [JSON.stringify(ARTIFACT_AB_SIMPLE), { status: HttpStatus.OK }]
        );

        return new Promise(done => {
          async function clientReady() {
            const result = await client.getOffers(prefetchRequestOptions);

            expect(result.targetLocationHintCookie).toBeUndefined();
            done();
          }

          client = TargetClient.create({
            ...targetClientOptions,
            decisioningMethod: DECISIONING_METHOD.ON_DEVICE,
            events: { clientReady }
          });
        });
      });

      it("can be passed in as a config option to be used instead of of a preemptive delivery request", () => {
        fetch.once(JSON.stringify(ARTIFACT_AB_SIMPLE));

        return new Promise(done => {
          async function clientReady() {
            const result = await client.getOffers(prefetchRequestOptions);

            expect(result.targetLocationHintCookie).toEqual({
              name: "mboxEdgeCluster",
              value: "28",
              maxAge: 1860
            });
            done();
          }

          client = TargetClient.create({
            ...targetClientOptions,
            decisioningMethod: DECISIONING_METHOD.ON_DEVICE,
            pollingInterval: 0,
            targetLocationHint: "28",
            events: { clientReady }
          });
        });
      });
    });

    describe("responses", () => {
      it("produces a valid response in on-device decisioning method", () => {
        fetch.mockResponse(JSON.stringify(ARTIFACT_AB_SIMPLE));

        return new Promise(done => {
          async function clientReady() {
            const result = await client.getOffers(prefetchRequestOptions);

            expect(result).toMatchObject({
              ...targetResult,
              meta: {
                decisioningMethod: DECISIONING_METHOD.ON_DEVICE,
                remoteMboxes: [],
                remoteViews: []
              },
              response: {
                ...targetResult.response
              }
            });
            done();
          }

          client = TargetClient.create({
            ...targetClientOptions,
            decisioningMethod: DECISIONING_METHOD.ON_DEVICE,
            targetLocationHint: "28",
            pollingInterval: 0,
            events: { clientReady }
          });
        });
      });

      it("emits notifications for on-device decisioning outcomes; execute request", () => {
        const now = new Date("2020-02-25T01:05:00");
        MockDate.set(now);

        let notificationRequest;
        let notificationPayload;

        fetch.once(JSON.stringify(ARTIFACT_AB_SIMPLE)).once(
          async req => {
            notificationRequest = req;
            notificationPayload = await req.json();
            return Promise.resolve("");
          },
          {
            status: HttpStatus.NO_CONTENT
          }
        );

        return new Promise(done => {
          async function clientReady() {
            await expect(
              client.getOffers(executeRequestOptions)
            ).resolves.toBeDefined();

            // timeout to wait for notifications to finish
            setTimeout(() => {
              expect(fetch.mock.calls.length).toEqual(2);

              expect(notificationRequest).not.toBeUndefined();
              expect(notificationRequest.method).toEqual("POST");

              expect(notificationPayload).toMatchObject({
                ...targetRequest,
                notifications: [
                  {
                    id: expect.any(String),
                    impressionId: expect.any(String),
                    timestamp: now.getTime(),
                    type: "display",
                    mbox: {
                      name: "mbox-magician"
                    },
                    tokens: [expect.any(String)]
                  }
                ]
              });

              done();
            }, 100);
          }

          client = TargetClient.create({
            ...targetClientOptions,
            decisioningMethod: DECISIONING_METHOD.ON_DEVICE,
            pollingInterval: 0,
            targetLocationHint: "28",

            events: { clientReady }
          });
        });
      });

      it("emits errors when there are sendNotification errors", () => {
        const now = new Date("2020-02-25T01:05:00");
        MockDate.set(now);

        const sendNotificationError = jest.fn();
        fetch.mockResponses(
          [JSON.stringify(ARTIFACT_AB_SIMPLE), { status: HttpStatus.OK }],
          ["/", { status: HttpStatus.OK }]
        );

        return new Promise(done => {
          async function clientReady() {
            await expect(
              client.getOffers(executeRequestOptions)
            ).resolves.toBeDefined();

            // timeout to wait for notifications to finish
            setTimeout(() => {
              expect(fetch.mock.calls.length).toEqual(2);
              expect(sendNotificationError.mock.calls.length).toBe(1);

              const { type, notification, error } =
                sendNotificationError.mock.calls[0][0];

              expect(type).toEqual("sendNotificationError");
              expect(notification).toMatchObject({
                request: {
                  notifications: [
                    {
                      type: "display",
                      mbox: {
                        name: "mbox-magician"
                      }
                    }
                  ]
                }
              });
              expect(error).toMatchObject({
                type: "invalid-json"
              });

              done();
            }, 100);
          }

          client = TargetClient.create({
            ...targetClientOptions,
            decisioningMethod: DECISIONING_METHOD.ON_DEVICE,
            pollingInterval: 0,
            targetLocationHint: "28",

            events: { clientReady, sendNotificationError }
          });
        });
      });

      it("produces a valid response in remote execution mode", () => {
        fetch.mockResponse(JSON.stringify(DELIVERY_API_RESPONSE));

        return new Promise(done => {
          async function clientReady() {
            const result = await client.getOffers(prefetchRequestOptions);

            expect(result).toMatchObject({
              ...targetResult,
              response: {
                ...targetResult.response,
                edgeHost: "mboxedge28.tt.omtrdc.net"
              },
              targetLocationHintCookie: {
                name: "mboxEdgeCluster",
                value: "28",
                maxAge: 1860
              }
            });
            done();
          }

          client = TargetClient.create({
            ...targetClientOptions,
            decisioningMethod: DECISIONING_METHOD.SERVER_SIDE,
            events: { clientReady }
          });
        });
      });
    });
  });
});
