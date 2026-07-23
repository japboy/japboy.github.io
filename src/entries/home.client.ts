import type { Engine } from "@litert-lm/core";

import type XHello from "../components/hello.js";
import type { CareerIntroductionPresentationState } from "../components/hello.js";
import type {
  CareerIntroductionController,
  CareerIntroductionState,
} from "../features/litert-lm/career-introduction.js";

let activeCareerIntroduction: CareerIntroductionController | undefined;

const toPresentationState = (
  state: CareerIntroductionState,
): CareerIntroductionPresentationState => {
  switch (state.status) {
    case "generating":
    case "waiting":
      return { status: state.status, text: state.text };
    case "cancelled":
    case "failed":
    case "idle":
      return { status: "fallback" };
  }
};

const generateCareerIntroduction = async (
  engine: Engine,
  hello: XHello,
  Controller: typeof CareerIntroductionController,
): Promise<void> => {
  const { cvData } = await import("../data/load-cv.js");
  const controller = new Controller(engine, cvData);
  activeCareerIntroduction = controller;
  const unsubscribe = controller.subscribe((state) => {
    hello.careerIntroduction = toPresentationState(state);
  });

  try {
    await controller.start();
  } finally {
    unsubscribe();
  }
};

const initializeHome = async (): Promise<void> => {
  await import("@lit-labs/ssr-client/lit-element-hydrate-support.js");

  const [{ default: XHello }, { CareerIntroductionController, liteRtLmController }] =
    await Promise.all([import("../components/hello.js"), import("../features/litert-lm/index.js")]);
  const hello = document.querySelector("x-hello");
  let careerIntroductionGeneration: Promise<void> | undefined;

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
