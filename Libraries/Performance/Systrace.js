/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

import * as Systrace from './Systrace';

const TRACE_TAG_REACT_APPS = 1 << 17; // eslint-disable-line no-bitwise

let _enabled = false;
let _asyncCookie = 0;

type EventName = string | (() => string);
type EventArgs = ?{[string]: string};

/**
 * Indicates if the application is currently being traced.
 *
 * Calling methods on this module when the application isn't being traced is
 * cheap, but this method can be used to avoid computing expensive values for
 * those functions.
 *
 * @example
 * if (Systrace.isEnabled()) {
 *   const expensiveArgs = computeExpensiveArgs();
 *   Systrace.beginEvent('myEvent', expensiveArgs);
 * }
 */
export function isEnabled(): boolean {
  return _enabled;
}

/**
 * @deprecated This function is now a no-op but it's left for backwards
 * compatibility. `isEnabled` will now synchronously check if we're actively
 * profiling or not. This is necessary because we don't have callbacks to know
 * when profiling has started/stopped on Android APIs.
 */
export function setEnabled(_doEnable: boolean): void {}

/**
 * Marks the start of a synchronous event that should end in the same stack
 * frame. The end of this event should be marked using the `endEvent` function.
 */
export function beginEvent(eventName: EventName, args?: EventArgs): void {
  if (_enabled) {
    const eventNameString =
      typeof eventName === 'function' ? eventName() : eventName;
    global.nativeTraceBeginSection(TRACE_TAG_REACT_APPS, eventNameString, args);
  }
}

/**
 * Marks the end of a synchronous event started in the same stack frame.
 */
export function endEvent(args?: EventArgs): void {
  if (_enabled) {
    global.nativeTraceEndSection(TRACE_TAG_REACT_APPS, args);
  }
}

/**
 * Marks the start of a potentially asynchronous event. The end of this event
 * should be marked calling the `endAsyncEvent` function with the cookie
 * returned by this function.
 */
export function beginAsyncEvent(
  eventName: EventName,
  args?: EventArgs,
): number {
  const cookie = _asyncCookie;
  if (_enabled) {
    _asyncCookie++;
    const eventNameString =
      typeof eventName === 'function' ? eventName() : eventName;
    global.nativeTraceBeginAsyncSection(
      TRACE_TAG_REACT_APPS,
      eventNameString,
      cookie,
      args,
    );
  }
  return cookie;
}

/**
 * Marks the end of a potentially asynchronous event, which was started with
 * the given cookie.
 */
export function endAsyncEvent(
  eventName: EventName,
  cookie: number,
  args?: EventArgs,
): void {
  if (_enabled) {
    const eventNameString =
      typeof eventName === 'function' ? eventName() : eventName;
    global.nativeTraceEndAsyncSection(
      TRACE_TAG_REACT_APPS,
      eventNameString,
      cookie,
      args,
    );
  }
}

/**
 * Registers a new value for a counter event.
 */
export function counterEvent(eventName: EventName, value: number): void {
  if (_enabled) {
    const eventNameString =
      typeof eventName === 'function' ? eventName() : eventName;
    global.nativeTraceCounter &&
      global.nativeTraceCounter(TRACE_TAG_REACT_APPS, eventNameString, value);
  }
}

if (__DEV__) {
  // The metro require polyfill can not have dependencies (true for all polyfills).
  // Ensure that `Systrace` is available in polyfill by exposing it globally.
  global[(global.__METRO_GLOBAL_PREFIX__ || '') + '__SYSTRACE'] = Systrace;
}

if (global.__RCTProfileIsProfiling) {
  _enabled = true;
}
