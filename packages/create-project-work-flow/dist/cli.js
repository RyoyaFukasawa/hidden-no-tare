#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { existsSync, cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, rmSync, writeFileSync, } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const FRAMEWORK_NAME = 'project-work-flow';
const MANIFEST_PATH = '.workflow/setup-manifest.json';
const PACKAGE_MANAGERS = new Set(['npm', 'pnpm']);
function fail(message) {
    throw new Error(message);
}
function parseOptions(argv) {
    let command = 'init';
    let commandSeen = false;
    let projectName;
    let packageManager;
    let install = false;
    let dryRun = false;
    let acceptExisting = false;
    for (let index = 0; index < argv.length; index++) {
        const argument = argv[index];
        if (argument === 'init' || argument === 'update') {
            if (commandSeen)
                fail('initまたはupdateは一度だけ指定してください');
            command = argument;
            commandSeen = true;
            continue;
        }
        if (argument === '--install') {
            install = true;
            continue;
        }
        if (argument === '--dry-run') {
            dryRun = true;
            continue;
        }
        if (argument === '--accept-existing') {
            acceptExisting = true;
            continue;
        }
        if (argument === '--project-name' || argument === '--package-manager') {
            const value = argv[++index];
            if (!value || value.startsWith('--'))
                fail(`${argument}には値が必要です`);
            if (argument === '--project-name')
                projectName = value;
            else {
                if (!PACKAGE_MANAGERS.has(value))
                    fail('パッケージマネージャーはnpmまたはpnpmで指定してください');
                packageManager = value;
            }
            continue;
        }
        if (argument === '--help' || argument === '-h') {
            console.log('Usage: project-work-flow [init|update] [--project-name NAME] [--package-manager npm|pnpm] [--install] [--dry-run]');
            process.exit(0);
        }
        fail(`未対応の引数です: ${argument}`);
    }
    return { command, projectName, packageManager, install, dryRun, acceptExisting };
}
function gitOutput(root, args) {
    try {
        return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    }
    catch {
        return '';
    }
}
function assertRepositoryRoot(root) {
    const top = gitOutput(root, ['rev-parse', '--show-toplevel']);
    if (!top || resolve(top) !== resolve(root))
        fail('リポジトリのルートで実行してください');
    if (!gitOutput(root, ['rev-parse', 'HEAD']))
        fail('Gitの初回コミットが必要です');
}
function statIfPresent(path) {
    try {
        return lstatSync(path);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
            return undefined;
        throw error;
    }
}
function assertNewRepository(root) {
    assertRepositoryRoot(root);
    const allowed = new Set(['.git', '.gitignore', 'README.md']);
    const entries = readdirSync(root).filter(entry => !allowed.has(entry));
    if (entries.length) {
        fail(`既存ファイルがあるため初期セットアップを停止しました（途中導入は対象外）: ${entries.join(', ')}`);
    }
    for (const entry of ['.gitignore', 'README.md']) {
        const path = join(root, entry);
        const stat = statIfPresent(path);
        if (stat && !stat.isFile()) {
            fail(`許可された既存ファイルが通常ファイルではないため停止しました: ${entry}`);
        }
    }
}
function defaultProjectName(root) {
    return relative(dirname(root), root) || root.split('/').pop() || 'project';
}
function validateProjectName(name) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name))
        fail('プロジェクト名は英数字、ドット、ハイフン、アンダースコアで指定してください');
    return name;
}
async function chooseProjectName(root, selected) {
    if (selected?.trim())
        return validateProjectName(selected.trim());
    const fallback = defaultProjectName(root);
    if (!process.stdin.isTTY)
        return validateProjectName(fallback);
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    try {
        const answer = (await readline.question(`プロジェクト名を入力してください [${fallback}]: `)).trim();
        return validateProjectName(answer || fallback);
    }
    finally {
        readline.close();
    }
}
async function choosePackageManager(root, selected) {
    if (selected)
        return selected;
    if (existsSync(join(root, 'pnpm-lock.yaml')))
        return 'pnpm';
    if (existsSync(join(root, 'package-lock.json')))
        return 'npm';
    if (!process.stdin.isTTY)
        return 'npm';
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    try {
        const answer = (await readline.question('パッケージマネージャーを選択してください (npm/pnpm) [npm]: ')).trim().toLowerCase();
        if (!answer || answer === 'npm')
            return 'npm';
        if (answer === 'pnpm')
            return 'pnpm';
        fail('パッケージマネージャーはnpmまたはpnpmで指定してください');
    }
    finally {
        readline.close();
    }
}
function bundledTemplateRoot() {
    return fileURLToPath(new URL('../templates/project/', import.meta.url));
}
function packageMetadata() {
    const path = fileURLToPath(new URL('../package.json', import.meta.url));
    try {
        const value = JSON.parse(readFileSync(path, 'utf8'));
        if (value.name !== 'create-project-work-flow' || typeof value.version !== 'string' || !value.version.trim())
            throw new Error('invalid package metadata');
        return { name: value.name, version: value.version };
    }
    catch {
        fail('CLIパッケージのpackage.jsonが不正です');
    }
}
function sourceTemplateRoot() {
    return { root: bundledTemplateRoot(), version: packageMetadata().version };
}
function collectTemplateFiles(root, directory = root) {
    const files = [];
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const path = join(directory, entry.name);
        if (entry.isDirectory())
            files.push(...collectTemplateFiles(root, path));
        else if (entry.isFile())
            files.push(relative(root, path));
        else
            fail(`テンプレートに通常ファイル以外があります: ${relative(root, path)}`);
    }
    return files;
}
function render(content, projectName, packageManager) {
    const text = content.toString('utf8')
        .replaceAll('{{PROJECT_NAME}}', projectName)
        .replaceAll('{{PACKAGE_MANAGER}}', packageManager);
    return Buffer.from(text, 'utf8');
}
function hash(content) {
    return createHash('sha256').update(content).digest('hex');
}
function readManifest(root) {
    const path = join(root, MANIFEST_PATH);
    if (!existsSync(path))
        fail('初期セットアップのマニフェストがありません');
    let value;
    try {
        value = JSON.parse(readFileSync(path, 'utf8'));
    }
    catch {
        fail('初期セットアップのマニフェストが不正です');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        fail('初期セットアップのマニフェストが不正です');
    const record = value;
    if (record.schemaVersion !== 1 || typeof record.projectName !== 'string' || typeof record.packageManager !== 'string' || !record.files || typeof record.files !== 'object') {
        fail('初期セットアップのマニフェストが不正です');
    }
    if (!PACKAGE_MANAGERS.has(record.packageManager))
        fail('マニフェストのパッケージマネージャーが不正です');
    const framework = record.framework;
    if (!framework || typeof framework !== 'object' || typeof framework.name !== 'string' || typeof framework.version !== 'string') {
        fail('マニフェストのフレームワーク情報が不正です');
    }
    return value;
}
function buildFiles(templateRoot, projectName, packageManager) {
    const files = new Map();
    for (const file of collectTemplateFiles(templateRoot)) {
        const normalized = (file === '_gitignore' ? '.gitignore' : file).replaceAll('\\', '/');
        if (isAbsolute(normalized) || normalized.split('/').includes('..'))
            fail(`テンプレートのパスが不正です: ${file}`);
        files.set(normalized, render(readFileSync(join(templateRoot, file)), projectName, packageManager));
    }
    return files;
}
function mergeExistingIgnore(root, files, acceptExisting) {
    const desired = files.get('.gitignore');
    if (!desired || !existsSync(join(root, '.gitignore')))
        return;
    const existing = readFileSync(join(root, '.gitignore'), 'utf8');
    const missing = desired.toString('utf8').split(/\r?\n/).filter(line => line && !existing.split(/\r?\n/).includes(line));
    if (!missing.length) {
        files.set('.gitignore', Buffer.from(existing, 'utf8'));
        return;
    }
    if (!acceptExisting) {
        console.error('.gitignoreへの追記が必要です。以下の差分を確認して--accept-existingを指定してください:');
        for (const line of missing)
            console.error(`+ ${line}`);
        fail('既存ファイルの変更を承認していないため停止しました');
    }
    const separator = existing.endsWith('\n') || !existing ? '' : '\n';
    files.set('.gitignore', Buffer.from(existing + separator + missing.join('\n') + '\n', 'utf8'));
}
function manifestFor(files, projectName, packageManager, frameworkVersion) {
    return {
        schemaVersion: 1,
        framework: { name: FRAMEWORK_NAME, version: frameworkVersion },
        projectName,
        packageManager,
        files: Object.fromEntries([...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => [path, hash(content)])),
    };
}
function planFiles(files, manifest) {
    const planned = new Map(files);
    planned.set(MANIFEST_PATH, Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf8'));
    return planned;
}
function validateGeneratedPlan(files) {
    const stage = mkdtempSync(join(tmpdir(), 'project-work-flow-stage-'));
    try {
        writePlan(stage, files);
        for (const required of ['AGENTS.md', '.gitignore', 'package.json', 'tsconfig.json', 'workflow.config.json', MANIFEST_PATH,
            'docs/adr/README.md', 'scripts/verify.ts', 'scripts/workflow/prepare.ts']) {
            if (!existsSync(join(stage, required)))
                fail(`生成物の検証に必要なファイルがありません: ${required}`);
        }
        const config = JSON.parse(readFileSync(join(stage, 'workflow.config.json'), 'utf8'));
        if (!Array.isArray(config.projectChecks))
            fail('生成されたworkflow.config.jsonのprojectChecksが不正です');
        const packageJson = JSON.parse(readFileSync(join(stage, 'package.json'), 'utf8'));
        if (packageJson.scripts?.verify !== 'node scripts/verify.ts' || packageJson.scripts?.['workflow:prepare'] !== 'node scripts/workflow/prepare.ts') {
            fail('生成されたpackage.jsonに検証入口がありません');
        }
        execFileSync('git', ['init', '--initial-branch=main'], { cwd: stage, stdio: 'ignore' });
        execFileSync('git', ['config', 'user.name', 'Setup validation'], { cwd: stage, stdio: 'ignore' });
        execFileSync('git', ['config', 'user.email', 'setup@example.invalid'], { cwd: stage, stdio: 'ignore' });
        execFileSync('git', ['add', '.'], { cwd: stage, stdio: 'ignore' });
        execFileSync('git', ['commit', '-m', 'validate setup'], { cwd: stage, stdio: 'ignore' });
        for (const script of ['scripts/workflow/check-contract.ts', 'scripts/adr/check.ts']) {
            const result = spawnSync(process.execPath, [script], { cwd: stage, encoding: 'utf8' });
            if (result.status !== 0)
                fail(`生成物の検証に失敗しました: ${script}\n${result.stdout}${result.stderr}`);
        }
    }
    finally {
        rmSync(stage, { recursive: true, force: true });
    }
}
function assertOwnedFilesUnchanged(root, manifest) {
    for (const [file, expected] of Object.entries(manifest.files)) {
        assertNoSymlinkAncestors(root, file);
        const path = join(root, file);
        if (!existsSync(path) || !lstatSync(path).isFile())
            fail(`所有ファイルがありません: ${file}`);
        const actual = hash(readFileSync(path));
        if (actual !== expected) {
            console.error(`変更差分: ${file}`);
            console.error(`- sha256 ${expected}`);
            console.error(`+ sha256 ${actual}`);
            fail(`利用者が変更した所有ファイルがあるため更新を停止しました: ${file}`);
        }
    }
}
function assertNoSymlinkAncestors(root, file) {
    let ancestor = root;
    for (const segment of file.split('/').slice(0, -1)) {
        ancestor = join(ancestor, segment);
        const stat = statIfPresent(ancestor);
        if (!stat)
            break;
        if (stat.isSymbolicLink())
            fail(`生成先の親ディレクトリがシンボリックリンクのため停止しました: ${file}`);
    }
}
function assertUpdatePlanHasNoCollisions(root, current, planned) {
    for (const file of planned.keys()) {
        assertNoSymlinkAncestors(root, file);
        if (file === MANIFEST_PATH || Object.hasOwn(current.files, file))
            continue;
        try {
            lstatSync(join(root, file));
            fail(`新しい所有ファイルが既存ファイルと衝突するため更新を停止しました: ${file}`);
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
                continue;
            throw error;
        }
    }
}
function snapshotRepository(root) {
    const backup = mkdtempSync(join(tmpdir(), 'project-work-flow-rollback-'));
    try {
        for (const entry of readdirSync(root)) {
            if (entry === '.git')
                continue;
            cpSync(join(root, entry), join(backup, entry), { recursive: true, force: false, errorOnExist: true });
        }
    }
    catch (error) {
        rmSync(backup, { recursive: true, force: true });
        throw error;
    }
    return {
        restore: () => {
            for (const entry of readdirSync(root)) {
                if (entry !== '.git')
                    rmSync(join(root, entry), { recursive: true, force: true });
            }
            for (const entry of readdirSync(backup)) {
                cpSync(join(backup, entry), join(root, entry), { recursive: true, force: false, errorOnExist: true });
            }
        },
        cleanup: () => rmSync(backup, { recursive: true, force: true }),
    };
}
function applyPlan(root, planned, packageManager, install) {
    const snapshot = install ? snapshotRepository(root) : undefined;
    let rollback;
    try {
        rollback = writePlan(root, planned);
        if (install)
            installDependencies(root, packageManager);
    }
    catch (error) {
        if (snapshot)
            snapshot.restore();
        else
            rollback?.();
        throw error;
    }
    finally {
        snapshot?.cleanup();
    }
}
function writePlan(root, files) {
    const backups = new Map();
    const directories = new Set();
    const removeEmptyDirectories = () => {
        let removed = true;
        while (removed) {
            removed = false;
            for (const directory of [...directories].sort((a, b) => b.length - a.length)) {
                try {
                    if (readdirSync(directory).length === 0) {
                        rmdirSync(directory);
                        removed = true;
                    }
                }
                catch { /* Preserve a directory that was populated concurrently. */ }
            }
        }
    };
    try {
        for (const [file, content] of files) {
            const path = join(root, file);
            if (isAbsolute(file) || relative(root, path).startsWith('..'))
                fail(`生成先のパスが不正です: ${file}`);
            assertNoSymlinkAncestors(root, file);
            const existing = statIfPresent(path);
            if (existing && !existing.isFile())
                fail(`生成先が通常ファイルではないため停止しました: ${file}`);
            backups.set(path, existing ? readFileSync(path) : undefined);
            let directory = dirname(path);
            const missing = [];
            while (directory !== root && !existsSync(directory)) {
                missing.push(directory);
                directory = dirname(directory);
            }
            mkdirSync(dirname(path), { recursive: true });
            for (const created of missing)
                directories.add(created);
            writeFileSync(path, content);
        }
    }
    catch (error) {
        for (const [path, backup] of backups) {
            if (backup === undefined)
                rmSync(path, { force: true });
            else
                writeFileSync(path, backup);
        }
        removeEmptyDirectories();
        throw error;
    }
    return () => {
        for (const [path, backup] of backups) {
            if (backup === undefined)
                rmSync(path, { force: true });
            else
                writeFileSync(path, backup);
        }
        removeEmptyDirectories();
    };
}
function printDryRun(command, files, packageManager, install) {
    console.log(`dry-run: ${command}で${files.size}件のファイルを生成・更新します`);
    for (const file of files.keys())
        console.log(`  ${command === 'init' ? 'create' : 'update'} ${file}`);
    if (install)
        console.log(`  run ${packageManager} install`);
}
function installDependencies(root, packageManager) {
    const result = spawnSync(packageManager, ['install'], { cwd: root, stdio: 'inherit', shell: false });
    if (result.error)
        throw result.error;
    if (result.status !== 0)
        fail(`${packageManager} installに失敗しました`);
}
async function init(root, options) {
    if (existsSync(join(root, MANIFEST_PATH))) {
        assertRepositoryRoot(root);
        const current = readManifest(root);
        assertOwnedFilesUnchanged(root, current);
        const projectName = validateProjectName(options.projectName?.trim() || current.projectName);
        const packageManager = await choosePackageManager(root, options.packageManager ?? current.packageManager);
        const source = sourceTemplateRoot();
        const expected = manifestFor(buildFiles(source.root, projectName, packageManager), projectName, packageManager, source.version);
        if (projectName !== current.projectName || packageManager !== current.packageManager
            || JSON.stringify(expected.files) !== JSON.stringify(current.files)) {
            fail('初期セットアップ済みの内容と異なるため再実行を停止しました');
        }
        if (options.dryRun)
            printDryRun('init', new Map(), packageManager, options.install);
        else
            console.log(`初期セットアップ済みです: ${projectName}`);
        return;
    }
    assertNewRepository(root);
    const projectName = await chooseProjectName(root, options.projectName);
    const packageManager = await choosePackageManager(root, options.packageManager);
    const source = sourceTemplateRoot();
    const files = buildFiles(source.root, projectName, packageManager);
    mergeExistingIgnore(root, files, options.acceptExisting);
    const manifest = manifestFor(files, projectName, packageManager, source.version);
    const planned = planFiles(files, manifest);
    validateGeneratedPlan(planned);
    if (options.dryRun) {
        printDryRun('init', planned, packageManager, options.install);
        return;
    }
    applyPlan(root, planned, packageManager, options.install);
    console.log(`初期セットアップが完了しました: ${projectName}`);
    console.log(`${packageManager} run verify と workflow:prepare を実行して確認してください。`);
}
async function update(root, options) {
    assertRepositoryRoot(root);
    const current = readManifest(root);
    assertOwnedFilesUnchanged(root, current);
    const source = sourceTemplateRoot();
    const files = buildFiles(source.root, current.projectName, current.packageManager);
    const manifest = manifestFor(files, current.projectName, current.packageManager, source.version);
    const planned = planFiles(files, manifest);
    assertUpdatePlanHasNoCollisions(root, current, planned);
    validateGeneratedPlan(planned);
    if (options.dryRun) {
        printDryRun('update', planned, current.packageManager, options.install);
        return;
    }
    applyPlan(root, planned, current.packageManager, options.install);
    console.log(`更新が完了しました: ${current.projectName}`);
}
async function main() {
    const options = parseOptions(process.argv.slice(2));
    const root = resolve(process.cwd());
    if (options.command === 'init')
        await init(root, options);
    else
        await update(root, options);
}
main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
