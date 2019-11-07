/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <mutex>
#include <unordered_set>

#include <fb/fbjni.h>
#include <react/core/EventBeat.h>
#include <react/utils/RuntimeExecutor.h>

namespace facebook {
namespace react {

class EventBeatManager : public jni::HybridClass<EventBeatManager> {
 public:
  constexpr static const char* const kJavaDescriptor =
      "Lcom/facebook/react/fabric/events/EventBeatManager;";

  static void registerNatives();

  void setRuntimeExecutor(RuntimeExecutor runtimeExecutor);

  void registerEventBeat(EventBeat* eventBeat) const;

  void unregisterEventBeat(EventBeat* eventBeat) const;

  EventBeatManager(jni::alias_ref<EventBeatManager::jhybriddata> jhybridobject);

 private:
  /*
   * Called by Java counterpart at the end of every run loop tick.
   */
  void tick();

  RuntimeExecutor runtimeExecutor_;

  jni::alias_ref<EventBeatManager::jhybriddata> jhybridobject_;

  mutable std::unordered_set<const EventBeat*>
      registeredEventBeats_{}; // Protected by `mutex_`

  mutable std::mutex mutex_;

  static jni::local_ref<EventBeatManager::jhybriddata> initHybrid(
      jni::alias_ref<EventBeatManager::jhybriddata> jhybridobject);
};

} // namespace react
} // namespace facebook
