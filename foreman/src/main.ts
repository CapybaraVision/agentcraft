// Foreman entry point: `npm run start -- --backend sim|claude|codex [--repo <path>] [--speed N] ...`
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTeam } from './agents/teams.js';
import { SimBackend } from './agents/sim/index.js';
import { currentSimGoal } from './agents/sim/scenario.js';
import { FOREMAN_VERSION, helpText, loadConfig, type Config } from './config.js';
import { t } from './locale.js';
import { consoleLogger } from './context.js';
import { Foreman } from './foreman.js';
import { ForemanServer } from './server.js';
import { claimRunFiles, homeRunFile, liveOwner, profileRunFile, releaseRunFiles } from './runfile.js';
import { isInsideOrEqual } from './util/fsx.js';

async function createDemoRepo(cfg: Config, dir: string): Promise<void> {
  const mod = (await import(pathToFileURL(path.join(cfg.projectRoot, 'sandbox', 'create-demo.mjs')).href)) as {
    createDemo: (o: { dir: string; force?: boolean; quiet?: boolean }) => { dir: string; head: string };
  };
  mod.createDemo({ dir, force: true, quiet: true });
}

function wipeProfile(cfg: Config): void {
  // only ever delete inside the configured home
  if (!isInsideOrEqual(cfg.dataDir, cfg.home) || path.resolve(cfg.dataDir) === path.resolve(cfg.home)) {
    throw new Error(t('refuse_wipe', { dir: cfg.dataDir }));
  }
  fs.rmSync(cfg.dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

export async function main(argv: string[]): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(helpText(argv));
    return;
  }
  const cfg = loadConfig(argv);
  const log = consoleLogger('foreman', { debug: cfg.debug, quiet: cfg.quiet });

  // one Foreman per profile (two would both write its state.json) - checked before --reset wipes it
  const owner = await liveOwner(profileRunFile(cfg.dataDir));
  if (owner) {
    log.error(t('profile_in_use', { profile: cfg.profile, pid: owner.pid, host: owner.host, port: owner.port }));
    process.exitCode = 1;
    return;
  }

  if (cfg.reset) {
    log.info(t('reset_wiping', { dir: cfg.dataDir }));
    wipeProfile(cfg);
  }
  const fresh = !fs.existsSync(path.join(cfg.dataDir, 'state.json'));

  // sim: default to a fresh copy of the demo repo the scenario knows how to edit
  // (one per profile, so e.g. a live `sim` run and a `showcase` hold never share a repo)
  if (cfg.backend === 'sim' && cfg.repos.length === 0) {
    const demo = path.join(cfg.projectRoot, 'sandbox', cfg.profile === 'sim' ? 'sim-demo' : `sim-demo-${cfg.profile}`);
    if (fresh || !fs.existsSync(demo)) {
      log.info(t('sim_demo', { dir: demo }));
      await createDemoRepo(cfg, demo);
    }
    cfg.repos.push(demo);
  }

  const foreman = new Foreman({ config: cfg, logger: log });
  const backend = cfg.backend === 'sim' ? new SimBackend(foreman, cfg.sim) : createTeam(foreman, cfg);
  const server = new ForemanServer(foreman, { host: cfg.host, port: cfg.port, allowBrowserOrigins: cfg.allowBrowserOrigins, validateOutbound: cfg.debug, log });

  try {
    await server.start();
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'EADDRINUSE') {
      log.error(t('port_in_use', { port: cfg.port, runfile: homeRunFile(cfg.home) }));
    } else log.error(t('listen_fail', { host: cfg.host, port: cfg.port, message: (e as Error).message }));
    await foreman.close();
    process.exitCode = 1;
    return;
  }

  await claimRunFiles(cfg.home, cfg.dataDir, { pid: process.pid, port: server.port, host: cfg.host, backend: cfg.backend, profile: cfg.profile, version: FOREMAN_VERSION, startedAt: new Date().toISOString() });

  log.info(t('banner', { version: FOREMAN_VERSION, backend: cfg.backend, host: cfg.host, port: server.port, dir: cfg.dataDir }));

  let shuttingDown = false;
  const shutdown = async (sig: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(t('shutdown', { sig }));
    const force = setTimeout(() => process.exit(0), 8000);
    force.unref();
    await server.stop();
    await foreman.close();
    await releaseRunFiles(cfg.home, cfg.dataDir).catch(() => undefined);
    clearTimeout(force);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGBREAK', () => void shutdown('SIGBREAK'));
  // stdin "q" + Enter also quits cleanly (handy on Windows where signals to children are awkward)
  if (process.stdin.isTTY) {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (d: string) => {
      if (d.trim() === 'q') void shutdown('quit');
    });
  }
  process.on('uncaughtException', (e) => log.error(t('uncaught', { detail: e.stack ?? String(e) })));
  process.on('unhandledRejection', (e) => log.error(t('unhandled', { detail: (e as Error)?.stack ?? String(e) })));

  await foreman.start(backend);
  if (backend instanceof SimBackend && (cfg.autostart || cfg.goal)) {
    await backend.autostart(cfg.goal ?? currentSimGoal());
  } else if (cfg.goal) {
    await foreman.submitGoal(cfg.goal).catch((e) => log.error(t('goal_fail', { message: (e as Error).message })));
  }
}

main(process.argv.slice(2)).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
