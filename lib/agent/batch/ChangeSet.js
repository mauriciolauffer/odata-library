"use strict";

const Base = require("./Base");
const Request = require("./Request");
const Response = require("./Response");

class ChangeSet extends Base {
  constructor() {
    super("requests", "changeset");
    this.commited = false;
  }

  /**
   * Add new item to the batch list object
   *
   * @param {String} httpMethod name of the HTTP method
   * @param {String} inputUrl relative path in the service
   * @param {Object} headers object which contains headers used for the post request
   * @param {Object} payload data which is converted to the JSON string and passed as body of POST request
   *
   * @returns {Object} new instance of Request class
   *
   * @private
   * @memberof ChangeSet
   */
  addRequest(...args) {
    return this.add(Request, ...args);
  }

  /**
   * Generate HTTP request which is part of thh multipart/mixed content for the OData batch
   *
   * @param {String} csrfToken passed to request headers
   *
   * @returns {String} changeset converted to the string
   *
   * @private
   * @memberof ChangeSet
   */
  payload(csrfToken) {
    let boundary = `--${this.boundary()}`;
    return [].concat(
      ...[
        `Content-Type: multipart/mixed; boundary=${this.boundary()}\n`,
        boundary,
        this.requests.map((request) => request.payload(csrfToken)).join(
          `\n${boundary}\n`
        ),
        `${boundary}--`,
      ]
    ).join("\n");
  }

  /**
   * Parse response from OData response and resolve/reject promises of the particular
   * changeset requests.
   *
   * @param {String} changeSetResponse - content of the changeset from http batch request
   *
   * @returns {Promise} promise which is resolved by the particular responses inside the changeset
   *
   * @private
   * @memberof ChangeSet
   */
  process(changeSetResponse) {
    let promise;
    let promises = [];
    let insideChangeSet = false;
    let boundary;
    for (const line of changeSetResponse) {
      const match = line.match(/^Content-Type: multipart\/mixed; boundary=([^\s]+)/);
      if (match) {
        boundary = match[1];
        break;
      }
    }
    if (boundary) {
      changeSetResponse.reduce(
        (acc, row) => {
          if (row.indexOf(`--${boundary}`) > -1) {
            insideChangeSet = true;
            if (acc.length) {
              promises.push(
                this.requests[acc.length - 1].process(acc[acc.length - 1])
              );
            }
            if (row !== `--${boundary}--`) {
              acc.push([]);
            } else {
              insideChangeSet = false;
            }
          } else if (insideChangeSet) {
            acc[acc.length - 1].push(row);
          }
          return acc;
        },
        []
      );
      promise = Promise.all(promises);
    } else {
      promise = new Response(changeSetResponse).promise;
    }
    return promise;
  }

  /**
   * Mark changeset as committed
   *
   * @public
   * @memberof ChangeSet
   */
  commit() {
    this.commited = true;
  }
}

module.exports = ChangeSet;
