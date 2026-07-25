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

let activeCareerIntroduction: CareerIntroductionController | undefined;
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

const generateCareerIntroduction = async (
  engine: Engine,
  hello: XHello,
  Controller: typeof CareerIntroductionController,
  visitorContext: CareerIntroductionVisitorContext,
  reducedMotion: MediaQueryList,
): Promise<void> => {
  const { cvData } = await import("../data/load-cv.js");
  const controller = new Controller(engine, cvData, visitorContext);
  activeCareerIntroduction = controller;
  const synchronizeVisibility = ({ detail }: CustomEvent<GreetingVisibilityChangeDetail>): void => {
    if (detail.visible) {
      controller.resume();
    } else {
      controller.pause();
    }
  };

  hello.addEventListener("greeting-visibility-change", synchronizeVisibility);

  if (!hello.greetingVisible) {
    controller.pause();
  }

  const synchronizeMotionPreference = ({ matches }: Pick<MediaQueryList, "matches">): void => {
    controller.setOutputMode(toCareerIntroductionOutputMode(matches));
  };

  synchronizeMotionPreference(reducedMotion);
  reducedMotion.addEventListener("change", synchronizeMotionPreference);
  const unsubscribe = controller.subscribe((state) => {
    hello.careerIntroduction = toPresentationState(state, visitorContext.preferredLanguage);
  });

  try {
    await controller.start();
  } finally {
    hello.removeEventListener("greeting-visibility-change", synchronizeVisibility);
    reducedMotion.removeEventListener("change", synchronizeMotionPreference);
    unsubscribe();
  }
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
  let careerIntroductionGeneration: Promise<void> | undefined;
  const visitorContext = createCareerIntroductionVisitorContext(
    preferredLanguage,
    visitStartedAtMs,
  );
  const reducedMotion = matchMedia(reducedMotionMediaQuery);

  if (hello instanceof XHello) {
    liteRtLmController.subscribe((state) => {
      hello.modelLoading = state.status === "loading";

      if (state.status === "ready") {
        const engine = liteRtLmController.engine;

        if (engine === undefined) {
          throw new Error("LiteRT-LM reached ready state without an engine");
        }

        careerIntroductionGeneration ??= generateCareerIntroduction(
          engine,
          hello,
          CareerIntroductionController,
          visitorContext,
          reducedMotion,
        );
        void careerIntroductionGeneration.catch(() => {
          hello.careerIntroduction = { status: "fallback" };
        });
      }
    });
  }

  void liteRtLmController.initialize();
};

void initializeHome();

addEventListener(
  "pagehide",
  () => {
    activeCareerIntroduction?.cancel();
  },
  { once: true },
);
