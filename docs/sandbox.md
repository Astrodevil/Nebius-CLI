# Sandboxing in the Nebius CLI

This document provides a guide to sandboxing in the Nebius CLI, including prerequisites, quickstart, and configuration.

## Prerequisites

Before using sandboxing, you need to install and set up the Nebius CLI:

```bash
npm install -g @nebius/nebius-cli
```

To verify the installation

```bash
nebius --version
```

## Overview of sandboxing

Sandboxing isolates potentially dangerous operations (such as shell commands or file modifications) from your host system, providing a security barrier between AI operations and your environment.

The benefits of sandboxing include:

- **Security**: Prevent accidental system damage or data loss.
- **Isolation**: Limit file system access to project directory.
- **Consistency**: Ensure reproducible environments across different systems.
- **Safety**: Reduce risk when working with untrusted code or experimental commands.

## Sandboxing methods

Your ideal method of sandboxing may differ depending on your platform and your preferred container solution.

### 1. macOS Seatbelt (macOS only)

Lightweight, built-in sandboxing using `sandbox-exec`.

**Default profile**: `permissive-open` - restricts writes outside project directory but allows most other operations.

### 2. Container-based (Docker/Podman)

Cross-platform sandboxing with complete process isolation.

**Note**: Requires building the sandbox image locally.
```bash
# Build sandbox locally
docker build -t nebius-sandbox .
```

## Quickstart

```bash
# Enable sandboxing with command flag
nebius -s -p "analyze the code structure"

# Use environment variable
export NEBIUS_SANDBOX=true
nebius -p "run the test suite"

# Configure in settings.json
{
  "sandbox": "docker"
}
```

## Configuration

### Enable sandboxing (in order of precedence)

1. **Command flag**: `-s` or `--sandbox`
2. **Environment variable**: `NEBIUS_SANDBOX=true|docker|podman|sandbox-exec`
3. **Settings file**: `"sandbox": true` in `settings.json`

### macOS Seatbelt profiles

Built-in profiles (set via `SEATBELT_PROFILE` env var):

- `permissive-open` (default): Write restrictions, network allowed
- `permissive-closed`: Write restrictions, no network
- `permissive-proxied`: Write restrictions, network via proxy
- `restrictive-open`: Strict restrictions, network allowed
- `restrictive-closed`: Maximum restrictions

### Custom Sandbox Flags

For container-based sandboxing, you can inject custom flags into the `docker` or `podman` command using the `SANDBOX_FLAGS` environment variable. This is useful for advanced configurations, such as disabling security features for specific use cases.

**Example (Podman)**:

To disable SELinux labeling for volume mounts, you can set the following:

```bash
export SANDBOX_FLAGS="--security-opt label=disable"
```

Multiple flags can be provided as a space-separated string:

```bash
export SANDBOX_FLAGS="--flag1 --flag2=value"
```

## Linux UID/GID handling

The sandbox automatically handles user permissions on Linux. Override these permissions with:

```bash
export SANDBOX_SET_UID_GID=true   # Force host UID/GID
export SANDBOX_SET_UID_GID=false  # Disable UID/GID mapping
```

## Troubleshooting

### Common issues

**"Operation not permitted"**

- Operation requires access outside sandbox.
- Try more permissive profile or add mount points.

**Missing commands**

- Add to custom Dockerfile.
- Install via `sandbox.bashrc`.

**Network issues**

- Check sandbox profile allows network.
- Verify proxy configuration.

### Debug mode

```bash
DEBUG=1 nebius -s -p "debug command"
```

**Note:** If you have `DEBUG=true` in a project's `.env` file, it won't affect nebius-cli due to automatic exclusion. Use `.nebius/.env` files for nebius-cli specific debug settings.

### Inspect sandbox

```bash
# Check environment
nebius -s -p "run shell command: env | grep SANDBOX"

# List mounts
nebius -s -p "run shell command: mount | grep workspace"
```

## Security notes

- Sandboxing reduces but doesn't eliminate all risks.
- Use the most restrictive profile that allows your work.
- Container overhead is minimal after first build.
- GUI applications may not work in sandboxes.

## Related documentation

- [Configuration](./cli/configuration.md): Full configuration options.
- [Commands](./cli/commands.md): Available commands.
- [Troubleshooting](./troubleshooting.md): General troubleshooting.
