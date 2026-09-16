import { createServer, type Server } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const packageRoot = resolve('packages/create-project-work-flow');
const repositoryRoot = resolve('.');

interface PackedPackage {
  name: string;
  version: string;
  filename: string;
  integrity: string;
  bin: Record<string, string>;
}

function packPackage(destination: string, npmCache: string): PackedPackage {
  execFileSync('npm', ['run', 'setup:build'], { cwd: repositoryRoot, stdio: 'pipe' });
  const output = execFileSync('npm', ['pack', '--json', '--pack-destination', destination], {
    cwd: packageRoot,
    encoding: 'utf8',
    env: { ...process.env, NPM_CONFIG_CACHE: npmCache },
  });
  const [packageInfo] = JSON.parse(output) as PackedPackage[];
  const packageManifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as { bin: Record<string, string> };
  assert.equal(packageInfo.name, 'create-project-work-flow');
  assert.equal(typeof packageInfo.version, 'string');
  return { ...packageInfo, bin: packageManifest.bin };
}

async function startRegistry(packageInfo: PackedPackage, tarballPath: string): Promise<{ server: Server; registry: string }> {
  const tarball = readFileSync(tarballPath);
  const metadata = JSON.stringify({
    _id: packageInfo.name,
    name: packageInfo.name,
    'dist-tags': { latest: packageInfo.version },
    versions: {
      [packageInfo.version]: {
        name: packageInfo.name,
        version: packageInfo.version,
        bin: packageInfo.bin,
        dist: {
          tarball: `http://127.0.0.1:0/${packageInfo.filename}`,
          integrity: packageInfo.integrity,
        },
      },
    },
  });
  const server = createServer((request, response) => {
    if (request.url === `/${packageInfo.name}` || request.url === `/${packageInfo.name}/`) {
      const body = metadata.replaceAll('127.0.0.1:0', `127.0.0.1:${(server.address() as { port: number }).port}`);
      response.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
      response.end(body);
      return;
    }
    if (request.url === `/${packageInfo.filename}`) {
      response.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': tarball.length });
      response.end(tarball);
      return;
    }
    response.writeHead(404);
    response.end('not found');
  });
  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolvePromise());
  });
  const port = (server.address() as { port: number }).port;
  return { server, registry: `http://127.0.0.1:${port}/` };
}

function runNpm(args: string[], cwd: string, registry: string, npmCache: string): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('npm', args, {
      cwd,
      env: {
        ...process.env,
        NPM_CONFIG_CACHE: npmCache,
        NPM_CONFIG_REGISTRY: registry,
        npm_config_registry: registry,
        npm_config_audit: 'false',
        npm_config_fund: 'false',
        npm_config_update_notifier: 'false',
        npm_config_yes: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.once('error', reject);
    child.once('close', (status) => resolvePromise({ status, stdout, stderr }));
  });
}

test('runs the fixed-version package through npm create and npm exec', async (context) => {
  if (process.env.RUN_NPM_PACKAGE_FIXTURE !== '1') {
    context.skip('set RUN_NPM_PACKAGE_FIXTURE=1 to run the local-registry package boundary fixture');
    return;
  }
  const packageDirectory = mkdtempSync(join(tmpdir(), 'project-work-flow-package-'));
  const project = mkdtempSync(join(tmpdir(), 'project-work-flow-npm-project-'));
  const npmCache = mkdtempSync(join(tmpdir(), 'project-work-flow-npm-cache-'));
  let server: Server | undefined;
  let registry = '';
  try {
    const packageInfo = packPackage(packageDirectory, npmCache);
    const tarballPath = join(packageDirectory, packageInfo.filename);
    ({ server, registry } = await startRegistry(packageInfo, tarballPath));

    execFileSync('git', ['init', '--initial-branch=main'], { cwd: project });
    execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: project });
    execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: project });
    writeFileSync(join(project, 'README.md'), '# npm fixture\n');
    execFileSync('git', ['add', 'README.md'], { cwd: project });
    execFileSync('git', ['commit', '-m', 'fixture'], { cwd: project });

    const init = await runNpm(['create', `project-work-flow@${packageInfo.version}`, '--', '--project-name', 'npm-fixture', '--package-manager', 'npm'], project, registry, npmCache);
    assert.equal(init.status, 0, init.stdout + init.stderr);
    const manifest = JSON.parse(readFileSync(join(project, '.workflow/setup-manifest.json'), 'utf8')) as { framework: { version: string } };
    assert.equal(manifest.framework.version, packageInfo.version);
    assert.ok(existsSync(join(project, 'scripts/verify.ts')));
    assert.ok(existsSync(join(project, 'scripts/workflow/prepare.ts')));

    symlinkSync(resolve('node_modules'), join(project, 'node_modules'), 'dir');
    const verify = await runNpm(['run', 'verify'], project, registry, npmCache);
    assert.equal(verify.status, 0, verify.stdout + verify.stderr);
    const prepare = await runNpm(['run', 'workflow:prepare', '--', 'npm-fixture-change', 'npm fixture change'], project, registry, npmCache);
    assert.equal(prepare.status, 0, prepare.stdout + prepare.stderr);

    const update = await runNpm(['exec', '--package', `${packageInfo.name}@${packageInfo.version}`, '--', 'project-work-flow', 'update', '--dry-run'], project, registry, npmCache);
    assert.equal(update.status, 0, update.stdout + update.stderr);
  } finally {
    if (server) await new Promise<void>((resolvePromise) => server?.close(() => resolvePromise()));
    rmSync(packageDirectory, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
    rmSync(npmCache, { recursive: true, force: true });
  }
});
