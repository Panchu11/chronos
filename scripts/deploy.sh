#!/bin/bash

# CHRONOS Protocol - Deployment Script
# This script builds and deploys all CHRONOS programs to Solana

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Rust
    if ! command -v rustc &> /dev/null; then
        print_error "Rust not found. Please install Rust first."
        exit 1
    fi
    print_success "Rust: $(rustc --version)"
    
    # Check Solana
    if ! command -v solana &> /dev/null; then
        print_error "Solana CLI not found. Please install Solana CLI first."
        exit 1
    fi
    print_success "Solana: $(solana --version)"
    
    # Check Anchor
    if ! command -v anchor &> /dev/null; then
        print_error "Anchor not found. Please install Anchor first."
        exit 1
    fi
    print_success "Anchor: $(anchor --version)"
    
    # Check Node
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js first."
        exit 1
    fi
    print_success "Node: $(node --version)"
    
    echo ""
}

# Get cluster
get_cluster() {
    CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
    print_info "Current cluster: $CLUSTER"
    
    if [[ $CLUSTER == *"devnet"* ]]; then
        CLUSTER_NAME="devnet"
    elif [[ $CLUSTER == *"testnet"* ]]; then
        CLUSTER_NAME="testnet"
    elif [[ $CLUSTER == *"mainnet"* ]]; then
        CLUSTER_NAME="mainnet-beta"
    else
        CLUSTER_NAME="localnet"
    fi
    
    echo ""
}

# Check balance
check_balance() {
    print_header "Checking SOL Balance"
    
    BALANCE=$(solana balance | awk '{print $1}')
    print_info "Current balance: $BALANCE SOL"
    
    # Check if balance is sufficient (at least 5 SOL for deployment)
    if (( $(echo "$BALANCE < 5" | bc -l) )); then
        print_warning "Low balance! You may need more SOL for deployment."
        
        if [[ $CLUSTER_NAME == "devnet" ]]; then
            print_info "Getting devnet SOL airdrop..."
            solana airdrop 2 || print_warning "Airdrop failed. You may need to wait or try again."
        else
            print_error "Please add more SOL to your wallet."
            exit 1
        fi
    fi
    
    echo ""
}

# Build programs
build_programs() {
    print_header "Building Programs"
    
    print_info "Cleaning previous builds..."
    anchor clean
    
    print_info "Building all programs..."
    anchor build
    
    print_success "Build complete!"
    echo ""
}

# Deploy programs
deploy_programs() {
    print_header "Deploying Programs to $CLUSTER_NAME"
    
    print_info "Deploying all programs..."
    
    if [[ $CLUSTER_NAME == "devnet" ]]; then
        anchor deploy --provider.cluster devnet
    elif [[ $CLUSTER_NAME == "testnet" ]]; then
        anchor deploy --provider.cluster testnet
    elif [[ $CLUSTER_NAME == "mainnet-beta" ]]; then
        print_warning "Deploying to MAINNET! Are you sure? (y/N)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            anchor deploy --provider.cluster mainnet-beta
        else
            print_info "Deployment cancelled."
            exit 0
        fi
    else
        anchor deploy
    fi
    
    print_success "Deployment complete!"
    echo ""
}

# Verify deployment
verify_deployment() {
    print_header "Verifying Deployment"
    
    # Extract program IDs from Anchor.toml
    VAULT_ID=$(grep "chronos_vault" Anchor.toml | awk -F'"' '{print $2}')
    DEX_ID=$(grep "chronos_dex" Anchor.toml | awk -F'"' '{print $2}')
    MARKET_ID=$(grep "chronos_market" Anchor.toml | awk -F'"' '{print $2}')
    ORCHESTRATOR_ID=$(grep "chronos_orchestrator" Anchor.toml | awk -F'"' '{print $2}')
    
    print_info "Verifying programs..."
    
    # Verify each program
    if solana program show $VAULT_ID &> /dev/null; then
        print_success "Chronos Vault: $VAULT_ID"
    else
        print_error "Chronos Vault verification failed"
    fi
    
    if solana program show $DEX_ID &> /dev/null; then
        print_success "Chronos DEX: $DEX_ID"
    else
        print_error "Chronos DEX verification failed"
    fi
    
    if solana program show $MARKET_ID &> /dev/null; then
        print_success "Chronos Market: $MARKET_ID"
    else
        print_error "Chronos Market verification failed"
    fi
    
    if solana program show $ORCHESTRATOR_ID &> /dev/null; then
        print_success "Chronos Orchestrator: $ORCHESTRATOR_ID"
    else
        print_error "Chronos Orchestrator verification failed"
    fi
    
    echo ""
}

# Save deployment info
save_deployment_info() {
    print_header "Saving Deployment Info"
    
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    
    cat > deployment-info.json << EOF
{
  "timestamp": "$TIMESTAMP",
  "cluster": "$CLUSTER_NAME",
  "programs": {
    "chronos_vault": "$VAULT_ID",
    "chronos_dex": "$DEX_ID",
    "chronos_market": "$MARKET_ID",
    "chronos_orchestrator": "$ORCHESTRATOR_ID"
  },
  "deployer": "$(solana address)"
}
EOF
    
    print_success "Deployment info saved to deployment-info.json"
    echo ""
}

# Main execution
main() {
    print_header "CHRONOS Protocol Deployment"
    echo ""
    
    check_prerequisites
    get_cluster
    check_balance
    build_programs
    deploy_programs
    verify_deployment
    save_deployment_info
    
    print_header "Deployment Complete! 🎉"
    print_success "All programs deployed successfully to $CLUSTER_NAME"
    print_info "Check deployment-info.json for program IDs"
    echo ""
}

# Run main function
main

