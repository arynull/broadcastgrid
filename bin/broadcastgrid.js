#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const VERSION = '0.1.0';

const USAGE = `broadcastgrid ${VERSION} - self-hosted social command center

Usage:
  broadcastgrid --version
  broadcastgrid --help
  broadcastgrid post add --channel NAME --text TEXT
  broadcastgrid post list [--limit N]
  broadcastgrid queue run --once

Commands:
  post add    Queue a new post for the given channel.
  post list   List posts (queued + published). --limit N caps output to N rows.
  queue run   Publish queued posts. --once publishes a single oldest post.

Options:
  --limit N   Positive integer. Defaults to listing all posts.
  --once      Publish one queued post instead of the whole queue.
  -h, --help  Show this help.
  -v, --version  Show version.

Data is stored in data.json (override with BROADCASTGRID_DATA).
`;

function dataFile() {
  return process.env.BROADCASTGRID_DATA || path.join(process.cwd(), 'data.json');
}

function fail(message, code) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(typeof code === 'number' ? code : 2);
}

function loadDb() {
  const file = dataFile();
  if (!fs.existsSync(file)) return { posts: [] };
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8').trim();
  } catch (err) {
    fail(`could not read ${file}: ${err.message}`);
  }
  if (!raw) return { posts: [] };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(`invalid JSON in ${file}: ${err.message}`);
  }
  if (!parsed || !Array.isArray(parsed.posts)) return { posts: [] };
  return parsed;
}

function saveDb(db) {
  const file = dataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2) + '\n');
}

function nextId(db) {
  let max = 0;
  for (const post of db.posts) {
    const match = /^p(\d+)$/.exec(String(post.id));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `p${max + 1}`;
}

function parseLimit(value) {
  if (!/^[1-9][0-9]*$/.test(value)) {
    fail(`--limit must be a positive integer, got "${value}"`, 2);
  }
  return Number(value);
}

function takeOption(args, index, name) {
  const arg = args[index];
  const prefix = `${name}=`;
  if (arg === name) {
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      fail(`missing value for ${name}`, 2);
    }
    return { value, next: index + 2 };
  }
  if (arg.startsWith(prefix)) {
    return { value: arg.slice(prefix.length), next: index + 1 };
  }
  return null;
}

function cmdPostAdd(args) {
  let channel;
  let text;
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    let opt = takeOption(args, i, '--channel');
    if (opt) {
      channel = opt.value;
      i = opt.next;
      continue;
    }
    opt = takeOption(args, i, '--text');
    if (opt) {
      text = opt.value;
      i = opt.next;
      continue;
    }
    fail(`unknown argument for "post add": ${arg}`, 2);
  }
  if (!channel) fail('post add requires --channel NAME', 2);
  if (text === undefined) fail('post add requires --text TEXT', 2);

  const db = loadDb();
  const post = {
    id: nextId(db),
    channel,
    text,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };
  db.posts.push(post);
  saveDb(db);
  process.stdout.write(`QUEUED ${post.id}\n`);
}

function cmdPostList(args) {
  let limit = null;
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    const opt = takeOption(args, i, '--limit');
    if (opt) {
      limit = parseLimit(opt.value);
      i = opt.next;
      continue;
    }
    fail(`unknown argument for "post list": ${arg}`, 2);
  }

  const db = loadDb();
  const posts = limit === null ? db.posts : db.posts.slice(0, limit);
  for (const post of posts) {
    process.stdout.write(
      `${post.id}\t${post.status}\t${post.channel}\t${post.text}\n`
    );
  }
}

function cmdQueueRun(args) {
  let once = false;
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--once') {
      once = true;
      i += 1;
      continue;
    }
    fail(`unknown argument for "queue run": ${arg}`, 2);
  }
  if (!once) fail('queue run requires --once', 2);

  const db = loadDb();
  const post = db.posts.find((p) => p.status === 'queued');
  if (!post) {
    process.stdout.write('QUEUE EMPTY\n');
    return;
  }
  post.status = 'published';
  post.publishedAt = new Date().toISOString();
  saveDb(db);
  process.stdout.write(`PUBLISHED ${post.id}\n`);
}

function main(argv) {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    process.stdout.write(USAGE);
    return;
  }
  if (args[0] === '--version' || args[0] === '-v') {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  const [group, action, ...rest] = args;
  if (group === 'post' && action === 'add') return cmdPostAdd(rest);
  if (group === 'post' && action === 'list') return cmdPostList(rest);
  if (group === 'queue' && action === 'run') return cmdQueueRun(rest);
  fail(`unknown command: ${args.join(' ')}`, 2);
}

main(process.argv);
