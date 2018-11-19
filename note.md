#generating the ssl key and certificate
openssl genrsa -des3 -passout pass:x -out pajuani.auth.pass.key 2048

openssl rsa -passin pass:x -in pajuani.auth.pass.key -out pajuani.auth.key

rm pajuani.auth.pass.key

openssl req -new -key pajuani.auth.key -out pajuani.auth.csr

openssl x509 -req -sha256 -extfile v3.ext -days365 -in pajuani.auth.csr -signkey pajuani.auth.key -out pajuani.auth.crt

## docker-compose 

#installing docker-compose
download docker-compose from the repo (make sure you have the latest version)
    sudo curl -L "https://github.com/docker/compose/releases/download/1.23.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

give executable permission on the bin
    sudo chmod +x /usr/local/bin/docker-compose
test the installation
    docker-compose --version
#for the app
running in dev
    docker-compose up
see what it running 
    docker-compose ps
look up env var
    docker-compose run web env
stop 
    docker-compose stop
bring everything down
    docker-compose down --volumes