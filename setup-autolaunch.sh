#!/bin/sh
sudo cp scenario-server.service /lib/systemd/system/
sudo cp scenario-engine.service /lib/systemd/system/
sudo cp log-server.service /lib/systemd/system/
sudo systemctl enable scenario-server.service
sudo systemctl enable scenario-engine.service
sudo systemctl enable log-server.service
