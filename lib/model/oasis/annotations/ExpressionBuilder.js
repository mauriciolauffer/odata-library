"use strict";

const Annotation = require("./Annotation");
const Collection = require("./Collection");
const PropertyValue = require("./PropertyValue");
const Record = require("./Record");

const constantExpressions = [
  "Binary",
  "Bool",
  "Date",
  "DateTimeOffset",
  "Decimal",
  "Duration",
  "EnumMember",
  "Float",
  "Guid",
  "Int",
  "String",
  "TimeOfDay",
];

const scalarExpressions = constantExpressions.concat([
  "AnnotationPath",
  "NavigationPropertyPath",
  "Path",
  "PropertyPath",
]);

function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function defineSingleValueProperty(element, propertyName, values) {
  if (values.length === 1) {
    Object.defineProperty(element, propertyName, {
      get: () => values[0],
    });
  }
}

function parseConstantExpression(element, propertyName, elementId) {
  let values = [element.raw.$ ? element.raw.$[propertyName] : undefined]
    .concat(element.raw[propertyName])
    .filter(Boolean);
  defineSingleValueProperty(element, lowerFirst(propertyName), values);
  if (values.length > 1) {
    throw new Error(
      `Multiple '${propertyName}' values defined for ${elementId}`
    );
  }
}

/**
 * Class for construction annotation values.
 *
 * @class ExpressionBuilder
 */
class ExpressionBuilder {
  static get scalarExpressions() {
    return scalarExpressions;
  }

  static buildAnnotation(annotationMetadata) {
    return new Annotation(annotationMetadata, ExpressionBuilder);
  }

  static buildCollection(collectionMetadata) {
    return new Collection(collectionMetadata, ExpressionBuilder);
  }

  static buildRecord(recordMetadata) {
    return new Record(recordMetadata, ExpressionBuilder);
  }

  static buildPropertyValue(propertyValueMetadata) {
    return new PropertyValue(propertyValueMetadata, ExpressionBuilder);
  }

  static assignElementValue(element, elementId) {
    scalarExpressions.forEach((p) =>
      parseConstantExpression(element, p, elementId)
    );

    let collections = (element.raw && element.raw.Collection || []).map(
      ExpressionBuilder.buildCollection
    );
    defineSingleValueProperty(element, "collection", collections);

    let records = (element.raw && element.raw.Record || []).map(
      ExpressionBuilder.buildRecord
    );
    defineSingleValueProperty(element, "record", records);

    let expressionCount =
      collections.length +
      records.length +
      scalarExpressions.filter((e) => element[lowerFirst(e)] !== undefined)
        .length;

    if (expressionCount > 1) {
      throw new Error(
        `${elementId} has multiple (${expressionCount}) value expressions.`
      );
    }
  }
}

module.exports = ExpressionBuilder;
