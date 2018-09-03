#generating the ssl key and certificate
openssl genrsa -des3 -passout pass:x -out pajuani.auth.pass.key 2048

openssl rsa -passin pass:x -in pajuani.auth.pass.key -out pajuani.auth.key

rm pajuani.auth.pass.key

openssl req -new -key pajuani.auth.key -out pajuani.auth.csr

openssl x509 -req -sha256 -extfile v3.ext -days365 -in pajuani.auth.csr -signkey pajuani.auth.key -out pajuani.auth.crt