"use strict";

/**
 * Shared code for nw/oasis ComplexType classes
 *
 * @class ComplexType
 */
class ComplexType {
  formatBody(complexTypeValue) {
    return this.properties
      .filter((entityTypeProperty) =>
        Object.prototype.hasOwnProperty.call(complexTypeValue, entityTypeProperty.name)
      )
      .reduce((acc, entityTypeProperty) => {
        acc[entityTypeProperty.name] = entityTypeProperty.type.formatBody(
          complexTypeValue[entityTypeProperty.name]
        );
        return acc;
      }, {});
  }
}

module.exports = ComplexType;
