# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2020-10-26
### Added
- Support for on-device decisioning
- New parameters added in create() when initializing the Node.js SDK
    - decisioningMethod
    - pollingInterval
    - artifactLocation
    - artifactPayload
    - events
- New method getAttributes() to fetch experimentation and personalized experiences from Target and extract attribute values. 
- Campaign macro support

### Changed
- renamed `locationHintCookie` to `locationHint` in getOffers call
- Replaced the the delivery request implementation with one based on [Fetch](https://fetch.spec.whatwg.org).  This allows the sdk to function in both node.js and browser environments.
- Modified sendNotifications to use [Navigator.sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) if run in a browser environment.
- Migrated tests from jasmine to jest
- Changed to a mono repo structure using lerna to support multiple packages
  - target-nodejs-sdk - the sdk was moved inside the packages folder
  - target-decisioning-engine - adds the ability to load target rules and evaluate them locally instead of making a delivery api request
  - target-tools - shared code and config between the above packages

## [1.1.0] - 2020-06-09
### Added
- Support for providing an IP Address when a getOffers call is made using the request>context>geo object. [see sample usage](https://gist.github.com/jasonwaters/9a408ac65717c272efbce12d43d62c4d)

## [1.0.3] - 2019-10-10
### Changed
- Minor [README](README.md) updates

## [1.0.1] - 2019-10-09
### Added
- [Target View Delivery v1 API](https://developers.adobetarget.com/api/delivery-api/) support, including Page Load and View prefetch
    - Full support for delivering all types of offers authored in Visual Experience Composer 
- Support for prefetching and notifications, that allows for performance optimization by caching prefetched content
- Support for optimizing performance in hybrid Target integrations via `serverState`, when Target is deployed both on the server-side and
on the client-side
    - We are introducing a setting called `serverState` that will contain experiences retrieved via server-side, so that 
    at.js v2.2+ will not make an additional server call to retrieve the experiences. This approach optimizes page load performance.
- Open sourced on GitHub as [Target Node.js SDK](https://github.com/adobe/target-nodejs-sdk)
- New [sendNotifications() API method](README.md#targetclientsendnotifications), for sending displayed/clicked notifications
to Target for content prefetched via [getOffers()](README.md#targetclientgetoffers)
- Simplified View Delivery API request building, with internal field auto-completion with defaults 
(e.g. `request.id`, `request.context` etc.) 
- Validation of SDK API method arguments 
- Updated README, samples and unit tests
- New CI flow set up using GitHub Actions
- Added CoC, Contribution guidelines, PR and issue templates

### Changed
- Project renamed to `target-nodejs-sdk`
- Major refactoring, replacing Target BatchMbox v2 API with Target View Delivery v1 API 
- [create() API method](README.md#targetclientcreate) arguments have been modified, removing redundant nesting (see old
method declaration [here](https://www.npmjs.com/package/@adobe/target-node-client#targetnodeclientcreate))
- [getOffers() API method](README.md#targetclientgetoffers) arguments have been modified (see old
method declaration [here](https://www.npmjs.com/package/@adobe/target-node-client#targetnodeclientgetoffers))
- `getTargetCookieName()` API method has been replaced with `TargetCookieName` accessor, see
[TargetClient utility accessors](README.md#targetclient-utility-accessors)
- `getTargetLocationHintCookieName()` API method has been replaced with `TargetLocationHintCookieName` accessor, see
[TargetClient utility accessors](README.md#targetclient-utility-accessors)

### Removed
- Target BatchMbox v2 API support
- [getOffer() API method](https://www.npmjs.com/package/@adobe/target-node-client#targetnodeclientgetoffer) has been removed,
use [getOffers() API method](README.md#targetclientgetoffers) instead 

[Unreleased]: https://github.com/adobe/target-nodejs-sdk/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/adobe/target-nodejs-sdk/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/adobe/target-nodejs-sdk/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/adobe/target-nodejs-sdk/compare/v1.0.1...v1.0.3
[1.0.1]: https://github.com/adobe/target-nodejs-sdk/releases/tag/v1.0.1
