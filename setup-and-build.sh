#!/bin/bash
# One-command setup and build script for WSL
# Usage: ./setup-and-build.sh

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🚀 CHRONOS Protocol - WSL Setup & Build Script        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in WSL
if ! grep -qi microsoft /proc/version; then
    echo -e "${RED}❌ This script must be run in WSL${NC}"
    echo "Please open Ubuntu from the Start menu and run this script there."
    exit 1
fi

echo -e "${GREEN}✅ Running in WSL${NC}"
echo ""

# Navigate to project directory
PROJECT_DIR="/mnt/c/Users/panchu/Desktop/raiku"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"
echo -e "${GREEN}✅ Found project at: $(pwd)${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Install Rust
echo -e "${BLUE}📦 Checking Rust...${NC}"
if ! command_exists cargo; then
    echo -e "${YELLOW}Installing Rust...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo -e "${GREEN}✅ Rust installed: $(rustc --version)${NC}"
else
    echo -e "${GREEN}✅ Rust already installed: $(rustc --version)${NC}"
fi
echo ""

# Install Solana
echo -e "${BLUE}📦 Checking Solana...${NC}"
if ! command_exists solana; then
    echo -e "${YELLOW}Installing Solana CLI v1.18.22...${NC}"
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    echo -e "${GREEN}✅ Solana installed: $(solana --version)${NC}"
else
    echo -e "${GREEN}✅ Solana already installed: $(solana --version)${NC}"
fi
echo ""

# Install Anchor
echo -e "${BLUE}📦 Checking Anchor...${NC}"
if ! command_exists anchor; then
    echo -e "${YELLOW}Installing Anchor CLI v0.30.1...${NC}"
    echo -e "${YELLOW}This may take 10-15 minutes...${NC}"
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    export PATH="$HOME/.cargo/bin:$PATH"
    avm install 0.30.1
    avm use 0.30.1
    echo -e "${GREEN}✅ Anchor installed: $(anchor --version)${NC}"
else
    ANCHOR_VERSION=$(anchor --version | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
    if [ "$ANCHOR_VERSION" != "0.30.1" ]; then
        echo -e "${YELLOW}⚠️  Anchor version is $ANCHOR_VERSION, switching to 0.30.1...${NC}"
        avm install 0.30.1 2>/dev/null || true
        avm use 0.30.1
    fi
    echo -e "${GREEN}✅ Anchor ready: $(anchor --version)${NC}"
fi
echo ""

# Update PATH in bashrc if not already there
if ! grep -q "solana/install/active_release/bin" ~/.bashrc; then
    echo -e "${YELLOW}Adding Solana to PATH in ~/.bashrc...${NC}"
    echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
fi

if ! grep -q ".cargo/bin" ~/.bashrc; then
    echo -e "${YELLOW}Adding Cargo to PATH in ~/.bashrc...${NC}"
    echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
fi

# Clean previous build
echo -e "${BLUE}🧹 Cleaning previous build artifacts...${NC}"
rm -rf target
echo -e "${GREEN}✅ Clean complete${NC}"
echo ""

# Build
echo -e "${BLUE}🔨 Building all programs...${NC}"
echo -e "${YELLOW}This will take 3-5 minutes...${NC}"
echo ""

if anchor build; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ BUILD SUCCESSFUL! 🎉                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${BLUE}📁 Build Artifacts:${NC}"
    echo ""
    
    if [ -d "target/deploy" ]; then
        echo -e "${GREEN}Compiled Programs (.so files):${NC}"
        ls -lh target/deploy/*.so 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
        echo ""
    fi
    
    if [ -d "target/idl" ]; then
        echo -e "${GREEN}IDL Files (.json):${NC}"
        ls -lh target/idl/*.json 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
        echo ""
    fi
    
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo ""
    echo "  1. Deploy to devnet:"
    echo -e "     ${YELLOW}anchor deploy --provider.cluster devnet${NC}"
    echo ""
    echo "  2. Run tests:"
    echo -e "     ${YELLOW}anchor test${NC}"
    echo ""
    echo "  3. Update your frontend with the deployed program IDs"
    echo ""
    echo -e "${GREEN}🎉 Your CHRONOS Protocol is ready to deploy!${NC}"
    
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                ❌ BUILD FAILED                             ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Please check the error messages above.${NC}"
    echo ""
    echo -e "${BLUE}Common fixes:${NC}"
    echo "  1. Clean and retry: rm -rf target && anchor build"
    echo "  2. Update Anchor: avm install 0.30.1 && avm use 0.30.1"
    echo "  3. Check Rust version: rustc --version"
    echo ""
    exit 1
fi

