import {
  makeHtmlAttributes,
  RollupHtmlOptions,
  RollupHtmlTemplateOptions,
} from "@rollup/plugin-html";

const defaultTemplate = ({
  attributes,
  files,
  meta,
  publicPath,
  title,
}: RollupHtmlTemplateOptions) => {
  const scripts = (files.js || [])
    .map(({ fileName }) => {
      const attrs = makeHtmlAttributes(attributes.script);
      return `<script src="${publicPath}${fileName}"${attrs} async></script>`;
    })
    .join("\n");

  const links = (files.css || [])
    .map(({ fileName }) => {
      const attrs = makeHtmlAttributes(attributes.link);
      return `<link href="${publicPath}${fileName}" rel="stylesheet"${attrs}>`;
    })
    .join("\n");

  const metas = meta
    .map((input) => {
      const attrs = makeHtmlAttributes(input);
      return `<meta${attrs}>`;
    })
    .join("\n");

  return `<!doctype html>
<html${makeHtmlAttributes(attributes.html)}>
<head>
${metas}
<title>${title}</title>
${links}
<script src="https://kit.fontawesome.com/1afa8c3d69.js" crossorigin="anonymous" async></script>
${scripts}
</head>
<body>
<noscript>JavaScript richness has taken over the world wide web. Isn't that right.</noscript>
</body>
</html>`;
};

export default {
  attributes: {
    html: {
      lang: "en",
    },
  },
  meta: [
    { charset: "utf-8" },
    {
      name: "viewport",
      content:
        "width=device-width, minimum-scale=1, initial-scale=1, user-scalable=yes",
    },
    { description: "Portfolio about Yu Inao" },
  ],
  template: defaultTemplate,
  title: "Yu Inao",
} as RollupHtmlOptions;
