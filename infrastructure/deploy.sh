#!/bin/bash
# Deploy Cognito User Pool CloudFormation Stack
# Usage: ./deploy.sh [environment] [region]

set -e

# Configuration
ENVIRONMENT="${1:-dev}"
REGION="${2:-us-east-1}"
APP_NAME="CognitoMFATest"
STACK_NAME="${APP_NAME}-${ENVIRONMENT}-cognito"
TEMPLATE_FILE="cognito-user-pool.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Cognito User Pool Deployment Script            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Region:      ${YELLOW}${REGION}${NC}"
echo -e "Stack Name:  ${YELLOW}${STACK_NAME}${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Please run 'aws configure' or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    exit 1
fi

# Display current AWS identity
echo -e "${GREEN}AWS Identity:${NC}"
aws sts get-caller-identity --output table
echo ""

# Validate CloudFormation template
echo -e "${YELLOW}Validating CloudFormation template...${NC}"
aws cloudformation validate-template \
    --template-body file://${TEMPLATE_FILE} \
    --region ${REGION} > /dev/null

echo -e "${GREEN}✓ Template is valid${NC}"
echo ""

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} 2>&1 || true)

if echo "${STACK_EXISTS}" | grep -q "does not exist"; then
    ACTION="create"
    echo -e "${YELLOW}Creating new stack...${NC}"
else
    ACTION="update"
    echo -e "${YELLOW}Updating existing stack...${NC}"
fi

# Deploy/Update stack
if [ "$ACTION" == "create" ]; then
    aws cloudformation create-stack \
        --stack-name ${STACK_NAME} \
        --template-body file://${TEMPLATE_FILE} \
        --parameters \
            ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
            ParameterKey=AppName,ParameterValue=${APP_NAME} \
            ParameterKey=MfaConfiguration,ParameterValue=OPTIONAL \
        --capabilities CAPABILITY_IAM \
        --region ${REGION}

    echo -e "${YELLOW}Waiting for stack creation to complete...${NC}"
    aws cloudformation wait stack-create-complete \
        --stack-name ${STACK_NAME} \
        --region ${REGION}
else
    aws cloudformation update-stack \
        --stack-name ${STACK_NAME} \
        --template-body file://${TEMPLATE_FILE} \
        --parameters \
            ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
            ParameterKey=AppName,ParameterValue=${APP_NAME} \
            ParameterKey=MfaConfiguration,ParameterValue=OPTIONAL \
        --capabilities CAPABILITY_IAM \
        --region ${REGION} 2>&1 || {
            if echo "$?" | grep -q "No updates are to be performed"; then
                echo -e "${GREEN}No updates needed${NC}"
            else
                exit 1
            fi
        }

    echo -e "${YELLOW}Waiting for stack update to complete...${NC}"
    aws cloudformation wait stack-update-complete \
        --stack-name ${STACK_NAME} \
        --region ${REGION} 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""

# Get stack outputs
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Stack Outputs                                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs' \
    --output json)

# Parse and display outputs
USER_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
CLIENT_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
CLIENT_ID_CONF=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientIdConfidential") | .OutputValue')
DOMAIN=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolDomain") | .OutputValue')
HOSTED_UI=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="HostedUIURL") | .OutputValue')

echo -e "User Pool ID:           ${YELLOW}${USER_POOL_ID}${NC}"
echo -e "Client ID (Angular):    ${YELLOW}${CLIENT_ID}${NC}"
echo -e "Client ID (API):        ${YELLOW}${CLIENT_ID_CONF}${NC}"
echo -e "Region:                 ${YELLOW}${REGION}${NC}"
echo -e "Domain:                 ${YELLOW}${DOMAIN}${NC}"
echo ""
echo -e "Hosted UI URL:"
echo -e "${YELLOW}${HOSTED_UI}${NC}"
echo ""

# Generate configuration files
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Generating Configuration Files                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Get client secret for confidential client
CLIENT_SECRET=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id ${USER_POOL_ID} \
    --client-id ${CLIENT_ID_CONF} \
    --region ${REGION} \
    --query 'UserPoolClient.ClientSecret' \
    --output text)

# Generate appsettings.json for .NET API
cat > ../CognitoOnBase.Api/appsettings.${ENVIRONMENT}.json << EOF
{
  "Cognito": {
    "Region": "${REGION}",
    "UserPoolId": "${USER_POOL_ID}",
    "ClientId": "${CLIENT_ID}",
    "ClientSecret": null
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
EOF
echo -e "${GREEN}✓ Generated CognitoOnBase.Api/appsettings.${ENVIRONMENT}.json${NC}"

# Generate environment.ts for Angular
cat > ../cognito-mfa-app/src/environments/environment.${ENVIRONMENT}.ts << EOF
export const environment = {
  production: ${ENVIRONMENT} !== 'dev',
  apiUrl: 'http://localhost:5000/api',
  cognito: {
    region: '${REGION}',
    userPoolId: '${USER_POOL_ID}',
    clientId: '${CLIENT_ID}',
  },
};
EOF
echo -e "${GREEN}✓ Generated cognito-mfa-app/src/environments/environment.${ENVIRONMENT}.ts${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Next Steps                                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "1. Create a test user:"
echo -e "   ${YELLOW}./create-test-user.sh${NC}"
echo ""
echo "2. Update your local configuration if needed"
echo ""
echo "3. Start the API:"
echo -e "   ${YELLOW}cd ../CognitoOnBase.Api && dotnet run${NC}"
echo ""
echo "4. Start the Angular app:"
echo -e "   ${YELLOW}cd ../cognito-mfa-app && npm install && ng serve${NC}"
echo ""
