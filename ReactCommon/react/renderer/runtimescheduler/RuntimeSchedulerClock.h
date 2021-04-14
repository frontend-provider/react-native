/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <chrono>

namespace facebook::react {

/*
 * Represents a monotonic clock suitable for measuring intervals.
 */
using RuntimeSchedulerClock = std::chrono::steady_clock;

} // namespace facebook::react
