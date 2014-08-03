#!/bin/bash

ServerDir=../game-server/app/datas
GameDataDir=../gameData

python ./buildGameData/exportGameData.py $GameDataDir $ServerDir "server"