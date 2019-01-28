start-dev-environment:
	$(shell . ./env-config.sh)

start-dev-service:
		./env-config.sh 
		docker-compose -f docker-compose.dev.yml up --build -d

restart-dev-service: start-dev-environment
		docker-compose restart

rm-dev-service:
		docker-compose kill
		docker-compose rm -f

reset-dev-service: rm-dev-service start-dev-service

start-environment:
		sh . env-config.sh

start-service: start-environment
		docker-compose up --build -d

restart-service: start-environment
		docker-compose restart

rm-service:
		docker-compose kill
		docker-compose rm -f

reset-service: rm-service start-service