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
  FunctionTypeAnnotationParam,
  FunctionTypeAnnotationReturn,
  NativeModulePropertyShape,
  ObjectTypeAliasTypeShape,
  SchemaType,
} from '../../CodegenSchema';
const {getTypeAliasTypeAnnotation} = require('./Utils');

type FilesOutput = Map<string, string>;

const moduleTemplate = `/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE file in the root
 * directory of this source tree.
 *
 * ${'@'}generated by codegen project: GenerateModuleJavaSpec.js
 *
 * @nolint
 */

package ::_PACKAGENAME_::;

::_IMPORTS_::

public abstract class ::_CLASSNAME_:: extends ReactContextBaseJavaModule implements ReactModuleWithSpec, TurboModule {
  public ::_CLASSNAME_::(ReactApplicationContext reactContext) {
    super(reactContext);
  }

::_METHODS_::
}
`;

function translateFunctionParamToJavaType(
  param: FunctionTypeAnnotationParam,
  createErrorMessage: (typeName: string) => string,
  aliases: $ReadOnly<{[aliasName: string]: ObjectTypeAliasTypeShape, ...}>,
  imports: Set<string>,
): string {
  const {nullable, typeAnnotation} = param;

  function wrapIntoNullableIfNeeded(generatedType: string) {
    if (nullable) {
      imports.add('javax.annotation.Nullable');
      return `@Nullable ${generatedType}`;
    }
    return generatedType;
  }

  const realTypeAnnotation =
    typeAnnotation.type === 'TypeAliasTypeAnnotation'
      ? getTypeAliasTypeAnnotation(typeAnnotation.name, aliases)
      : typeAnnotation;
  switch (realTypeAnnotation.type) {
    case 'ReservedFunctionValueTypeAnnotation':
      switch (realTypeAnnotation.name) {
        case 'RootTag':
          return nullable ? 'Double' : 'double';
        default:
          (realTypeAnnotation.name: empty);
          throw new Error(createErrorMessage(realTypeAnnotation.name));
      }
    case 'StringTypeAnnotation':
      return wrapIntoNullableIfNeeded('String');
    case 'NumberTypeAnnotation':
    case 'FloatTypeAnnotation':
    case 'Int32TypeAnnotation':
      return nullable ? 'Double' : 'double';
    case 'BooleanTypeAnnotation':
      return nullable ? 'Boolean' : 'boolean';
    case 'ObjectTypeAnnotation':
      imports.add('com.facebook.react.bridge.ReadableMap');
      if (typeAnnotation.type === 'TypeAliasTypeAnnotation') {
        // No class alias for args, so it still falls under ReadableMap.
        return 'ReadableMap';
      }
      return 'ReadableMap';
    case 'GenericObjectTypeAnnotation':
      // Treat this the same as ObjectTypeAnnotation for now.
      imports.add('com.facebook.react.bridge.ReadableMap');
      return 'ReadableMap';
    case 'ArrayTypeAnnotation':
      imports.add('com.facebook.react.bridge.ReadableArray');
      return 'ReadableArray';
    case 'FunctionTypeAnnotation':
      imports.add('com.facebook.react.bridge.Callback');
      return 'Callback';
    default:
      throw new Error(createErrorMessage(realTypeAnnotation.type));
  }
}

function translateFunctionReturnTypeToJavaType(
  returnTypeAnnotation: FunctionTypeAnnotationReturn,
  createErrorMessage: (typeName: string) => string,
  imports: Set<string>,
): string {
  const {nullable} = returnTypeAnnotation;

  function wrapIntoNullableIfNeeded(generatedType: string) {
    if (nullable) {
      imports.add('javax.annotation.Nullable');
      return `@Nullable ${generatedType}`;
    }
    return generatedType;
  }

  // TODO: Support aliased return type. This doesn't exist in React Native Android yet.
  switch (returnTypeAnnotation.type) {
    case 'ReservedFunctionValueTypeAnnotation':
      switch (returnTypeAnnotation.name) {
        case 'RootTag':
          return nullable ? 'Double' : 'double';
        default:
          (returnTypeAnnotation.name: empty);
          throw new Error(createErrorMessage(returnTypeAnnotation.name));
      }
    case 'VoidTypeAnnotation':
    case 'GenericPromiseTypeAnnotation':
      return 'void';
    case 'StringTypeAnnotation':
      return wrapIntoNullableIfNeeded('String');
    case 'NumberTypeAnnotation':
    case 'FloatTypeAnnotation':
    case 'Int32TypeAnnotation':
      return nullable ? 'Double' : 'double';
    case 'BooleanTypeAnnotation':
      return nullable ? 'Boolean' : 'boolean';
    case 'ObjectTypeAnnotation':
      imports.add('com.facebook.react.bridge.WritableMap');
      return 'WritableMap';
    case 'GenericObjectTypeAnnotation':
      imports.add('com.facebook.react.bridge.WritableMap');
      return 'WritableMap';
    case 'ArrayTypeAnnotation':
      imports.add('com.facebook.react.bridge.WritableArray');
      return 'WritableArray';
    default:
      throw new Error(createErrorMessage(returnTypeAnnotation.type));
  }
}

