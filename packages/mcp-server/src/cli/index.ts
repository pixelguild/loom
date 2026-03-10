#!/usr/bin/env node

import path from 'node:path';
import { runInit } from './init.js';
import { runStatus } from './status.js';

const args = process.argv.slice(2);
const command = args[0];

function printUsage(): void {
  console.log(`
Usage: loom <command>

Commands:
  init      Initialize Loom in the current project
  status    Show context health for the current project

Options:
  --help    Show this help message
  --version Show version
`);
}

function printVersion(): void {
  console.log('loom 0.1.0');
}

const projectRoot = path.resolve(process.cwd());

switch (command) {
  case 'init':
    runInit(projectRoot);
    break;
  case 'status':
    runStatus(projectRoot);
    break;
  case '--help':
  case '-h':
  case undefined:
    printUsage();
    break;
  case '--version':
  case '-v':
    printVersion();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
