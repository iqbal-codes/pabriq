FROM node:22-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Build-arg for UID alignment: sandcastle docker build-image
# defaults to the host user's UID so /home/agent is writable.
ARG AGENT_UID=1000

# Rename "node" to "agent" and align UID with host.
RUN usermod -u $AGENT_UID -d /home/agent -m -l agent node

# Switch to agent user so Bun installs to /home/agent/.bun
USER agent

# Install Bun (project uses bun as package manager)
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/home/agent/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

# Install OpenCode CLI
RUN bun install -g opencode-ai@latest

WORKDIR /home/agent

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at ${SANDBOX_REPO_DIR}
# and overrides the working directory to ${SANDBOX_REPO_DIR} at container start.
# Structure your Dockerfile so that ${SANDBOX_REPO_DIR} can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
