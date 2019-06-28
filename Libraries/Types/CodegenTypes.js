/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict';

import type {SyntheticEvent} from './CoreEventTypes';

// Event types
// We're not using the PaperName, it is only used to codegen view config settings
export type BubblingEvent<
  T,
  PaperName: string | empty = empty, // eslint-disable-line no-unused-vars
> = SyntheticEvent<T>;
export type DirectEvent<
  T,
  PaperName: string | empty = empty, // eslint-disable-line no-unused-vars
> = SyntheticEvent<T>;

// Prop types
export type Float = number;
export type Int32 = number;

type DefaultTypes = number | boolean | string | $ReadOnlyArray<string>;
// Default handling, ignore the unused value
// we're only using it for type checking
//
// TODO: (rickhanlonii) T44881457 If a default is provided, it should always be optional
//  but that is currently not supported in the codegen since we require a default
//
// eslint-disable-next-line no-unused-vars
export type WithDefault<Type: DefaultTypes, Value: ?Type | string> = Type;
