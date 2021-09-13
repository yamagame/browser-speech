#!/bin/bash
export COMMAND_DIR=`pwd`/command
export SCENARIO_DIR=`pwd`/scenario
export LOGGER_HOST=http://localhost:4200/logger
export ROBOT_SERVER=http://localhost:3090
export BACKEND_HOST=http://localhost:4100
export NODE_PATH=`pwd`/dist
cd $NODE_PATH
node index.js | tee ../../../scenario-engine.log
