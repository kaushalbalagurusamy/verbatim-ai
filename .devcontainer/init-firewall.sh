#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 Initializing secure development environment...${NC}"

# Function to handle errors gracefully
handle_error() {
    echo -e "${RED}ERROR: $1${NC}"
    echo -e "${YELLOW}Continuing with basic firewall setup...${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verify required tools are available
for tool in iptables ipset curl jq dig; do
    if ! command_exists "$tool"; then
        echo -e "${RED}ERROR: Required tool '$tool' is not installed${NC}"
        exit 1
    fi
done

# Flush existing rules and delete existing ipsets
echo "🧹 Clearing existing firewall rules..."
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

# First allow essential traffic before any restrictions
echo "🌐 Setting up basic network rules..."
# Allow localhost
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow DNS (essential for everything)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --sport 53 -j ACCEPT

# Allow SSH (for container access)
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT

# Get host network for container communication
HOST_IP=$(ip route | grep default | cut -d" " -f3 2>/dev/null || echo "")
if [ -n "$HOST_IP" ]; then
    HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
    echo "🏠 Host network detected as: $HOST_NETWORK"
    iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
    iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT
fi

# Create ipset for allowed domains
echo "📋 Creating allowed domains list..."
ipset create allowed-domains hash:net

# Add essential domains with fallbacks
add_domain_ips() {
    local domain="$1"
    echo "🔍 Resolving $domain..."
    
    # Try to resolve with timeout
    local ips
    ips=$(timeout 10 dig +short A "$domain" 2>/dev/null | grep -E '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' || echo "")
    
    if [ -z "$ips" ]; then
        handle_error "Failed to resolve $domain"
        return 1
    fi
    
    while IFS= read -r ip; do
        if [[ "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo "✅ Adding $ip for $domain"
            ipset add allowed-domains "$ip" 2>/dev/null || true
        fi
    done <<< "$ips"
    return 0
}

# Essential domains for development
ESSENTIAL_DOMAINS=(
    "registry.npmjs.org"
    "api.anthropic.com"
    "github.com"
    "api.github.com"
)

# Add domain IPs with error handling
for domain in "${ESSENTIAL_DOMAINS[@]}"; do
    add_domain_ips "$domain" || true
done

# Try to fetch GitHub IP ranges with timeout and fallback
echo "🐙 Fetching GitHub IP ranges..."
if timeout 15 curl -s https://api.github.com/meta > /tmp/github_meta.json 2>/dev/null; then
    if jq -e '.web and .api and .git' /tmp/github_meta.json >/dev/null 2>&1; then
        echo "📊 Processing GitHub IP ranges..."
        # Process GitHub IPs with error handling
        jq -r '(.web + .api + .git)[]' /tmp/github_meta.json 2>/dev/null | while read -r cidr; do
            if [[ "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
                echo "✅ Adding GitHub range $cidr"
                ipset add allowed-domains "$cidr" 2>/dev/null || true
            fi
        done
    else
        handle_error "Invalid GitHub API response format"
    fi
else
    handle_error "Failed to fetch GitHub IP ranges"
fi

# Clean up temp files
rm -f /tmp/github_meta.json

# Set up final iptables rules
echo "🛡️ Applying firewall rules..."

# Allow established connections first
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow traffic to allowed domains
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

# Set restrictive default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

echo -e "${GREEN}🎉 Firewall configuration complete!${NC}"

# Verification with timeout
echo "🔍 Verifying firewall rules..."

# Test blocked access (should fail)
if timeout 5 curl -s https://example.com >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Warning: Firewall may not be fully restrictive${NC}"
else
    echo -e "${GREEN}✅ Firewall verification passed - external access blocked${NC}"
fi

# Test allowed access (should work)
if timeout 10 curl -s https://api.github.com/zen >/dev/null 2>&1; then
    echo -e "${GREEN}✅ GitHub API access confirmed${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: GitHub API access may be limited${NC}"
fi

echo -e "${GREEN}🔒 Secure development environment is ready!${NC}"
echo -e "${YELLOW}ℹ️  Allowed domains: GitHub, npm registry, Anthropic API${NC}"