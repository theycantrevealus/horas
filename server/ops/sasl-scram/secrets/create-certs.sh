#!/bin/bash


# Reset all stat first
echo "confluent" | keytool -delete -alias CARoot -keystore ./broker-1/kafka.broker-1.truststore.jks; echo;\
  echo "confluent" | keytool -delete -alias CARoot -keystore ./broker-2/kafka.broker-2.truststore.jks; echo;\
  echo "confluent" | keytool -delete -alias CARoot -keystore ./broker-3/kafka.broker-3.truststore.jks; echo;\
  echo "confluent" | keytool -delete -alias CARoot -keystore ./producer/kafka.producer.truststore.jks; echo;\
  echo "confluent" | keytool -delete -alias CARoot -keystore ./consumer/kafka.consumer.truststore.jks; echo;\

  echo "confluent" | keytool -delete -alias CARoot -keystore ./broker-1/kafka.broker-1.keystore.jks; echo;\
  echo "confluent" | keytool -delete -alias CARoot -keystore ./broker-2/kafka.broker-2.keystore.jks; echo;\
  echo "confluent" | keytool -delete -alias CARoot -keystore ./broker-3/kafka.broker-3.keystore.jks; echo;\
  echo "confluent" | keytool -delete -alias CARoot -keystore ./producer/kafka.producer.keystore.jks; echo;\
  echo "confluent" | keytool -delete -alias CARoot -keystore ./consumer/kafka.consumer.keystore.jks; echo;\

  echo "confluent" | keytool -delete -alias broker-1 -keystore broker-1/kafka.broker-1.keystore.jks; echo;\
  echo "confluent" | keytool -delete -alias broker-2 -keystore broker-2/kafka.broker-2.keystore.jks; echo;\
  echo "confluent" | keytool -delete -alias broker-3 -keystore broker-3/kafka.broker-3.keystore.jks; echo;\
  echo "confluent" | keytool -delete -alias producer -keystore producer/kafka.producer.keystore.jks; echo;\
  echo "confluent" | keytool -delete -alias consumer -keystore consumer/kafka.consumer.keystore.jks;

set -o nounset \
    -o errexit \
    -o verbose \
    -o xtrace

# Generate CA key
openssl req -new -x509 -keyout snakeoil-ca-1.key -out snakeoil-ca-1.crt -days 365 -subj '/CN=ca1.test.husseinjoe.io/OU=Dev/O=HusseinJoe/L=Melbourne/ST=VIC/C=AU' -passin pass:confluent -passout pass:confluent
# openssl req -new -x509 -keyout snakeoil-ca-2.key -out snakeoil-ca-2.crt -days 365 -subj '/CN=ca2.test.husseinjoe.io/OU=TEST/O=CONFLUENT/L=PaloAlto/S=Ca/C=US' -passin pass:confluent -passout pass:confluent

# Kafkacat
openssl genrsa -des3 -passout "pass:confluent" -out kafkacat.client.key 1024
openssl req -passin "pass:confluent" -passout "pass:confluent" -key kafkacat.client.key -new -out kafkacat.client.req -subj '/CN=kafkacat.test.husseinjoe.io/OU=TEST/O=CONFLUENT/L=PaloAlto/S=Ca/C=US'
openssl x509 -req -CA snakeoil-ca-1.crt -CAkey snakeoil-ca-1.key -in kafkacat.client.req -out kafkacat-ca1-signed.pem -days 9999 -CAcreateserial -passin "pass:confluent"


for i in broker-1 broker-2 broker-3 producer consumer
do
	echo $i

	if [ -d ./$i ]; then
    echo "Folder exist"
  else
    mkdir ./$i
  fi

	# Create keystores
	keytool -genkey -noprompt \
				 -alias $i \
				 -dname "CN=kafka-$i, OU=Dev, O=HusseinJoe, L=Melbourne, ST=VIC, C=AU" \
				 -keystore ./$i/kafka.$i.keystore.jks \
				 -keyalg RSA \
				 -storepass confluent \
				 -keypass confluent

	# Create CSR, sign the key and import back into keystore
	echo "yes" | keytool -keystore ./$i/kafka.$i.keystore.jks -alias $i -certreq -file $i.csr -storepass confluent -keypass confluent

	echo "yes" | openssl x509 -req -CA snakeoil-ca-1.crt -CAkey snakeoil-ca-1.key -in $i.csr -out $i-ca1-signed.crt -days 9999 -CAcreateserial -passin pass:confluent

	echo "yes" | keytool -keystore ./$i/kafka.$i.keystore.jks -alias CARoot -import -file snakeoil-ca-1.crt -storepass confluent -keypass confluent

	echo "yes" | keytool -keystore ./$i/kafka.$i.keystore.jks -alias $i -import -file $i-ca1-signed.crt -storepass confluent -keypass confluent

	# Create truststore and import the CA cert.
	echo "yes" | keytool -keystore ./$i/kafka.$i.truststore.jks -alias CARoot -import -file snakeoil-ca-1.crt -storepass confluent -keypass confluent

  echo "confluent" > ./$i/${i}_sslkey_creds
  echo "confluent" > ./$i/${i}_keystore_creds
  echo "confluent" > ./$i/${i}_truststore_creds
done
