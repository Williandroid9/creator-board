const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = process.cwd();
const srcRoot = path.join(root, "src");
const distRoot = path.join(root, "dist");
const assetsRoot = path.join(distRoot, "assets");

fs.mkdirSync(assetsRoot, { recursive: true });

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }

    return /\.[tj]sx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [full] : [];
  });
}

function moduleId(file) {
  return `/${path.relative(root, file).replace(/\\/g, "/")}`;
}

function escapeScript(value) {
  return value.replace(/<\/script/gi, "<\\/script");
}

const modules = {};
for (const file of walk(srcRoot)) {
  const source = fs.readFileSync(file, "utf8").replace(/import\.meta\.env\.PROD/g, "true");
  const transpiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      target: ts.ScriptTarget.ES2019,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      isolatedModules: true,
    },
  }).outputText;

  modules[moduleId(file)] = transpiled;
}

const moduleDefs = Object.entries(modules)
  .map(([id, code]) => `modules[${JSON.stringify(id)}] = function(require, exports, module) {\n${code}\n};`)
  .join("\n");

const appBundle = `(function(){
const modules = {};
${moduleDefs}
const cache = {};
function normalizePath(input) {
  const parts = input.split("/");
  const out = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return "/" + out.join("/");
}
function resolve(request, parent) {
  if (request === "react" || request === "react-dom/client" || request === "react/jsx-runtime") return request;
  if (request.endsWith(".css")) return request;
  if (request[0] === ".") {
    const base = parent.slice(0, parent.lastIndexOf("/"));
    const resolved = normalizePath(base + "/" + request);
    const candidates = [resolved, resolved + ".tsx", resolved + ".ts", resolved + ".jsx", resolved + ".js", resolved + "/index.tsx", resolved + "/index.ts"];
    for (const candidate of candidates) {
      if (modules[candidate]) return candidate;
    }
  }
  return request;
}
function jsx(type, props, key) {
  const nextProps = props ? Object.assign({}, props) : {};
  if (key !== undefined) nextProps.key = key;
  return React.createElement(type, nextProps);
}
function requireModule(id, parent) {
  const resolved = resolve(id, parent || "/src/main.tsx");
  if (resolved === "react") return Object.assign({ __esModule: true, default: React }, React);
  if (resolved === "react-dom/client") return { __esModule: true, default: ReactDOM, createRoot: ReactDOM.createRoot };
  if (resolved === "react/jsx-runtime") return { __esModule: true, Fragment: React.Fragment, jsx, jsxs: jsx };
  if (resolved.endsWith(".css")) return {};
  if (!modules[resolved]) throw new Error("Modulo nao encontrado: " + id + " de " + parent);
  if (cache[resolved]) return cache[resolved].exports;
  const module = { exports: {} };
  cache[resolved] = module;
  modules[resolved]((request) => requireModule(request, resolved), module.exports, module);
  return module.exports;
}
requireModule("/src/main.tsx", "/src/main.tsx");
})();`;

const react = fs.readFileSync(path.join(root, "node_modules/react/umd/react.production.min.js"), "utf8");
const reactDom = fs.readFileSync(path.join(root, "node_modules/react-dom/umd/react-dom.production.min.js"), "utf8");
const css = fs.readFileSync(path.join(assetsRoot, "creator-board.css"), "utf8");

const globalErrorHandler = `window.addEventListener("error",function(event){var root=document.getElementById("root");if(root){root.innerHTML='<main class="grid min-h-screen place-items-center px-4 py-8"><section class="clean-panel max-w-2xl rounded-3xl p-6 text-center shadow-soft"><p class="mb-2 text-xs font-black uppercase text-aqua">Creator Board</p><h1 class="text-2xl font-black text-white">Erro ao abrir o painel</h1><p class="mt-4 text-sm leading-6 text-slate-300">'+String(event.message||"Erro desconhecido")+"</p></section></main>";}});window.addEventListener("unhandledrejection",function(event){var root=document.getElementById("root");var reason=event.reason&&event.reason.message?event.reason.message:event.reason;if(root){root.innerHTML='<main class="grid min-h-screen place-items-center px-4 py-8"><section class="clean-panel max-w-2xl rounded-3xl p-6 text-center shadow-soft"><p class="mb-2 text-xs font-black uppercase text-aqua">Creator Board</p><h1 class="text-2xl font-black text-white">Erro ao abrir o painel</h1><p class="mt-4 text-sm leading-6 text-slate-300">'+String(reason||"Erro desconhecido")+"</p></section></main>";}});`;

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#090d13" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/logo-creator-board.webp" type="image/webp" />
    <title>Creator Board - Produtividade para YouTube</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"><main class="grid min-h-screen place-items-center px-4 py-8"><section class="clean-panel rounded-3xl p-6 text-center"><p class="text-sm font-bold text-slate-300">Carregando Creator Board...</p></section></main></div>
    <script>${escapeScript(globalErrorHandler)}</script>
    <script>${escapeScript(react)}</script>
    <script>${escapeScript(reactDom)}</script>
    <script>${escapeScript(appBundle)}</script>
  </body>
</html>
`;

fs.writeFileSync(path.join(distRoot, "index.html"), html, "utf8");
fs.writeFileSync(path.join(distRoot, "creator-board.html"), html, "utf8");
fs.writeFileSync(path.join(assetsRoot, "creator-board.bundle.js"), `${react}\n${reactDom}\n${appBundle}`, "utf8");

console.log(`Standalone gerado em ${path.join(distRoot, "index.html")} (${Buffer.byteLength(html)} bytes).`);