// Build special-cased runtime check for getConstants().
function buildGetConstantsMethod(
  method: NativeModulePropertyShape,
  imports: Set<string>,
): string {
  if (
    method.typeAnnotation.returnTypeAnnotation.type === 'ObjectTypeAnnotation'
  ) {
    const requiredProps = [];
    const optionalProps = [];
    const rawProperties =
      method.typeAnnotation.returnTypeAnnotation.properties || [];
    rawProperties.forEach(p => {
      if (p.optional) {
        optionalProps.push(p.name);
      } else {
        requiredProps.push(p.name);
      }
    });
    if (requiredProps.length === 0 && optionalProps.length === 0) {
      // Nothing to validate during runtime.
      return '';
    }

    imports.add('com.facebook.react.common.build.ReactBuildConfig');
    imports.add('java.util.Arrays');
    imports.add('java.util.HashSet');
    imports.add('java.util.Map');
    imports.add('java.util.Set');
    imports.add('javax.annotation.Nullable');

    const requiredPropsFragment =
      requiredProps.length > 0
        ? `Arrays.asList(
          ${requiredProps
            .sort()
            .map(p => `"${p}"`)
            .join(',\n          ')}
      )`
        : '';
    const optionalPropsFragment =
      optionalProps.length > 0
        ? `Arrays.asList(
          ${optionalProps
            .sort()
            .map(p => `"${p}"`)
            .join(',\n          ')}
      )`
        : '';

    return `  protected abstract Map<String, Object> getTypedExportedConstants();

  @Override
  public final @Nullable Map<String, Object> getConstants() {
    Map<String, Object> constants = getTypedExportedConstants();
    if (ReactBuildConfig.DEBUG || ReactBuildConfig.IS_INTERNAL_BUILD) {
      Set<String> obligatoryFlowConstants = new HashSet<>(${requiredPropsFragment});
      Set<String> optionalFlowConstants = new HashSet<>(${optionalPropsFragment});
      Set<String> undeclaredConstants = new HashSet<>(constants.keySet());
      undeclaredConstants.removeAll(obligatoryFlowConstants);
      undeclaredConstants.removeAll(optionalFlowConstants);
      if (!undeclaredConstants.isEmpty()) {
        throw new IllegalStateException(String.format("Native Module Flow doesn't declare constants: %s", undeclaredConstants));
      }
      undeclaredConstants = obligatoryFlowConstants;
      undeclaredConstants.removeAll(constants.keySet());
      if (!undeclaredConstants.isEmpty()) {
        throw new IllegalStateException(String.format("Native Module doesn't fill in constants: %s", undeclaredConstants));
      }
    }
    return constants;
  }`;
  }

  return '';
}

module.exports = {
  generate(
    libraryName: string,
    schema: SchemaType,
    moduleSpecName: string,
  ): FilesOutput {
    const files = new Map();
    // TODO: Allow package configuration.
    const packageName = 'com.facebook.fbreact.specs.beta';
    const nativeModules = Object.keys(schema.modules)
      .map(moduleName => {
        const modules = schema.modules[moduleName].nativeModules;
        if (modules == null) {
          return null;
        }

        return modules;
      })
      .filter(Boolean)
      .reduce((acc, components) => Object.assign(acc, components), {});

    Object.keys(nativeModules).forEach(name => {
      const {aliases, properties} = nativeModules[name];
      const className = `Native${name}Spec`;

      const imports: Set<string> = new Set([
        // Always required.
        'com.facebook.react.bridge.ReactApplicationContext',
        'com.facebook.react.bridge.ReactContextBaseJavaModule',
        'com.facebook.react.bridge.ReactMethod',
        'com.facebook.react.bridge.ReactModuleWithSpec',
        'com.facebook.react.turbomodule.core.interfaces.TurboModule',
      ]);

      const methods = properties.map(method => {
        if (method.name === 'getConstants') {
          return buildGetConstantsMethod(method, imports);
        }

        // Handle return type
        const translatedReturnType = translateFunctionReturnTypeToJavaType(
          method.typeAnnotation.returnTypeAnnotation,
          typeName =>
            `Unsupported return type for method ${method.name}. Found: ${typeName}`,
          imports,
        );
        const returningPromise =
          method.typeAnnotation.returnTypeAnnotation.type ===
          'GenericPromiseTypeAnnotation';
        const isSyncMethod =
          method.typeAnnotation.returnTypeAnnotation.type !==
            'VoidTypeAnnotation' && !returningPromise;

        // Handle method args
        const traversedArgs = method.typeAnnotation.params.map(param => {
          const translatedParam = translateFunctionParamToJavaType(
            param,
            typeName =>
              `Unsupported type for param "${param.name}" in ${method.name}. Found: ${typeName}`,
            aliases,
            imports,
          );
          return `${translatedParam} ${param.name}`;
        });

        if (returningPromise) {
          // Promise return type requires an extra arg at the end.
          imports.add('com.facebook.react.bridge.Promise');
          traversedArgs.push('Promise promise');
        }

        const methodJavaAnnotation = `@ReactMethod${
          isSyncMethod ? '(isBlockingSynchronousMethod = true)' : ''
        }`;
        return `  ${methodJavaAnnotation}
  public abstract ${translatedReturnType} ${method.name}(${traversedArgs.join(
          ', ',
        )});`;
      });

      files.set(
        `${className}.java`,
        moduleTemplate
          .replace(
            /::_IMPORTS_::/g,
            Array.from(imports)
              .sort()
              .map(p => `import ${p};`)
              .join('\n'),
          )
          .replace(/::_PACKAGENAME_::/g, packageName)
          .replace(/::_CLASSNAME_::/g, className)
          .replace(/::_METHODS_::/g, methods.filter(m => !!m).join('\n\n')),
      );
    });

    return files;
  },
};
