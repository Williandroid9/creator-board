const { app, BrowserWindow, dialog, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const HOST = "127.0.0.1";
const PORT = Number(process.env.CREATOR_BOARD_PORT || 5173);
const DIST_DIR = path.resolve(__dirname, "..", "dist");

let staticServer = null;
let mainWindow = null;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function resolveSafeFile(requestPath) {
  const cleanPath = decodeURIComponent(requestPath).split("?")[0];
  const targetPath =
    cleanPath === "/" ? path.join(DIST_DIR, "index.html") : path.resolve(DIST_DIR, `.${cleanPath}`);

  if (!targetPath.startsWith(DIST_DIR)) {
    return path.join(DIST_DIR, "index.html");
  }

  return targetPath;
}

function createStaticServer() {
  return new Promise((resolve, reject) => {
    const indexPath = path.join(DIST_DIR, "index.html");

    if (!fs.existsSync(indexPath)) {
      reject(new Error("Build nao encontrado. Rode npm run build antes de abrir o Creator Board Desktop."));
      return;
    }

    staticServer = http.createServer((request, response) => {
      const requestUrl = new URL(request.url || "/", `http://${HOST}:${PORT}`);
      let filePath = resolveSafeFile(requestUrl.pathname);

      fs.stat(filePath, (statError, stats) => {
        if (statError || !stats.isFile()) {
          filePath = indexPath;
        }

        fs.readFile(filePath, (readError, content) => {
          if (readError) {
            response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Nao foi possivel carregar o Creator Board.");
            return;
          }

          const extension = path.extname(filePath).toLowerCase();
          response.writeHead(200, {
            "Cache-Control": filePath.endsWith("index.html")
              ? "no-store"
              : "public, max-age=31536000, immutable",
            "Content-Type": mimeTypes[extension] || "application/octet-stream",
          });
          response.end(content);
        });
      });
    });

    staticServer.once("error", async (error) => {
      if (error.code === "EADDRINUSE") {
        const existingUrl = await findExistingCreatorBoard();

        if (existingUrl) {
          staticServer = null;
          resolve(existingUrl);
          return;
        }

        reject(
          new Error(
            `A porta ${PORT} ja esta em uso por outro programa. Feche esse programa ou reinicie o computador e tente novamente.`,
          ),
        );
        return;
      }

      reject(error);
    });

    staticServer.listen(PORT, HOST, () => {
      resolve(`http://${HOST}:${PORT}/`);
    });
  });
}

function findExistingCreatorBoard() {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host: HOST,
        path: "/",
        port: PORT,
        timeout: 1200,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          body += chunk;
          if (body.length > 4096) {
            request.destroy();
          }
        });

        response.on("end", () => {
          resolve(body.includes("Creator Board") ? `http://${HOST}:${PORT}/` : null);
        });
      },
    );

    request.on("error", () => resolve(null));
    request.on("timeout", () => {
      request.destroy();
      resolve(null);
    });
  });
}

function isAllowedPopup(url, appUrl) {
  try {
    const parsedUrl = new URL(url);
    const isCreatorBoard = url.startsWith(appUrl);
    const isGoogleAuth =
      parsedUrl.hostname.endsWith("google.com") ||
      parsedUrl.hostname.endsWith("googleusercontent.com") ||
      parsedUrl.hostname.endsWith("gstatic.com");

    return isCreatorBoard || isGoogleAuth;
  } catch {
    return false;
  }
}

async function createMainWindow() {
  const appUrl = await createStaticServer();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "Creator Board",
    backgroundColor: "#090d13",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedPopup(url, appUrl)) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  await mainWindow.loadURL(appUrl);
}

app.setAppUserModelId("com.creatorboard.desktop");

app.whenReady().then(() => {
  createMainWindow().catch((error) => {
    dialog.showErrorBox("Creator Board", error.message);
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow().catch((error) => {
        dialog.showErrorBox("Creator Board", error.message);
      });
    }
  });
});

app.on("before-quit", () => {
  if (staticServer) {
    staticServer.close();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
