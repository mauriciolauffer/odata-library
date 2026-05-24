"use strict";

const url = require("./url");

function hasNested(obj, path) {
  if (obj === null || obj === undefined) return false;
  if (Object.prototype.hasOwnProperty.call(obj, path)) return true;
  const parts = path.split(".");
  if (parts.length === 1) return false;
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(current, part)) {
      return false;
    }
    current = current[part];
  }
  return true;
}

function getNested(obj, path, defaultValue) {
  if (obj !== null && obj !== undefined && Object.prototype.hasOwnProperty.call(obj, path)) {
    return obj[path] === undefined ? defaultValue : obj[path];
  }
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = current[part];
  }
  return current === undefined ? defaultValue : current;
}

function setNested(obj, path, value) {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Gets username from url of from parameters settings
 *
 * @param {String} urlUsername - string which could contains username
 *
 * @returns {Object} settings username snippet
 */
function parseConnectionStringUsername(urlUsername) {
  var usernameSnippet = {};

  if (typeof urlUsername === "string" && urlUsername) {
    usernameSnippet.username = urlUsername;
  } else if (typeof process.env.ODATA_USER === "string" && process.env.ODATA_USER) {
    usernameSnippet.username = process.env.ODATA_USER;
  }

  return usernameSnippet;
}

/**
 * Gets username from url of from parameters settings
 *
 * @param {String} urlPassword - string which could contains password in url
 *
 * @returns {Object} settings password snippet
 */
function parseConnectionStringPassword(urlPassword) {
  var passwordSnippet = {};

  if (typeof urlPassword === "string" && urlPassword) {
    passwordSnippet.password = urlPassword;
  } else if (
    typeof process.env.ODATA_PASSWORD === "string" &&
    process.env.ODATA_PASSWORD
  ) {
    passwordSnippet.password = process.env.ODATA_PASSWORD;
  }

  return passwordSnippet;
}

/**
 * Try to get metadata parameters from environment variable
 *
 * @returns {Object} settings parameters snippet
 */
function parseConnectionParameters() {
  var metadataParametersSnippet = {};

  if (
    typeof process.env.ODATA_PARAMETERS === "string" &&
    process.env.ODATA_PARAMETERS
  ) {
    try {
      metadataParametersSnippet.parameters = JSON.parse(
        process.env.ODATA_PARAMETERS
      );
    } catch (err) {
      throw Error("ODATA_PARAMETERS variable is not valid JSON.");
    }
  }
  return metadataParametersSnippet;
}

/**
 * Try to get metadata parameters from environment variable
 *
 * @param {String} connectionUrl - string which could contains corrently defined url
 * @param {Object} parameters - reference to parameter structure which is updated by method
 *
 * @return {Object} returns structure defining OData endpoint
 */
function parseConnectionString(connectionUrl, parameters) {
  var authSnippet = Object.assign(
    {},
    parseConnectionStringPassword(url.password(connectionUrl)),
    parseConnectionStringUsername(url.username(connectionUrl))
  );

  return Object.assign(
    parameters,
    {
      url: url.base(connectionUrl),
    },
    Object.keys(authSnippet).length
      ? {
          auth: authSnippet,
        }
      : {},
    parseConnectionParameters()
  );
}

/**
 * Try to get connection settings parameters from the passed object
 *
 * @param {Object} connectionSettings - object which should contain connection settings
 * @param {Object} parameters - reference to parameter structure which is updated by method
 */
function parseConnectionSettings(connectionSettings, parameters) {
  if (typeof connectionSettings.auth === "object" && connectionSettings.auth !== null) {
    parameters.auth = connectionSettings.auth;
  }

  if (
    connectionSettings.parameters !== null &&
    typeof connectionSettings.parameters === "object" &&
    Object.getPrototypeOf(connectionSettings.parameters) === Object.prototype
  ) {
    parameters.parameters = Object.assign(
      parameters.parameters || {},
      connectionSettings.parameters
    );
  }

  if (typeof connectionSettings.logger === "object" && connectionSettings.logger !== null) {
    parameters.logger = connectionSettings.logger;
  }

  if (typeof connectionSettings.annotationsUrl === "string") {
    parameters.annotationsUrl = connectionSettings.annotationsUrl;
  }
}

/**
 * Try to get all needed url parameters from the passed object
 *
 * @param {Object} connectionSettings - string which could contains corrently defined url
 * @param {Object} parameters - reference to parameter structure which is updated by method
 *
 * @return {Object} returns structure defining OData endpoint
 */
function parseConnectionObject(connectionSettings, parameters) {
  if (typeof connectionSettings.url !== "string") {
    throw new Error("URL is missing in connection settings.");
  }

  parseConnectionString(connectionSettings.url, parameters);
  parseConnectionSettings(connectionSettings, parameters);

  return parameters;
}

/**
 * Parse connection settings passed to the client object
 *
 * @param {String|Object} connectionSettings - url or object with url and auth settings
 *
 * @return {Object} structure used by the client to connect the server
 */
function parseSettings(connectionSettings = process.env.ODATA_URL) {
  var parameters = {
    url: null,
    strict:
      !(typeof connectionSettings.strict === "boolean") || connectionSettings.strict,
  };

  if (typeof connectionSettings === "string" && connectionSettings) {
    parameters = parseConnectionString(connectionSettings, parameters);
  } else if (typeof connectionSettings === "object" && connectionSettings !== null) {
    parameters = parseConnectionObject(
      Object.assign(
        {
          url: process.env.ODATA_URL,
        },
        connectionSettings
      ),
      parameters
    );
  } else {
    throw new Error("Invalid OData service connection settings");
  }

  parameters = parseSettings._.parseConnectionCookie(
    connectionSettings,
    parameters
  );

  parameters = parseSettings._.parseTLSDefinitions(
    parseSettings.AUTH.CERT,
    connectionSettings,
    process.env,
    parameters
  );

  parameters = parseSettings._.parseHeadersDefinitions(
    connectionSettings,
    process.env,
    parameters
  );

  return parameters;
}

parseSettings._ = {};

/**
 * Try to get authentication headers from constructor settings and environment variable
 *
 * @param {Object} connectionSettings - object which could contains corrently defined url
 * @param {Object} environmentVariables - map of environment variables
 * @param {Object} parameters - reference to parameter structure which is updated by method
 *
 * @return {Object} returns structure defining OData endpoint
 */
parseSettings._.parseHeadersDefinitions = function (
  connectionSettings,
  environmentVariables,
  parameters
) {
  const isValidHeadersSettings = parseSettings._.checkHeadersSettings(
    connectionSettings,
    environmentVariables
  );

  if (isValidHeadersSettings === false) {
    throw new Error("Invalid settings for headers authentication");
  }

  if (isValidHeadersSettings === true) {
    if (hasNested(connectionSettings, "auth.headers")) {
      setNested(parameters, "auth.headers", connectionSettings.auth.headers);
      setNested(parameters, "auth.type", "headers");
    } else if (environmentVariables.ODATA_HEADERS) {
      setNested(
        parameters,
        "auth.headers",
        JSON.parse(environmentVariables.ODATA_HEADERS)
      );
      setNested(parameters, "auth.type", "headers");
    }
  }

  return parameters;
};

/**
 * Check if authentication headers settings is correct
 *
 * @param {Object} connectionSettings - object which could contains corrently defined url
 * @param {Object} environmentVariables - map of environment variables
 *
 * @return {Object} returns structure defining OData endpoint
 */
parseSettings._.checkHeadersSettings = function (
  connectionSettings,
  environmentVariables
) {
  let check = null;

  if (hasNested(connectionSettings, "auth.headers")) {
    check = typeof connectionSettings.auth.headers === "object" && connectionSettings.auth.headers !== null;
  } else if (Object.prototype.hasOwnProperty.call(environmentVariables, "ODATA_HEADERS")) {
    try {
      check = typeof JSON.parse(environmentVariables.ODATA_HEADERS) === "object";
    } catch (err) {
      check = false;
    }
  }

  return check;
};

/**
 * Try to get cookies from environment variable
 *
 * @param {Object} connectionSettings - object which could contains corrently defined url
 * @param {Object} parameters - reference to parameter structure which is updated by method
 *
 * @return {Object} returns structure defining OData endpoint
 */
parseSettings._.parseConnectionCookie = function parseConnectionCookie(
  connectionSettings,
  parameters
) {
  let cookies;

  if (parseSettings._.checkCookieSettings(connectionSettings) === false) {
    throw new Error("Invalid authenticate cookie settings");
  }

  if (hasNested(connectionSettings, "auth.cookies")) {
    setNested(parameters, "auth.cookies", connectionSettings.auth.cookies);
    setNested(parameters, "auth.type", "cookie");
  } else if (process.env.ODATA_COOKIE) {
    try {
      cookies = JSON.parse(process.env.ODATA_COOKIE);
    } catch (err) {
      cookies = [process.env.ODATA_COOKIE];
    }
    setNested(parameters, "auth.cookies", cookies);
    setNested(parameters, "auth.type", "cookie");
  }

  return parameters;
};

/**
 * Check if cookie settings is correct
 *
 * @param {Object} connectionSettings - object which could contains corrently defined url
 *
 * @return {Object} returns structure defining OData endpoint
 */
parseSettings._.checkCookieSettings = function (connectionSettings) {
  let check = true;

  if (hasNested(connectionSettings, "auth.cookies")) {
    check =
      Array.isArray(connectionSettings.auth.cookies) &&
      connectionSettings.auth.cookies.every((cookie) => typeof cookie === "string");
  } else if (Object.prototype.hasOwnProperty.call(process.env, "ODATA_COOKIE")) {
    try {
      let cookieToCheck = JSON.parse(process.env.ODATA_COOKIE);
      check = Array.isArray(cookieToCheck);
    } catch (err) {
      check = typeof process.env.ODATA_COOKIE === "string";
    }
  }

  return check;
};

parseSettings.AUTH = {
  CERT: {
    PEM_OBJECT_KEYS: {
      ORDER: 1,
      SOURCE: "SETTINGS",
      MANDATORY_KEYS: ["auth.cert", "auth.key"],
      OPTIONAL_KEYS: ["auth.ca"],
      ADDITIONAL_KEYS: {
        "auth.type": "cert",
      },
    },
    PFX_OBJECT_KEYS: {
      ORDER: 2,
      SOURCE: "SETTINGS",
      MANDATORY_KEYS: ["auth.pfx", "auth.passphrase"],
      OPTIONAL_KEYS: ["auth.ca"],
      ADDITIONAL_KEYS: {
        "auth.type": "cert",
      },
    },
    PEM_ENVIRONMENT_KEYS: {
      ORDER: 3,
      SOURCE: "ENV",
      MANDATORY_KEYS: ["ODATA_CLIENT_CERT", "ODATA_CLIENT_KEY"],
      OPTIONAL_KEYS: ["ODATA_EXTRA_CA"],
      CONVERSION: {
        ODATA_CLIENT_CERT: "auth.cert",
        ODATA_CLIENT_KEY: "auth.key",
        ODATA_EXTRA_CA: "auth.ca",
      },
      ADDITIONAL_KEYS: {
        "auth.type": "cert",
      },
    },
    CA_OBJECT_KEYS: {
      ORDER: 4,
      SOURCE: "SETTINGS",
      MANDATORY_KEYS: ["auth.ca"],
      OPTIONAL_KEYS: [],
    },
    CA_ENVIRONMENT_KEYS: {
      ORDER: 5,
      SOURCE: "ENV",
      MANDATORY_KEYS: ["ODATA_EXTRA_CA"],
      OPTIONAL_KEYS: [],
      CONVERSION: { ODATA_EXTRA_CA: "auth.ca" },
    },
  },
};

/**
 * Determine type of template from AUTH.CERT for
 * checking and parsing TLS definitions
 *
 * @param {Array} templateDefinitions - list of templates for TLS definitionis (coming from AUTH.CERT)
 * @param {Object} connectionSettings - object which could contains corrently defined url
 * @param {Object} processEnv - map of environment variables
 *
 * @return {Object} template TLS settings
 */
parseSettings._.determineTLSDefinition = function (
  templateDefinitions,
  connectionSettings,
  processEnv
) {
  return Object.entries(templateDefinitions)
    .map(([key, def]) =>
      Object.assign(
        {
          key: key,
          source: def.SOURCE === "ENV" ? processEnv : connectionSettings,
        },
        def
      )
    )
    .sort((defA, defB) => defA.ORDER - defB.ORDER)
    .find((def) => def.MANDATORY_KEYS.some((key) => hasNested(def.source, key)));
};

/**
 * Check current TLS settings by template
 *
 * @param {Array} definition - list of templates for TLS definitionis (coming from AUTH.CERT)
 * @param {Object} connectionSettings - object which could contains corrently defined url
 * @param {Object} processEnv - map of environment variables
 * @param {Object} parameters - parsed settings
 *
 * @return {Error} error description
 */
parseSettings._.checkTLSDefinition = function (
  definition,
  connectionSettings,
  processEnv,
  parameters
) {
  let error;

  if (definition) {
    if (!(getNested(parameters, "url") || "").match(/^https/)) {
      error = new Error("Use SSL parameters with HTTPS only.");
    } else {
      const missingKeys = definition.MANDATORY_KEYS.filter(
        (mandatoryKey) => !hasNested(definition.source, mandatoryKey)
      );
      if (missingKeys.length > 0) {
        error = new Error(`Missing certificate parameter ${missingKeys[0]}.`);
      }
    }
  }

  return error;
};

/**
 * Parse TLS settings
 *
 * @param {Array} templateDefinitions - list of templates for TLS definitionis (coming from AUTH.CERT)
 * @param {Object} connectionSettings - object which could contains corrently defined url
 * @param {Object} processEnv - map of environment variables
 * @param {Object} parameters - parsed settings
 *
 * @return {Object} parameters with TLS settings
 */
parseSettings._.parseTLSDefinitions = function (
  templateDefinitions,
  connectionSettings,
  processEnv,
  parameters
) {
  const definition = parseSettings._.determineTLSDefinition(
    templateDefinitions,
    connectionSettings,
    processEnv
  );

  const err = parseSettings._.checkTLSDefinition(
    definition,
    connectionSettings,
    processEnv,
    parameters
  );

  if (err) {
    throw err;
  } else if (definition) {
    [].concat(definition.MANDATORY_KEYS, definition.OPTIONAL_KEYS)
      .filter((path) => hasNested(definition.source, path))
      .forEach((sourcePath) => {
        const destinationPath = Object.prototype.hasOwnProperty.call(definition, "CONVERSION") &&
          Object.prototype.hasOwnProperty.call(definition.CONVERSION, sourcePath)
          ? definition.CONVERSION[sourcePath]
          : sourcePath;
        setNested(
          parameters,
          destinationPath,
          getNested(definition.source, sourcePath)
        );
      });
    Object.entries(definition.ADDITIONAL_KEYS || {}).forEach(([path, value]) =>
      setNested(parameters, path, value)
    );
  }

  return parameters;
};

module.exports = parseSettings;
