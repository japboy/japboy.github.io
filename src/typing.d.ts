declare module "*.css" {
  const style: string;
  export default style;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV?: "development" | "production";
  }
}
