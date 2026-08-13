import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const isWindows = process.platform === "win32";
const rootDir = process.cwd();
const serverDir = path.join(rootDir, "server");
const webDir = path.join(rootDir, "web");
const venvDir = path.join(serverDir, "venv");
const venvPython = isWindows
  ? path.join(venvDir, "Scripts", "python.exe")
  : path.join(venvDir, "bin", "python");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: isWindows && command === "bun",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: isWindows && command === "bun",
    ...options,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

function findSystemPython() {
  const candidates = [];
  if (process.env.PYTHON) {
    candidates.push({ command: process.env.PYTHON, args: [] });
  }
  if (isWindows) {
    candidates.push({ command: "python", args: [] }, { command: "py", args: ["-3"] });
  } else {
    candidates.push({ command: "python3", args: [] }, { command: "python", args: [] });
  }

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.args, "--version"], {
      stdio: "ignore",
      shell: false,
    });
    if (result.status === 0) {
      return candidate;
    }
  }

  fail("Python 3.10+ was not found. Install Python or set PYTHON to its executable path.");
}

function runSystemPython(args, options = {}) {
  const python = findSystemPython();
  run(python.command, [...python.args, ...args], { shell: false, ...options });
}

function setupEnv() {
  const target = path.join(serverDir, ".env.local");
  if (existsSync(target)) {
    return;
  }

  copyFileSync(path.join(serverDir, ".env.example"), target);
  console.log("Created server/.env.local. Add Agora credentials before running the app.");
}

function setupDeps() {
  if (existsSync(path.join(rootDir, "node_modules"))) {
    return;
  }

  console.log("Installing workspace dependencies...");
  run("bun", ["install"]);
}

function setupBackend({ reset = false, quiet = false } = {}) {
  if (reset && existsSync(venvDir)) {
    rmSync(venvDir, { recursive: true, force: true });
  }
  if (!existsSync(venvPython)) {
    mkdirSync(serverDir, { recursive: true });
    runSystemPython(["-m", "venv", venvDir]);
  }

  run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], { shell: false });
  const pipArgs = ["-m", "pip", "install"];
  if (quiet) {
    pipArgs.push("-q");
  }
  pipArgs.push("-r", path.join(serverDir, "requirements.txt"));
  run(venvPython, pipArgs, {
    shell: false,
    env: { ...process.env, PIP_INDEX_URL: process.env.PIP_INDEX_URL || "https://pypi.org/simple" },
  });
}

function setupDone() {
  console.log("");
  console.log("Setup complete! Next steps:");
  console.log("   1. Run: agora project env write server/.env.local");
  console.log("   2. Run: bun run dev");
  console.log("");
}

function devBackend() {
  setupBackend({ quiet: true });
  start(venvPython, [path.join(serverDir, "src", "server.py")], { shell: false });
}

function devFrontend() {
  start("bun", ["run", "dev"], {
    cwd: webDir,
    env: { ...process.env, AGENT_BACKEND_URL: "http://localhost:8000" },
  });
}

function envFileHasValue(filePath, key) {
  if (!existsSync(filePath)) {
    return false;
  }
  const pattern = new RegExp(`^${key}=.+$`, "m");
  return pattern.test(readFileSync(filePath, "utf8"));
}

function doctor() {
  console.log("Checking shared repo prerequisites...");
  run("bun", ["--version"]);
  if (!existsSync(path.join(rootDir, "node_modules"))) {
    fail("- root node_modules missing; run bun install");
  }
  console.log("- bun available");
  console.log("- workspace dependencies installed");
}

function doctorLocal() {
  doctor();
  findSystemPython();
  console.log("- python available");

  const envPath = path.join(serverDir, ".env.local");
  if (!existsSync(envPath)) {
    fail("- missing server/.env.local");
  }
  console.log("- server/.env.local present");

  for (const key of ["AGORA_APP_ID", "AGORA_APP_CERTIFICATE"]) {
    if (!envFileHasValue(envPath, key)) {
      fail(`- ${key} missing in server/.env.local`);
    }
    console.log(`- ${key} configured`);
  }
}

function verifyBackend() {
  const python = existsSync(venvPython)
    ? { command: venvPython, args: [] }
    : findSystemPython();
  run(python.command, [
    ...python.args,
    "-m",
    "py_compile",
    path.join(serverDir, "src", "server.py"),
    path.join(serverDir, "src", "agent.py"),
  ], { shell: false });
}

function clean(paths) {
  for (const target of paths) {
    rmSync(path.join(rootDir, target), { recursive: true, force: true });
  }
}

const command = process.argv[2];

switch (command) {
  case "setup:env":
    setupEnv();
    break;
  case "setup:deps":
    setupDeps();
    break;
  case "setup:backend":
    setupBackend({ reset: true });
    break;
  case "setup:done":
    setupDone();
    break;
  case "dev:backend":
    devBackend();
    break;
  case "dev:frontend":
    devFrontend();
    break;
  case "doctor":
    doctor();
    break;
  case "doctor:local":
    doctorLocal();
    break;
  case "verify:backend":
    verifyBackend();
    break;
  case "clean:backend":
    clean(["server/venv", "server/__pycache__", "server/src/__pycache__"]);
    break;
  case "clean:frontend":
    clean(["node_modules", "web/node_modules", "web/.next", "web/dist"]);
    break;
  default:
    fail(`Unknown script command: ${command || "(missing)"}`);
}
