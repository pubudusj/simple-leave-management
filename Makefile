SES_FROM_EMAIL=
PROFILE=default

build:
	npm install
	cd ./lambda/CreateLeave && npm install
	cd ./frontend && npm install

deploy:
	SES_IDENTITY=${SES_FROM_EMAIL} cdk deploy CreateLeaveApiStack --profile=${PROFILE} --require-approval=never --outputs-file stack-output.json
	echo "VUE_APP_API_BASE_URL=$(shell cat stack-output.json | jq '.CreateLeaveApiStack.CreateLeaveLambdaApiUrl')" > frontend/.env
	cd ./frontend/ && npm run build --production
	SES_IDENTITY=${SES_FROM_EMAIL} cdk deploy CreateLeaveFrontendStack  --profile=${PROFILE} --require-approval=never

destroy:
	cdk destroy CreateLeaveFrontendStack  --profile=${PROFILE}
	cdk destroy CreateLeaveApiStack  --profile=${PROFILE}