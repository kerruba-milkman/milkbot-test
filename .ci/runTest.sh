#!/usr/bin/env sh

isDone=1
while [ "$isDone" != "0" ];
do
    curl -s "http://localstack:4566" > /dev/null
    isDone=$?
    echo "Testing http://localstack:4566 - Response: $isDone"
    if [ "$isDone" != "0" ]
    then
      echo "Sleeping"
      sleep 10
    fi
done
echo "done, starting with tests"

npm run test
