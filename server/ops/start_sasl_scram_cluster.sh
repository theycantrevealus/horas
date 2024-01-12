#!/usr/bin/env bash
echo "Current working dir : ${PWD}"
echo "======================================="
export KAFKA_SSL_SECRETS_DIR=$PWD/secrets
export KAFKA_SASL_SCRAM_SECRETS_DIR=$PWD/sasl-scram/secrets
cd $PWD/sasl-scram/
docker-compose -f docker-compose-scram.yml up -d --remove-orphans
