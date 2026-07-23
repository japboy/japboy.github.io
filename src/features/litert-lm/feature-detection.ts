export type LiteRtLmUnsupportedReason =
  | "insecure-context"
  | "webgpu-api-unavailable"
  | "webgpu-adapter-unavailable"
  | "webgpu-adapter-request-failed";

export type LiteRtLmSupport =
  | { supported: true }
  | { reason: LiteRtLmUnsupportedReason; supported: false };

export interface LiteRtLmEnvironment {
  isSecureContext: boolean;
  navigator: Navigator;
}

const browserEnvironment = (): LiteRtLmEnvironment => ({
  isSecureContext: globalThis.isSecureContext,
  navigator: globalThis.navigator,
});

export const detectLiteRtLmSupport = async (
  environment: LiteRtLmEnvironment = browserEnvironment(),
): Promise<LiteRtLmSupport> => {
  if (!environment.isSecureContext) {
    return { reason: "insecure-context", supported: false };
  }

  if (!("gpu" in environment.navigator)) {
    return { reason: "webgpu-api-unavailable", supported: false };
  }

  try {
    const adapter = await environment.navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
    });

    return adapter === null
      ? { reason: "webgpu-adapter-unavailable", supported: false }
      : { supported: true };
  } catch {
    return { reason: "webgpu-adapter-request-failed", supported: false };
  }
};
