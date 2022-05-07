SES_FROM_EMAIL=''

build:
	npm install
	cd ./lambda/CreateLeave && npm install
	cd ./frontend && npm install

deploy:
	SES_IDENTITY=${SES_FROM_EMAIL} cdk deploy CreateLeaveApiStack --require-approval=never
	SES_IDENTITY=${SES_FROM_EMAIL} cdk deploy CreateLeaveFrontendStack --require-approval=never