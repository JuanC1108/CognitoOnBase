#!/bin/bash
# Delete Cognito User Pool CloudFormation Stack
# Usage: ./destroy.sh [environment] [region]

set -e

# Configuration
ENVIRONMENT="${1:-dev}"
REGION="${2:-us-east-1}"
APP_NAME="CognitoMFATest"
STACK_NAME="${APP_NAME}-${ENVIRONMENT}-cognito"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   Delete Cognito User Pool Stack                 ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Region:      ${YELLOW}${REGION}${NC}"
echo -e "Stack Name:  ${YELLOW}${STACK_NAME}${NC}"
echo ""
echo -e "${RED}WARNING: This will delete all users and data in the User Pool!${NC}"
echo ""

read -p "Are you sure you want to delete this stack? (yes/no) " -r
echo ""

if [[ ! $REPLY == "yes" ]]; then
    echo "Cancelled."
    exit 0
fi

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} 2>&1 || true)

if echo "${STACK_EXISTS}" | grep -q "does not exist"; then
    echo -e "${YELLOW}Stack does not exist.${NC}"
    exit 0
fi

echo -e "${YELLOW}Deleting stack...${NC}"

# Delete domain first (required before deleting user pool)
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text 2>/dev/null || true)

if [ ! -z "$USER_POOL_ID" ] && [ "$USER_POOL_ID" != "None" ]; then
    DOMAIN="${APP_NAME}-${ENVIRONMENT}-$(aws sts get-caller-identity --query Account --output text)"
    aws cognito-idp delete-user-pool-domain \
        --domain ${DOMAIN,,} \
        --user-pool-id ${USER_POOL_ID} \
        --region ${REGION} 2>/dev/null || true
fi

# Delete stack
aws cloudformation delete-stack \
    --stack-name ${STACK_NAME} \
    --region ${REGION}

echo -e "${YELLOW}Waiting for stack deletion to complete...${NC}"
aws cloudformation wait stack-delete-complete \
    --stack-name ${STACK_NAME} \
    --region ${REGION}

echo ""
echo -e "${GREEN}✓ Stack deleted successfully${NC}"
