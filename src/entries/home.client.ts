import type { Engine } from "@litert-lm/core";

import type XHello from "../components/hello.js";
import type {
  CareerIntroductionPresentationState,
  GreetingVisibilityChangeDetail,
} from "../components/hello.js";
import type {
  CareerIntroductionController,
  CareerIntroductionOutputMode,
  CareerIntroductionState,
  CareerIntroductionVisitorContext,
} from "../features/litert-lm/career-introduction.js";

import {
  LiteRtLmPageLifecycle,
  type LiteRtLmPageSession,
} from "../features/litert-lm/page-lifecycle.js";

let pagePresence: "active" | "suspended" | "disposed" = "active";
let pageLifecycle: LiteRtLmPageLifecycle | undefined;

addEventListener("pagehide", ({ persisted }: PageTransitionEvent) => {
  pagePresence = persisted ? "suspended" : "disposed";
  void pageLifecycle?.hide(persisted);
});
addEventListener("pageshow", () => {
  if (pagePresence === "disposed") return;
  pagePresence = "active";
  void pageLifecycle?.show();
});
const visitStartedAtMs = performance.now();
const preferredLanguage = navigator.languages[0] ?? navigator.language;
const reducedMotionMediaQuery = "(prefers-reduced-motion: reduce)";

const toPresentationState = (
  state: CareerIntroductionState,
  language: string,
): CareerIntroductionPresentationState => {
  switch (state.status) {
    case "generating":
    case "paused":
    case "waiting":
      return { language, status: state.status, text: state.text };
    case "cancelled":
    case "failed":
    case "idle":
      return { status: "fallback" };
  }
};

const toCareerIntroductionOutputMode = (
  prefersReducedMotion: boolean,
): CareerIntroductionOutputMode => (prefersReducedMotion ? "complete" : "streaming");

const createCareerIntroductionSession = async (
  engine: Engine,
  hello: XHello,
  Controller: typeof CareerIntroductionController,
  visitorContext: CareerIntroductionVisitorContext,
  reducedMotion: MediaQueryList,
): Promise<LiteRtLmPageSession> => {
  const { cvData } = await import("../data/load-cv.js");
  const controller = new Controller(engine, cvData, visitorContext);
  const synchronizeVisibility = ({ detail }: CustomEvent<GreetingVisibilityChangeDetail>): void => {
    if (detail.visible) {
      controller.resume();
    } else {
      controller.pause();
    }
  };

  if (!hello.greetingVisible) {
    controller.pause();
  }

  const synchronizeMotionPreference = ({ matches }: Pick<MediaQueryList, "matches">): void => {
    controller.setOutputMode(toCareerIntroductionOutputMode(matches));
  };

  synchronizeMotionPreference(reducedMotion);
  let unsubscribe: (() => void) | undefined;
  return {
    cancel: () => controller.cancel(),
    dispose: () => {
      hello.removeEventListener("greeting-visibility-change", synchronizeVisibility);
      reducedMotion.removeEventListener("change", synchronizeMotionPreference);
      unsubscribe?.();
    },
    start: async () => {
      hello.addEventListener("greeting-visibility-change", synchronizeVisibility);
      reducedMotion.addEventListener("change", synchronizeMotionPreference);
      unsubscribe = controller.subscribe((state) => {
        hello.careerIntroduction = toPresentationState(state, visitorContext.preferredLanguage);
      });
      await controller.start();
    },
  };
};

const initializeHome = async (): Promise<void> => {
  await import("@lit-labs/ssr-client/lit-element-hydrate-support.js");

  const [
    { default: XHello },
    { CareerIntroductionController, createCareerIntroductionVisitorContext, liteRtLmController },
  ] = await Promise.all([
    import("../components/hello.js"),
    import("../features/litert-lm/index.js"),
  ]);
  const hello = document.querySelector("x-hello");
  const visitorContext = createCareerIntroductionVisitorContext(
    preferredLanguage,
    visitStartedAtMs,
  );
  const reducedMotion = matchMedia(reducedMotionMediaQuery);

  if (hello instanceof XHello) {
    liteRtLmController.subscribe((state) => {
      hello.modelLoading = state.status === "loading";
    });
  }

  pageLifecycle = new LiteRtLmPageLifecycle(
    liteRtLmController,
    async (engine) => {
      if (!(hello instanceof XHello)) throw new Error("Home greeting is unavailable");
      return createCareerIntroductionSession(
        engine,
        hello,
        CareerIntroductionController,
        visitorContext,
        reducedMotion,
      );
    },
    () => {
      if (hello instanceof XHello) hello.careerIntroduction = { status: "fallback" };
    },
  );
  if (pagePresence === "active") void pageLifecycle.show();
  else void pageLifecycle.hide(pagePresence === "suspended");
};

void initializeHome();
