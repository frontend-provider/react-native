/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

'use strict';

import type {
  Nullable,
  SchemaType,
  NativeModuleTypeAnnotation,
  NativeModuleFunctionTypeAnnotation,
} from '../../CodegenSchema';

import type {AliasResolver} from './Utils';
const {createAliasResolver, getModules} = require('./Utils');
const {unwrapNullable} = require('../../parsers/flow/modules/utils');

type FilesOutput = Map<string, string>;

const moduleTemplate = `class JSI_EXPORT ::_CODEGEN_MODULE_NAME_::CxxSpecJSI : public TurboModule {
protected:
  ::_CODEGEN_MODULE_NAME_::CxxSpecJSI(std::shared_ptr<CallInvoker> jsInvoker);

public:
::_MODULE_PROPERTIES_::

};`;

const template = `/**
 * ${'C'}opyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * ${'@'}generated by codegen project: GenerateModuleH.js
 */

#pragma once

#include <ReactCommon/TurboModule.h>

namespace facebook {
namespace react {
::_MODULES_::

} // namespace react
} // namespace facebook
`;

function translatePrimitiveJSTypeToCpp(
  nullableTypeAnnotation: Nullable<NativeModuleTypeAnnotation>,
  createErrorMessage: (typeName: string) => string,
  resolveAlias: AliasResolver,
) {
  const [typeAnnotation] = unwrapNullable<NativeModuleTypeAnnotation>(
    nullableTypeAnnotation,
  );
  let realTypeAnnotation = typeAnnotation;
  if (realTypeAnnotation.type === 'TypeAliasTypeAnnotation') {
    realTypeAnnotation = resolveAlias(realTypeAnnotation.name);
  }

  switch (realTypeAnnotation.type) {
    case 'ReservedFunctionValueTypeAnnotation':
      switch (realTypeAnnotation.name) {
        case 'RootTag':
          return 'double';
        default:
          (realTypeAnnotation.name: empty);
          throw new Error(createErrorMessage(realTypeAnnotation.name));
      }
    case 'VoidTypeAnnotation':
      return 'void';
    case 'StringTypeAnnotation':
      return 'jsi::String';
    case 'NumberTypeAnnotation':
      return 'double';
    case 'DoubleTypeAnnotation':
      return 'double';
    case 'FloatTypeAnnotation':
      return 'double';
    case 'Int32TypeAnnotation':
      return 'int';
    case 'BooleanTypeAnnotation':
      return 'bool';
    case 'GenericObjectTypeAnnotation':
      return 'jsi::Object';
    case 'ObjectTypeAnnotation':
      return 'jsi::Object';
    case 'ArrayTypeAnnotation':
      return 'jsi::Array';
    case 'FunctionTypeAnnotation':
      return 'jsi::Function';
    case 'PromiseTypeAnnotation':
      return 'jsi::Value';
    default:
      (realTypeAnnotation.type: empty);
      throw new Error(createErrorMessage(realTypeAnnotation.type));
  }
}

const propertyTemplate =
  'virtual ::_RETURN_VALUE_:: ::_PROPERTY_NAME_::(jsi::Runtime &rt::_ARGS_::) = 0;';

module.exports = {
  generate(
    libraryName: string,
    schema: SchemaType,
    moduleSpecName: string,
  ): FilesOutput {
    const nativeModules = getModules(schema);

    const modules = Object.keys(nativeModules)
      .map(codegenModuleName => {
        const {
          aliases,
          spec: {properties},
        } = nativeModules[codegenModuleName];
        const resolveAlias = createAliasResolver(aliases);

        const traversedProperties = properties
          .map(prop => {
            const [
              propTypeAnnotation,
            ] = unwrapNullable<NativeModuleFunctionTypeAnnotation>(
              prop.typeAnnotation,
            );
            const traversedArgs = propTypeAnnotation.params
              .map(param => {
                const translatedParam = translatePrimitiveJSTypeToCpp(
                  param.typeAnnotation,
                  typeName =>
                    `Unsupported type for param "${param.name}" in ${prop.name}. Found: ${typeName}`,
                  resolveAlias,
                );
                const isObject = translatedParam.startsWith('jsi::');
                return (
                  (isObject
                    ? 'const ' + translatedParam + ' &'
                    : translatedParam + ' ') + param.name
                );
              })
              .join(', ');
            return propertyTemplate
              .replace('::_PROPERTY_NAME_::', prop.name)
              .replace(
                '::_RETURN_VALUE_::',
                translatePrimitiveJSTypeToCpp(
                  propTypeAnnotation.returnTypeAnnotation,
                  typeName =>
                    `Unsupported return type for ${prop.name}. Found: ${typeName}`,
                  resolveAlias,
                ),
              )
              .replace(
                '::_ARGS_::',
                traversedArgs === '' ? '' : ', ' + traversedArgs,
              );
          })
          .join('\n');
        return moduleTemplate
          .replace(/::_MODULE_PROPERTIES_::/g, traversedProperties)
          .replace(/::_CODEGEN_MODULE_NAME_::/g, codegenModuleName)
          .replace('::_PROPERTIES_MAP_::', '');
      })
      .join('\n');

    const fileName = 'NativeModules.h';
    const replacedTemplate = template.replace(/::_MODULES_::/g, modules);

    return new Map([[fileName, replacedTemplate]]);
  },
};
