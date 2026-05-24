"use strict";

const AnnotationTarget = require("../annotations/AnnotationTarget");

/**
 * ReturnType definition. SRID not implemented.
 *
 * http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/cs01/odata-csdl-xml-v4.01-cs01.html#sec_ReturnType
 *
 * @class ReturnType
 * @extends {AnnotationTarget}
 */
class ReturnType extends AnnotationTarget {
  /**
   * Creates an instance of return type.
   * @param {Object} rawMetadata raw metadata object for a return type
   * @memberof ReturnType
   */
  constructor(rawMetadata) {
    super(rawMetadata);

    Object.defineProperty(this, "nullable", {
      get: () => rawMetadata.$.Nullable !== "false",
    });

    let maxLength = Object.prototype.hasOwnProperty.call(rawMetadata.$, "MaxLength")
      ? Number(rawMetadata.$.MaxLength)
      : undefined;
    Object.defineProperty(this, "maxLength", {
      get: () => maxLength,
    });

    let precision = Object.prototype.hasOwnProperty.call(rawMetadata.$, "Precision")
      ? Number(rawMetadata.$.Precision)
      : undefined;
    Object.defineProperty(this, "precision", {
      get: () => precision,
    });

    let scale = Object.prototype.hasOwnProperty.call(rawMetadata.$, "Scale")
      ? Number(rawMetadata.$.Scale)
      : undefined;
    Object.defineProperty(this, "scale", {
      get: () => scale,
    });

    Object.defineProperty(this, "unicode", {
      get: () => rawMetadata.$.Unicode !== "false",
    });
  }

  /**
   * Initializes schema dependent properties. Decoupled from constructor,
   * because it needs to resolve schema (type) references.
   *
   * @param {CsdlSchema} schema to resolve references
   * @memberof ReturnType
   */
  initSchemaDependentProperties(schema) {
    Object.defineProperty(this, "type", {
      get: () => schema.getType(this.raw.$.Type),
    });
  }
}

module.exports = ReturnType;
