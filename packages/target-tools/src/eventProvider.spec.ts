import { EventProvider } from "./eventProvider";

describe("EventProvider", () => {
  it("subscribes to an event", () =>
    new Promise<void>(done => {
      expect.assertions(1);

      function aloha(event) {
        expect(event).toEqual({
          type: "aloha"
        });
        done();
      }

      const eventProvider = EventProvider({
        aloha
      });

      eventProvider.emit("aloha");
    }));

  it("subscribes to an event with payload", () =>
    new Promise<void>(done => {
      expect.assertions(1);

      function aloha(event) {
        expect(event).toEqual({
          type: "aloha",
          data: {
            value: "hello"
          },
          code: 11
        });
        done();
      }

      const eventProvider = EventProvider({
        aloha
      });

      eventProvider.emit("aloha", {
        data: {
          value: "hello"
        },
        code: 11
      });
    }));

  it("supports ad-hoc subscriptions", () =>
    new Promise<void>(done => {
      expect.assertions(1);

      function aloha(event) {
        expect(event).toEqual({
          type: "aloha"
        });
        done();
      }

      const eventProvider = EventProvider();
      eventProvider.subscribe("aloha", aloha);

      eventProvider.emit("aloha");
    }));

  it("supports ad-hoc unsubscribe", () => {
    const aloha = jest.fn();

    const eventProvider = EventProvider();
    const subscriptionId = eventProvider.subscribe("aloha", aloha);

    eventProvider.emit("aloha");
    eventProvider.unsubscribe(subscriptionId);

    eventProvider.emit("aloha");
    eventProvider.emit("aloha");
    eventProvider.emit("aloha");

    expect(aloha).toHaveBeenCalledTimes(1);
  });
});
