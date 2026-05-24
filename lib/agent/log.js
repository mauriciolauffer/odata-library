"use strict";

module.exports.logResponse = function (logger, counter, requestUrl, opts, res) {
  logger.debug(
    `Response #${counter}\t${
      opts.method || "GET"
    }\t${requestUrl}\t${JSON.stringify(
      res && typeof res === "object"
        ? Object.fromEntries(
            Object.entries(res).filter(([key]) =>
              typeof key === "string" &&
              [/status/, /headers/].some((regex) => key.match(regex))
            )
          )
        : {}
    )}`
  );
};

module.exports.logRequest = function (logger, counter, requestUrl, opts) {
  logger.debug(
    `Request #${counter}\t${
      opts.method || "GET"
    }\t${requestUrl}\t${JSON.stringify(
      Object.fromEntries(Object.entries(opts).filter(([key]) => key !== "method"))
    )}`
  );
};
