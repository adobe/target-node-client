/* eslint-disable jest/no-test-callback */
import TargetDecisioningEngine from "../src";
import {
  DECISIONING_PAYLOAD_AB_SIMPLE,
  DECISIONING_PAYLOAD_BROWSER,
  DECISIONING_PAYLOAD_GLOBAL_MBOX,
  DECISIONING_PAYLOAD_VIEWS
} from "./decisioning-payloads";

const TEST_CONF = {
  client: "someClientId",
  organizationId: "someOrgId",
  pollingInterval: 0
};

const targetRequest = {
  id: {
    tntId: "338e3c1e51f7416a8e1ccba4f81acea0.28_0"
  },
  context: {
    channel: "web",
    browser: {
      host: "local-target-test"
    },
    address: {
      url: "http://local-target-test/"
    },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36"
  }
};

describe("trace", () => {
  let decisioning;

  afterEach(() => {
    decisioning.stopPolling();
    decisioning = undefined;
  });

  it("does not have a trace object if not requested", async () => {
    decisioning = await TargetDecisioningEngine({
      ...TEST_CONF,
      artifactPayload: DECISIONING_PAYLOAD_AB_SIMPLE
    });

    const result = await decisioning.getOffers({
      request: {
        ...targetRequest,
        prefetch: {
          mboxes: [
            {
              name: "superfluous-mbox",
              index: 1
            }
          ]
        }
      }
    });

    expect(result.prefetch.mboxes[0].trace).toBeUndefined();
  });

  it("has a trace object if requested ab - prefetch", async () => {
    decisioning = await TargetDecisioningEngine({
      ...TEST_CONF,
      artifactPayload: DECISIONING_PAYLOAD_AB_SIMPLE
    });

    const result = await decisioning.getOffers({
      request: {
        ...targetRequest,
        trace: {},
        prefetch: {
          mboxes: [
            {
              name: "superfluous-mbox",
              index: 1,
              parameters: {
                foo: "bar"
              }
            }
          ]
        }
      },
      sessionId: "dummy_session",
      locationHint: "28"
    });

    expect(result.prefetch.mboxes[0].trace).toMatchObject({
      clientCode: "someClientId",
      request: {
        mbox: {
          name: "superfluous-mbox",
          type: "prefetch",
          // version: 63,
          // count: 0,
          parameters: {
            foo: "bar"
            // mboxMCSDID: "65D10A705D23AF49-445477BD9B018EF4"
          }
        },
        // pageId: "732c94f9-8629-4d2b-b5de-d6bf40f768e8",
        sessionId: "dummy_session",
        pageURL: "http://local-target-test/",
        host: "local-target-test"
      },
      campaigns: [
        {
          id: 334411,
          campaignType: "ab",
          branchId: 1,
          offers: [631991],
          environment: 11507
        }
      ],
      profile: {
        visitorId: {
          tntId: "338e3c1e51f7416a8e1ccba4f81acea0",
          profileLocation: "28_0"
        }
      },
      evaluatedCampaignTargets: [
        {
          campaignId: 334411,
          campaignType: "ab",
          matchedSegmentIds: [5361982],
          unmatchedSegmentIds: [5361981]
        }
      ]
    });
  });

  it("has a trace object with metrics if requested xt - prefetch", async () => {
    decisioning = await TargetDecisioningEngine({
      ...TEST_CONF,
      artifactPayload: DECISIONING_PAYLOAD_BROWSER
    });

    const result = await decisioning.getOffers({
      request: {
        ...targetRequest,
        trace: {},
        prefetch: {
          mboxes: [
            {
              name: "browser-mbox",
              index: 1
            }
          ]
        }
      },
      sessionId: "dummy_session",
      locationHint: "28"
    });

    expect(result.prefetch.mboxes[0].trace).toMatchObject({
      clientCode: "someClientId",
      request: {
        mbox: {
          name: "browser-mbox",
          type: "prefetch"
          // version: 63,
          // count: 0,
        },
        // pageId: "d074ff55-f97d-4bef-b726-df036dee6091",
        sessionId: "dummy_session",
        pageURL: "http://local-target-test/",
        host: "local-target-test"
      },
      campaigns: [
        {
          id: 334845,
          campaignType: "xt",
          branchId: 3,
          offers: [632438],
          environment: 11507
        }
      ],
      profile: {
        visitorId: {
          tntId: "338e3c1e51f7416a8e1ccba4f81acea0",
          profileLocation: "28_0"
        }
      },
      evaluatedCampaignTargets: [
        {
          campaignId: 334845,
          campaignType: "xt",
          matchedSegmentIds: [2170460],
          unmatchedSegmentIds: [4873452, 4957566]
        }
      ]
    });
  });

  it("has a trace object if requested xt - execute", async () => {
    decisioning = await TargetDecisioningEngine({
      ...TEST_CONF,
      artifactPayload: DECISIONING_PAYLOAD_BROWSER
    });

    const result = await decisioning.getOffers({
      request: {
        ...targetRequest,
        trace: {},
        execute: {
          mboxes: [
            {
              name: "browser-mbox",
              index: 1
            }
          ]
        }
      },
      sessionId: "dummy_session",
      locationHint: "28"
    });

    expect(result.execute.mboxes[0].trace).toMatchObject({
      clientCode: "someClientId",
      request: {
        mbox: {
          name: "browser-mbox",
          type: "execute"
          // version: 63,
          // count: 0,
        },
        // pageId: "d074ff55-f97d-4bef-b726-df036dee6091",
        sessionId: "dummy_session",
        pageURL: "http://local-target-test/",
        host: "local-target-test"
      },
      campaigns: [
        {
          id: 334845,
          campaignType: "xt",
          branchId: 3,
          offers: [632438],
          notifications: [
            {
              id: expect.any(String),
              impressionId: expect.any(String),
              timestamp: expect.any(Number),
              type: "display",
              mbox: {
                name: "browser-mbox"
              },
              tokens: [
                "B8C2FP2IuBgmeJcDfXHjGpZBXFCzaoRRABbzIA9EnZOCnQ9Y9OaLL2gsdrWQTvE54PwSz67rmXWmSnkXpSSS2Q=="
              ]
            }
          ],
          environment: 11507
        }
      ],
      profile: {
        visitorId: {
          tntId: "338e3c1e51f7416a8e1ccba4f81acea0",
          profileLocation: "28_0"
        }
      },
      evaluatedCampaignTargets: [
        {
          campaignId: 334845,
          campaignType: "xt",
          matchedSegmentIds: [2170460],
          unmatchedSegmentIds: [4873452, 4957566]
        }
      ]
    });
  });

  it("has a trace object for pageLoad - execute", async () => {
    decisioning = await TargetDecisioningEngine({
      ...TEST_CONF,
      artifactPayload: DECISIONING_PAYLOAD_GLOBAL_MBOX
    });

    const result = await decisioning.getOffers({
      request: {
        ...targetRequest,
        trace: {},
        execute: {
          pageLoad: {
            parameters: {
              foo: "bar"
            }
          }
        }
      },
      sessionId: "dummy_session",
      locationHint: "28"
    });

    expect(result.execute.pageLoad.trace).toMatchObject({
      clientCode: "someClientId",
      request: {
        mbox: {
          name: "target-global-mbox",
          type: "execute"
        },
        sessionId: "dummy_session",
        pageURL: "http://local-target-test/",
        host: "local-target-test"
      },
      campaigns: [
        {
          id: 337795,
          campaignType: "xt",
          branchId: 0,
          offers: [635716],
          environment: 11507,
          notifications: [
            {
              type: "display",
              mbox: {
                name: "target-global-mbox"
              },
              tokens: [
                "9FNM3ikASssS+sVoFXNulGqipfsIHvVzTQxHolz2IpSCnQ9Y9OaLL2gsdrWQTvE54PwSz67rmXWmSnkXpSSS2Q=="
              ]
            }
          ]
        },
        {
          id: 337797,
          campaignType: "ab",
          branchId: 1,
          offers: [635718],
          environment: 11507,
          notifications: [
            {
              type: "display",
              mbox: {
                name: "target-global-mbox"
              },
              tokens: [
                "0L1rCkDps3F+UEAm1B9A4JNWHtnQtQrJfmRrQugEa2qCnQ9Y9OaLL2gsdrWQTvE54PwSz67rmXWmSnkXpSSS2Q=="
              ]
            }
          ]
        },
        {
          id: 337888,
          campaignType: "ab",
          branchId: 1,
          offers: [635776],
          environment: 11507,
          notifications: [
            {
              type: "display",
              mbox: {
                name: "target-global-mbox"
              },
              tokens: [
                "5C2cbrGD+bQ5qOATNGy1AZNWHtnQtQrJfmRrQugEa2qCnQ9Y9OaLL2gsdrWQTvE54PwSz67rmXWmSnkXpSSS2Q=="
              ]
            }
          ]
        }
      ],
      profile: {
        visitorId: {
          tntId: "338e3c1e51f7416a8e1ccba4f81acea0",
          profileLocation: "28_0"
        }
      },
      evaluatedCampaignTargets: [
        {
          campaignId: 337795,
          campaignType: "xt",
          matchedSegmentIds: [2170460],
          unmatchedSegmentIds: []
        },
        {
          campaignId: 337797,
          campaignType: "ab",
          matchedSegmentIds: [5272024],
          unmatchedSegmentIds: [5272024]
        },
        {
          campaignId: 337888,
          campaignType: "ab",
          matchedSegmentIds: [],
          unmatchedSegmentIds: []
        }
      ]
    });
  });

  it("does not have a trace object for prefetch views if not requested", async () => {
    decisioning = await TargetDecisioningEngine({
      ...TEST_CONF,
      artifactPayload: DECISIONING_PAYLOAD_VIEWS
    });

    const result = await decisioning.getOffers({
      request: {
        ...targetRequest,
        prefetch: {
          views: [
            {
              name: "contact"
            }
          ]
        }
      }
    });

    expect(result.prefetch.views[0].trace).toBeUndefined();
  });

  it("has a trace object for prefetch views when requested", async () => {
    decisioning = await TargetDecisioningEngine({
      ...TEST_CONF,
      artifactPayload: DECISIONING_PAYLOAD_VIEWS
    });

    const result = await decisioning.getOffers({
      request: {
        ...targetRequest,
        prefetch: {
          views: [
            {
              name: "contact",
              parameters: {
                browser: "chrome"
              }
            }
          ]
        },
        trace: {}
      }
    });

    expect(result.prefetch.views[0].trace).toEqual(
      expect.objectContaining({
        request: {
          pageURL: "http://local-target-test/",
          host: "local-target-test",
          view: {
            name: "contact",
            parameters: {
              browser: "chrome"
            },
            type: "prefetch"
          }
        },
        campaigns: [
          {
            id: 344682,
            campaignType: "ab",
            branchId: 1,
            offers: expect.any(Array),
            environment: "production"
          }
        ],
        evaluatedCampaignTargets: [
          {
            context: expect.objectContaining({
              mbox: {
                browser: "chrome",
                browser_lc: "chrome"
              },
              allocation: expect.any(Number)
            }),
            campaignId: 344682,
            campaignType: "ab",
            matchedSegmentIds: [5634157, 5642375, 5634562],
            unmatchedSegmentIds: [5634157, 5642375, 5634562],
            matchedRuleConditions: expect.any(Array),
            unmatchedRuleConditions: expect.any(Array)
          }
        ]
      })
    );
  });
});
