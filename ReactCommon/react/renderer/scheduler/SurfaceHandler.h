/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <memory>

#include <react/renderer/core/LayoutConstraints.h>
#include <react/renderer/core/LayoutContext.h>
#include <react/renderer/core/ReactPrimitives.h>

namespace facebook {
namespace react {

class Scheduler;
class ShadowTree;
class MountingCoordinator;
class UIManager;

/*
 * Represents a running React Native surface and provides control over it.
 * The instances of this class are movable only.
 * The instances of this class can be safely deallocated only if `status` is
 * `Unregistered`; this is a way to enforce internal consistency and
 * deallocation ordering constraints the core relies on.
 *
 *
 * Even though all methods of the class are thread-safe, the consumer side must
 * ensure the logical consistency of some methods (e.g. calling `stop` for
 * non-running surface will crash).
 */
class SurfaceHandler final {
 public:
  /*
   * Represents a status of the `SurfaceHandler` instance.
   */
  enum class Status {
    /*
     * Newly created, moved-from, or already-unregistered instances. The only
     * state in which the object can be safely deallocated.
     */
    Unregistered = 0,

    /*
     * Registered instances that have an internal reference to a `UIManager`
     * instance and ready to start a surface.
     */
    Registered = 1,

    /*
     * Registered and running instances.
     */
    Running = 2,
  };

  /*
   * Defines how visual side effects (views, images, text, and so on) are
   * mounted (on not) on the screen.
   */
  enum class DisplayMode {
    /*
     * The surface is running normally. All visual side-effects will be rendered
     * on the screen.
     */
    Visible = 0,

    /*
     * The surface is `Suspended`. All new (committed after switching to the
     * mode) visual side-effects will *not* be mounted on the screen (the screen
     * will stop updating).
     *
     * The mode can be used for preparing a surface for possible future use.
     * The surface will be prepared without spending computing resources
     * on mounting, and then can be instantly mounted if needed.
     */
    Suspended = 1,

    /*
     * The surface is `Hidden`. All previously mounted visual side-effects
     * will be unmounted, and all new (committed after switching to the mode)
     * visual side-effects will *not* be mounted on the screen until the mode is
     * switched back to `normal`.
     *
     * The mode can be used for temporarily freeing computing resources of
     * off-the-screen surfaces.
     */
    Hidden = 2,
  };

  /*
   * Can be constructed anytime with a `moduleName` and a `surfaceId`.
   */
  SurfaceHandler(std::string const &moduleName, SurfaceId surfaceId) noexcept;
  ~SurfaceHandler() noexcept;

  /*
   * Movable-only.
   */
  SurfaceHandler(SurfaceHandler &&SurfaceHandler) noexcept;
  SurfaceHandler(SurfaceHandler const &SurfaceHandler) noexcept = delete;
  SurfaceHandler &operator=(SurfaceHandler &&other) noexcept;
  SurfaceHandler &operator=(SurfaceHandler const &other) noexcept = delete;

#pragma mark - Surface Life-Cycle Management

  /*
   * Returns a momentum value of the status.
   */
  Status getStatus() const noexcept;

  /*
   * Starts or stops the surface.
   * Can not be called when the status is `Unregistered`.
   * `start()` must not be called for a running surface, and `stop()` must not
   * be called for a not running surface.
   */
  void start() const noexcept;
  void stop() const noexcept;

  /*
   * Sets (and gets) the runnnig mode.
   * The running mode can be changed anytime (even for `Unregistered` surface).
   */
  void setDisplayMode(DisplayMode displayMode) const noexcept;
  DisplayMode getDisplayMode() const noexcept;

#pragma mark - Accessors

  SurfaceId getSurfaceId() const noexcept;
  void setSurfaceId(SurfaceId surfaceId) const noexcept;
  std::string getModuleName() const noexcept;

  /*
   * Provides access for surface props.
   * Props can be changed anytime (even for `Unregistered` surface).
   */
  void setProps(folly::dynamic const &props) const noexcept;
  folly::dynamic getProps() const noexcept;

  /*
   * Returns a `MountingCoordinator` instance associated with a running surface.
   * Can be not be called when the status is `Unregistered`.
   * The returning value cannot be `nullptr`.
   */
  std::shared_ptr<MountingCoordinator const> getMountingCoordinator()
      const noexcept;

#pragma mark - Layout

  /*
   * Measures the surface with given layout constraints and layout context.
   * Returns zero size if called on the stopped or unregistered surface.
   */
  Size measure(
      LayoutConstraints const &layoutConstraints,
      LayoutContext const &layoutContext) const noexcept;

  /*
   * Sets layout constraints and layout context for the surface.
   */
  void constraintLayout(
      LayoutConstraints const &layoutConstraints,
      LayoutContext const &layoutContext) const noexcept;

  /*
   * Returns layout constraints and layout context associated with the surface.
   */
  LayoutConstraints getLayoutConstraints() const noexcept;
  LayoutContext getLayoutContext() const noexcept;

 private:
  friend class Scheduler;

  /*
   * Must be called by `Scheduler` during registration process.
   */
  void setUIManager(UIManager const *uiManager) const noexcept;

  void applyDisplayMode(DisplayMode displayMode) const noexcept;

#pragma mark - Link & Parameters

  /*
   * All data members of the class are split into two groups (`Link` and
   * `Parameters`) that require separate synchronization. This way it's easier
   * to see that proper lock is acquired. Separate synchronization is needed to
   * prevent deadlocks.
   */

  /*
   * Represents parameters of the surface. Parameters can be changed
   * independently from controlling the running state
   * (registering/unregistering, starting/stopping) of the surface.
   * Changing parameters requires acquiring a unique lock; reading needs only
   * a shared lock.
   */
  struct Parameters {
    std::string moduleName{};
    SurfaceId surfaceId{};
    DisplayMode displayMode{DisplayMode::Visible};
    folly::dynamic props{};
    LayoutConstraints layoutConstraints{};
    LayoutContext layoutContext{};
  };

  /*
   * Represents an underlying link to a `ShadowTree` and an `UIMananger`.
   * Registering, unregistering, starting, and stopping the surface requires
   * acquiring a unique lock; other access needs only a shared lock.
   */
  struct Link {
    Status status{Status::Unregistered};
    UIManager const *uiManager{};
    ShadowTree const *shadowTree{};
  };

  /*
   * `link_` and `linkMutex_` pair.
   */
  mutable better::shared_mutex linkMutex_;
  mutable Link link_;

  /*
   * `parameters_` and `parametersMutex_` pair.
   */
  mutable better::shared_mutex parametersMutex_;
  mutable Parameters parameters_;
};

} // namespace react
} // namespace facebook
