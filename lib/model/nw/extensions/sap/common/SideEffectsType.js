"use strict";

function camelCase(s) {
  const kebab = s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return kebab.charAt(0).toLowerCase() + kebab.slice(1);
}

function definePropertyCollection(owner, property, transformer) {
  const annotation = owner.annotation;
  const collectionValue =
    annotation &&
    annotation.record &&
    annotation.record.value &&
    annotation.record.value[property] &&
    annotation.record.value[property].collection;
  let properties = (collectionValue || [])
    .map(transformer)
    .filter(Boolean);
  Object.defineProperty(owner, camelCase(property), {
    get: () => properties,
  });
}

/**
 * Envelopes Side Effects type
 *
 * https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Common.md#SideEffectsType
 *
 * @class SideEffectsType
 */
class SideEffectsType {
  /**
   * Creates an instance of SideEffectsType.
   * @param {Annotation} [annotation] side effects
   * @param {EntityType} [entityType] target entity type
   * @param {CsdlSchema} [schema] parent schema
   * @param {Object} [settings] settings for the metadata
   * @memberof SideEffectsType
   */
  constructor(annotation, entityType, schema, settings) {
    Object.defineProperty(this, "annotation", {
      get: () => annotation,
    });

    SideEffectsType._.definePropertyCollection(this, "SourceEntities", (p) =>
      p ? entityType.getNavigationProperty(p, settings.strict) : entityType
    );
    SideEffectsType._.definePropertyCollection(this, "SourceProperties", (p) =>
      entityType.getProperty(p, settings.strict)
    );
    SideEffectsType._.definePropertyCollection(this, "TargetEntities", (p) =>
      p ? entityType.getNavigationProperty(p, settings.strict) : entityType
    );
    SideEffectsType._.definePropertyCollection(
      this,
      "TargetProperties",
      (p) => {
        let propertyName;
        let navigationPropertyName;
        let foundProperty;
        let isNavigationProperty = typeof p === "string" && p.split("/").length === 2;
        let navigationObject;
        if (isNavigationProperty) {
          [navigationPropertyName, propertyName] = p.split("/");
          navigationObject = entityType.getNavigationProperty(
            navigationPropertyName,
            settings.strict
          );
          if (navigationObject) {
            foundProperty = navigationObject
              .getTarget(schema)
              .entityType.getProperty(propertyName, settings.strict);
          }
        } else {
          foundProperty = entityType.getProperty(p, settings.strict);
        }
        return foundProperty;
      }
    );
  }
}

SideEffectsType._ = {
  definePropertyCollection: definePropertyCollection,
};

module.exports = SideEffectsType;
