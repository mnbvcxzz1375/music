#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

function runCommand(cmd, silent = false) {
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return output;
  } catch (error) {
    console.error(`Error executing: ${cmd}`);
    console.error(error.message);
    process.exit(1);
  }
}

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return pkg.version;
}

function updateVersion(newVersion) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
}

function validateVersion(version) {
  const regex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/;
  return regex.test(version);
}

function bumpVersion(type) {
  const current = getCurrentVersion();
  const parts = current.split('.');
  
  switch (type) {
    case 'major':
      parts[0] = parseInt(parts[0]) + 1;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1] = parseInt(parts[1]) + 1;
      parts[2] = 0;
      break;
    case 'patch':
      parts[2] = parseInt(parts[2]) + 1;
      break;
    default:
      console.error('Invalid version type. Use: major, minor, or patch');
      process.exit(1);
  }
  
  return parts.join('.');
}

switch (command) {
  case 'version':
    console.log(getCurrentVersion());
    break;
    
  case 'bump':
    const bumpType = args[1];
    if (!bumpType) {
      console.error('Usage: release bump <major|minor|patch>');
      process.exit(1);
    }
    const newVersion = bumpVersion(bumpType);
    updateVersion(newVersion);
    console.log(`Version bumped to ${newVersion}`);
    break;
    
  case 'set':
    const version = args[1];
    if (!version || !validateVersion(version)) {
      console.error('Usage: release set <version>');
      console.error('Version format: X.Y.Z or X.Y.Z-tag');
      process.exit(1);
    }
    updateVersion(version);
    console.log(`Version set to ${version}`);
    break;
    
  case 'tag':
    const currentVersion = getCurrentVersion();
    runCommand(`git tag -a v${currentVersion} -m "Release v${currentVersion}"`);
    console.log(`Created tag v${currentVersion}`);
    break;
    
  case 'push-tag':
    const tagVersion = getCurrentVersion();
    runCommand(`git push origin v${tagVersion}`);
    console.log(`Pushed tag v${tagVersion}`);
    break;
    
  case 'release':
    const releaseVersion = getCurrentVersion();
    console.log(`Preparing release v${releaseVersion}...`);
    
    runCommand('npm run type-check');
    runCommand('npm run lint');
    runCommand('npm test');
    runCommand('npm run build');
    
    runCommand(`git tag -a v${releaseVersion} -m "Release v${releaseVersion}"`);
    runCommand(`git push origin v${releaseVersion}`);
    
    console.log(`Release v${releaseVersion} completed!`);
    break;
    
  case 'changelog':
    const lastTag = runCommand('git describe --tags --abbrev=0', true).trim();
    const currentTag = `v${getCurrentVersion()}`;
    const changes = runCommand(`git log ${lastTag}..HEAD --oneline`, true);
    
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    let changelog = fs.readFileSync(changelogPath, 'utf8');
    
    const newEntry = `## ${currentTag}\n\n${changes.split('\n').map(c => `- ${c}`).join('\n')}\n\n`;
    
    changelog = newEntry + changelog;
    fs.writeFileSync(changelogPath, changelog);
    console.log('Changelog updated');
    break;
    
  case 'docker':
    const dockerVersion = getCurrentVersion();
    console.log(`Building Docker image v${dockerVersion}...`);
    
    runCommand(`docker build -t music-practice:v${dockerVersion} .`);
    runCommand(`docker tag music-practice:v${dockerVersion} music-practice:latest`);
    
    console.log('Docker image built successfully');
    break;
    
  case 'docker-push':
    const pushVersion = getCurrentVersion();
    const registry = args[1] || 'docker.io';
    
    console.log(`Pushing Docker image to ${registry}...`);
    
    runCommand(`docker tag music-practice:v${pushVersion} ${registry}/music-practice:v${pushVersion}`);
    runCommand(`docker tag music-practice:latest ${registry}/music-practice:latest`);
    runCommand(`docker push ${registry}/music-practice:v${pushVersion}`);
    runCommand(`docker push ${registry}/music-practice:latest`);
    
    console.log('Docker image pushed successfully');
    break;
    
  default:
    console.log('Music Practice App Release Tool');
    console.log('');
    console.log('Usage: release <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  version              Show current version');
    console.log('  bump <type>          Bump version (major/minor/patch)');
    console.log('  set <version>        Set specific version');
    console.log('  tag                  Create git tag for current version');
    console.log('  push-tag             Push current tag to remote');
    console.log('  release              Full release process');
    console.log('  changelog            Update changelog from git history');
    console.log('  docker               Build Docker image');
    console.log('  docker-push <registry> Push Docker image to registry');
    console.log('');
    console.log('Examples:');
    console.log('  release bump patch');
    console.log('  release set 1.2.0');
    console.log('  release release');
    console.log('  release docker-push docker.io/username');
    break;
}