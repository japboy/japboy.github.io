import { dependencies } from "../../../package.json";

export const liteRtLmConfiguration = {
  model: {
    name: "Gemma 4 E2B IT",
    sizeInBytes: 2_008_432_640,
    url: "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/b3ca0d2f076785a8f4b2219ddbd2bdb99954eae1/gemma-4-E2B-it-web.litertlm",
  },
  runtime: {
    maxNumTokens: 4_096,
    wasmUrl: `https://cdn.jsdelivr.net/npm/@litert-lm/core@${dependencies["@litert-lm/core"]}/wasm/`,
  },
} as const;
