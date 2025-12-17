#!/bin/bash
# Create a test user in Cognito User Pool
# Usage: ./create-test-user.sh [email] [password]

set -e

# Configuration
ENVIRONMENT="${ENVIRONMENT:-dev}"
REGION="${REGION:-us-east-1}"
APP_NAME="CognitoMFATest"
STACK_NAME="${APP_NAME}-${ENVIRONMENT}-cognito"

# Default test user
EMAIL="${1:-testuser@example.com}"
PASSWORD="${2:-TestPassword123!}"
NAME="${3:-Test User}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Create Cognito Test User                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Get User Pool ID from CloudFormation
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" == "None" ]; then
    echo -e "${RED}Error: Could not find User Pool. Make sure the stack is deployed.${NC}"
    echo "Run: ./deploy.sh first"
    exit 1
fi

echo -e "User Pool ID: ${YELLOW}${USER_POOL_ID}${NC}"
echo -e "Email:        ${YELLOW}${EMAIL}${NC}"
echo ""

# Check if user already exists
USER_EXISTS=$(aws cognito-idp admin-get-user \
    --user-pool-id ${USER_POOL_ID} \
    --username ${EMAIL} \
    --region ${REGION} 2>&1 || true)

if echo "${USER_EXISTS}" | grep -q "UserNotFoundException"; then
    echo -e "${YELLOW}Creating new user...${NC}"

    # Create user
    aws cognito-idp admin-create-user \
        --user-pool-id ${USER_POOL_ID} \
        --username ${EMAIL} \
        --user-attributes \
            Name=email,Value=${EMAIL} \
            Name=email_verified,Value=true \
            Name=name,Value="${NAME}" \
        --temporary-password "${PASSWORD}" \
        --message-action SUPPRESS \
        --region ${REGION}

    echo -e "${GREEN}✓ User created with temporary password${NC}"
    echo ""

    # Set permanent password (skip FORCE_CHANGE_PASSWORD state)
    echo -e "${YELLOW}Setting permanent password...${NC}"
    aws cognito-idp admin-set-user-password \
        --user-pool-id ${USER_POOL_ID} \
        --username ${EMAIL} \
        --password "${PASSWORD}" \
        --permanent \
        --region ${REGION}

    echo -e "${GREEN}✓ Permanent password set${NC}"
else
    echo -e "${YELLOW}User already exists. Resetting password...${NC}"

    aws cognito-idp admin-set-user-password \
        --user-pool-id ${USER_POOL_ID} \
        --username ${EMAIL} \
        --password "${PASSWORD}" \
        --permanent \
        --region ${REGION}

    echo -e "${GREEN}✓ Password reset${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Test User Credentials                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Email:    ${YELLOW}${EMAIL}${NC}"
echo -e "Password: ${YELLOW}${PASSWORD}${NC}"
echo ""
echo -e "${GREEN}You can now login with these credentials.${NC}"
echo ""

# Ask if user wants to enable MFA
read -p "Do you want to setup TOTP MFA for this user? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}To setup TOTP MFA:${NC}"
    echo "1. Login to the application"
    echo "2. Go to Dashboard > Setup TOTP"
    echo "3. Scan the QR code with your authenticator app"
    echo "4. Enter the verification code"
    echo ""
    echo -e "${YELLOW}Or use the CLI to associate a software token:${NC}"
    echo ""
    echo "# First, authenticate to get an access token"
    echo "aws cognito-idp admin-initiate-auth \\"
    echo "  --user-pool-id ${USER_POOL_ID} \\"
    echo "  --client-id <CLIENT_ID> \\"
    echo "  --auth-flow ADMIN_USER_PASSWORD_AUTH \\"
    echo "  --auth-parameters USERNAME=${EMAIL},PASSWORD='${PASSWORD}' \\"
    echo "  --region ${REGION}"
fi
