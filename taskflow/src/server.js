const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createTaskStore } = require("./tasks");

const tasks = createTaskStore();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;

      if (size > 1024 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }

      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
}

function serveStatic(res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${requestedPath}`);

  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500);
      res.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const contentType =
      MIME_TYPES[path.extname(filePath)] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, { status: "ok", app: "TaskFlow" });
  }

  if (pathname === "/api/tasks") {
    if (req.method === "GET") {
      return sendJson(res, 200, { tasks: tasks.listTasks() });
    }

    if (req.method === "POST") {
      try {
        const body = await readJson(req);
        const task = tasks.createTask(body);
        return sendJson(res, 201, { task });
      } catch (error) {
        const status = error.message === "Request body is too large." ? 413 : 400;
        return sendJson(res, status, { error: error.message });
      }
    }
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);

  if (taskMatch) {
    const id = decodeURIComponent(taskMatch[1]);

    if (req.method === "PATCH") {
      try {
        const changes = await readJson(req);
        const task = tasks.updateTask(id, changes);

        if (!task) {
          return sendJson(res, 404, { error: "Task not found." });
        }

        return sendJson(res, 200, { task });
      } catch (error) {
        return sendJson(res, 400, { error: error.message });
      }
    }

    if (req.method === "DELETE") {
      if (!tasks.deleteTask(id)) {
        return sendJson(res, 404, { error: "Task not found." });
      }

      res.writeHead(204);
      return res.end();
    }
  }

  if (pathname.startsWith("/api/")) {
    return sendJson(res, 404, { error: "API endpoint not found." });
  }

  if (req.method !== "GET") {
    res.writeHead(405, { Allow: "GET" });
    return res.end("Method not allowed");
  }

  serveStatic(res, pathname);
});

server.listen(PORT, () => {
  console.log(`TaskFlow is running at http://localhost:${PORT}`);
});
