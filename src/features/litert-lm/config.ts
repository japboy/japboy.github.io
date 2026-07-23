export const liteRtLmConfiguration = {
  model: {
    name: "Gemma 4 E2B IT",
    sizeInBytes: 2_008_432_640,
    url: "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm",
  },
  runtime: {
    maxNumTokens: 4_096,
    wasmUrl: "https://cdn.jsdelivr.net/npm/@litert-lm/core@0.14.0/wasm/",
  },
} as const;
