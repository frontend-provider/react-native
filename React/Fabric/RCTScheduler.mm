/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTScheduler.h"

#import <fabric/imagemanager/ImageManager.h>
#import <fabric/uimanager/ContextContainer.h>
#import <fabric/uimanager/Scheduler.h>
#import <fabric/uimanager/SchedulerDelegate.h>
#import <React/RCTImageLoader.h>
#import <React/RCTBridge+Private.h>

#import "MainRunLoopEventBeat.h"
#import "MessageQueueEventBeat.h"
#import "RCTConversions.h"

@interface RCTBridge ()

- (std::shared_ptr<facebook::react::MessageQueueThread>)jsMessageThread;

@end

using namespace facebook::react;

class SchedulerDelegateProxy: public SchedulerDelegate {
public:
  SchedulerDelegateProxy(void *scheduler): scheduler_(scheduler) {}

  void schedulerDidFinishTransaction(Tag rootTag, const ShadowViewMutationList &mutations) override {
    RCTScheduler *scheduler = (__bridge RCTScheduler *)scheduler_;
    [scheduler.delegate schedulerDidFinishTransaction:mutations rootTag:rootTag];
  }

  void schedulerDidRequestPreliminaryViewAllocation(ComponentName componentName) override {
    RCTScheduler *scheduler = (__bridge RCTScheduler *)scheduler_;
    [scheduler.delegate schedulerDidRequestPreliminaryViewAllocationWithComponentName:RCTNSStringFromString(componentName, NSASCIIStringEncoding)];
  }

private:
  void *scheduler_;
};

@implementation RCTScheduler {
  std::shared_ptr<Scheduler> _scheduler;
  std::shared_ptr<SchedulerDelegateProxy> _delegateProxy;
}

- (instancetype)init
{
  if (self = [super init]) {
    _delegateProxy = std::make_shared<SchedulerDelegateProxy>((__bridge void *)self);

    RCTBridge *bridge = [RCTBridge currentBridge];

    SharedContextContainer contextContainer = std::make_shared<ContextContainer>();

    EventBeatFactory synchronousBeatFactory = [bridge]() {
      return std::make_unique<MainRunLoopEventBeat>(bridge.jsMessageThread);
    };

    EventBeatFactory asynchronousBeatFactory = [bridge]() {
      return std::make_unique<MessageQueueEventBeat>(bridge.jsMessageThread);
    };

    contextContainer->registerInstance<EventBeatFactory>(synchronousBeatFactory, "synchronous");
    contextContainer->registerInstance<EventBeatFactory>(asynchronousBeatFactory, "asynchronous");

    void *imageLoader = (__bridge void *)[[RCTBridge currentBridge] imageLoader];
    contextContainer->registerInstance(std::make_shared<ImageManager>(imageLoader));

    _scheduler = std::make_shared<Scheduler>(contextContainer);
    _scheduler->setDelegate(_delegateProxy.get());
  }

  return self;
}

- (void)dealloc
{
  _scheduler->setDelegate(nullptr);
}

- (void)registerRootTag:(ReactTag)tag
{
  _scheduler->registerRootTag(tag);
}

- (void)unregisterRootTag:(ReactTag)tag
{
  _scheduler->unregisterRootTag(tag);
}

- (CGSize)measureWithLayoutConstraints:(LayoutConstraints)layoutConstraints
                         layoutContext:(LayoutContext)layoutContext
                               rootTag:(ReactTag)rootTag
{
  return RCTCGSizeFromSize(_scheduler->measure(rootTag, layoutConstraints, layoutContext));
}

- (void)constraintLayoutWithLayoutConstraints:(LayoutConstraints)layoutConstraints
                                layoutContext:(LayoutContext)layoutContext
                                      rootTag:(ReactTag)rootTag
{
  _scheduler->constraintLayout(rootTag, layoutConstraints, layoutContext);
}

@end

@implementation RCTScheduler (Deprecated)

- (std::shared_ptr<FabricUIManager>)uiManager_DO_NOT_USE
{
  return _scheduler->getUIManager_DO_NOT_USE();
}

@end
