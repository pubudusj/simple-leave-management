SES_FROM_EMAIL=pubudusj@gmail.com
PROFILE=personal

build:
	npm install
	cd ./lambda/CreateLeave && npm install
	cd ./frontend && npm install

deploy: deploy_api build_frontend deploy_frontend

deploy_api:
	SES_IDENTITY=${SES_FROM_EMAIL} cdk deploy CreateLeaveApiStack --profile=${PROFILE} --require-approval=never --outputs-file stack-output.json

build_frontend:
	echo "VUE_APP_API_BASE_URL=$(shell cat stack-output.json | jq '.CreateLeaveApiStack.CreateLeaveLambdaApiUrl')" > frontend/.env
	cd ./frontend/ && npm run build --production

deploy_frontend:
	SES_IDENTITY=${SES_FROM_EMAIL} cdk deploy CreateLeaveFrontendStack  --profile=${PROFILE} --require-approval=never

destroy:
	cdk destroy CreateLeaveFrontendStack  --profile=${PROFILE}
	cdk destroy CreateLeaveApiStack  --profile=${PROFILE}