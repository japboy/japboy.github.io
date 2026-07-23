import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

import cvSchemaSource from "./cv.schema.json?raw";
import cvSource from "./cv.yaml?raw";
import type { CvData } from "./cv.js";

const schema = JSON.parse(cvSchemaSource) as object;
const candidate: unknown = parse(cvSource);
const validate = new Ajv2020({ allErrors: true, strict: true, validateFormats: false }).compile(
  schema,
);

if (!validate(candidate)) {
  const details = validate.errors
    ?.map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
    .join("; ");
  throw new TypeError(`Invalid CV data: ${details ?? "unknown schema error"}`);
}

export const cvData = candidate as CvData;
