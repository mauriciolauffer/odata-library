"use strict";

const Resource = require("./Resource");

/**
 * Javascript class which implements common functionality for Action
 * and Function classes.
 *
 * @class BoundableResource
 * @extends {Resource}
 */
class BoundableResource extends Resource {
  /**
   * Creates an instance of <code>BoundableResource</code>.
   * @param {Agent} agent instance of the Agent class @see Agent.js
   * @param {Object} metadata information about BoundableResource from Metadata
   * @memberof BoundableResource
   */
  constructor(agent, metadata) {
    super(agent, {
      _parameters: {},
    });

    Object.defineProperty(this, "meta", {
      value: metadata,
      writable: false,
    });
  }

  /**
   * Normalize response and returns raw response or object or array
   *
   * @param {IncomingMessage} rawResponse from HTTP client
   * @param {Boolean} raw force to use raw response
   *
   * @returns {Object|Array} raw response object or object or results array
   *
   * @memberof BoundableResource
   */
  normalizeResponse(rawResponse, raw) {
    let promise = Promise.resolve(rawResponse);
    let contentType;

    if (!raw) {
      contentType = rawResponse.headers.get("content-type");
      if (typeof contentType === "string" && contentType.match(/application\/json/)) {
        promise = rawResponse.json().then((json) => {
          const getPath = (obj, path) =>
            path.split(".").reduce((o, k) => (o != null ? o[k] : undefined), obj);
          const hasPath = (obj, path) => getPath(obj, path) !== undefined;
          let result = json;
          const listValue = getPath(json, this.agent._listResultPath);
          if (Array.isArray(listValue)) {
            result = listValue;
          } else if (this.agent._instanceResultPath !== "" && hasPath(json, this.agent._instanceResultPath)) {
            result = getPath(json, this.agent._instanceResultPath);
          } else if (this.agent._instanceResultPath === "") {
            result = json;
          }
          return result;
        });
      }
    }
    return promise;
  }
}

module.exports = BoundableResource;
