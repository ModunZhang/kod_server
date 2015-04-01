"use strict"

/**
 * Created by modun on 14-7-22.
 */

var _ = require("underscore")
var ShortId = require("shortid")
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var Consts = require("../consts/consts")
var GameDatas = require("../datas/GameDatas")
var AllianceBuilding = GameDatas.AllianceBuilding

var AllianceSchema = new Schema({
	_id:{type:String, required:true},
	serverId:{type:String, required:true},
	basicInfo:{
		name:{type:String, required:true, unique:true, index:true},
		tag:{type:String, required:true, unique:true, index:true},
		language:{type:String, required:true},
		terrain:{type:String, required:true},
		flag:{type:String, required:true},
		power:{type:Number, required:true, default:0},
		kill:{type:Number, required:true, default:0},
		joinType:{type:String, required:true, default:Consts.AllianceJoinType.All},
		honour:{type:Number, required:true, default:0},
		perception:{type:Number, required:true, default:AllianceBuilding.shrine[1].perception},
		perceptionRefreshTime:{type:Number, required:true, default:Date.now()},
		createTime:{type:Number, required:true, default:Date.now()},
		status:{type:String, required:true, default:Consts.AllianceStatus.Peace},
		statusStartTime:{type:Number, required:true, default:Date.now()},
		statusFinishTime:{type:Number, required:true, default:0}
	},
	countInfo:{
		kill:{type:Number, required:true, default:0},
		beKilled:{type:Number, required:true, default:0},
		routCount:{type:Number, required:true, default:0},
		winCount:{type:Number, required:true, default:0},
		failedCount:{type:Number, required:true, default:0}
	},
	notice:{type:String, required:false},
	desc:{type:String, required:false},
	titles:{
		archon:{type:String, required:true, default:"__archon"},
		general:{type:String, required:true, default:"__general"},
		quartermaster:{type:String, required:true, default:"__quartermaster"},
		supervisor:{type:String, required:true, default:"__supervisor"},
		elite:{type:String, required:true, default:"__elite"},
		member:{type:String, required:true, default:"__member"}
	},
	events:[{
		_id:false,
		category:{type:String, required:true},
		type:{type:String, required:true},
		time:{type:Number, required:true},
		key:{type:String, required:true},
		params:[String]
	}],
	members:[{
		_id:false,
		id:{type:String, required:true},
		mapId:{type:String, required:true},
		apnId:{type:String},
		language:{type:String, required:true},
		name:{type:String, required:true},
		icon:{type:String, required:true},
		level:{type:Number, required:true},
		keepLevel:{type:Number, required:true},
		wallLevel:{type:Number, required:true},
		wallHp:{type:Number, required:true},
		status:{type:String, required:true},
		helpedByTroopsCount:{type:Number, required:true},
		power:{type:Number, required:true},
		kill:{type:Number, required:true},
		loyalty:{type:Number, required:true},
		lastLoginTime:{type:Number, required:true},
		title:{type:String, required:true},
		donateStatus:{
			wood:{type:Number, required:true},
			stone:{type:Number, required:true},
			iron:{type:Number, required:true},
			food:{type:Number, required:true},
			coin:{type:Number, required:true},
			gem:{type:Number, required:true}
		},
		allianceExp:{
			woodExp:{type:Number, required:true},
			stoneExp:{type:Number, required:true},
			ironExp:{type:Number, required:true},
			foodExp:{type:Number, required:true},
			coinExp:{type:Number, required:true}
		},
		isProtected:{type:Boolean, required:true},
		lastThreeDaysKillData:[{
			kill:{type:Number, rquired:true},
			date:{type:String, required:true}
		}],
		lastRewardData:{
			type:{
				count:{type:Number, required:true},
				time:{type:Number, required:true}
			},
			required:false
		}
	}],
	buildings:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		level:{type:Number, required:true}
	}],
	villageLevels:{
		woodVillage:{type:Number, required:true, default:1},
		stoneVillage:{type:Number, required:true, default:1},
		ironVillage:{type:Number, required:true, default:1},
		foodVillage:{type:Number, required:true, default:1},
		coinVillage:{type:Number, required:true, default:1}
	},
	villages:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		level:{type:Number, required:true},
		resource:{type:Number, required:true}
	}],
	mapObjects:[{
		_id:false,
		id:{type:String, require:true},
		name:{type:String, required:true},
		location:{
			x:{type:Number, required:true},
			y:{type:Number, required:true}
		}
	}],
	joinRequestEvents:[{
		_id:false,
		id:{type:String, required:true},
		name:{type:String, required:true},
		icon:{type:String, required:true},
		level:{type:Number, required:true},
		power:{type:Number, required:true},
		requestTime:{type:Number, required:true}
	}],
	helpEvents:[{
		_id:false,
		id:{type:String, required:true},
		playerData:{
			id:{type:String, require:true},
			name:{type:String, required:true},
			vipExp:{type:Number, required:true}
		},
		eventData:{
			id:{type:String, required:true},
			type:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:Number, required:true},
			maxHelpCount:{type:Number, required:true},
			helpedMembers:[String]
		}
	}],
	shrineDatas:[{
		_id:false,
		stageName:{type:String, required:true},
		maxStar:{type:Number, required:true}
	}],
	shrineEvents:[{
		_id:false,
		id:{type:String, require:true},
		stageName:{type:String, required:true},
		createTime:{type:Number, required:true},
		startTime:{type:Number, required:true},
		playerTroops:[{
			_id:false,
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			dragon:{
				type:{type:String, required:true}
			},
			soldiers:[
				{
					_id:false,
					name:{type:String, required:true},
					count:{type:Number, required:true}
				}
			]
		}]
	}],
	shrineReports:[{
		_id:false,
		id:{type:String, required:true},
		stageName:{type:String, required:true},
		star:{type:Number, required:true},
		time:{type:Number, required:true},
		playerCount:{type:Number, required:true},
		playerAvgPower:{type:Number, required:true},
		playerDatas:[{
			_id:false,
			id:{type:String, required:true},
			name:{type:String, required:true},
			kill:{type:Number, required:true},
			rewards:[{
				_id:false,
				type:{type:String, required:true},
				name:{type:String, required:true},
				count:{type:Number, required:true}
			}]
		}],
		fightDatas:[{
			_id:false,
			roundDatas:[{
				_id:false,
				playerId:{type:String, required:true},
				playerName:{type:String, required:true},
				stageTroopNumber:{type:String, required:true},
				fightResult:{type:String, required:true},
				attackDragonFightData:{
					type:{type:String, required:true},
					hpMax:{type:Number, required:true},
					hp:{type:Number, required:true},
					hpDecreased:{type:Number, required:true},
					isWin:{type:Boolean, required:true}
				},
				defenceDragonFightData:{
					type:{type:String, required:true},
					hpMax:{type:Number, required:true},
					hp:{type:Number, required:true},
					hpDecreased:{type:Number, required:true},
					isWin:{type:Boolean, required:true}
				},
				attackSoldierRoundDatas:[{
					_id:false,
					soldierName:{type:String, required:true},
					soldierStar:{type:Number, required:true},
					soldierCount:{type:Number, required:true},
					soldierDamagedCount:{type:Number, required:true},
					soldierWoundedCount:{type:Number, required:true},
					morale:{type:Number, required:true},
					moraleDecreased:{type:Number, required:true},
					isWin:{type:Boolean, required:true}
				}],
				defenceSoldierRoundDatas:[{
					_id:false,
					soldierName:{type:String, required:true},
					soldierStar:{type:Number, required:true},
					soldierCount:{type:Number, required:true},
					soldierDamagedCount:{type:Number, required:true},
					soldierWoundedCount:{type:Number, required:true},
					morale:{type:Number, required:true},
					moraleDecreased:{type:Number, required:true},
					isWin:{type:Boolean, required:true}
				}]
			}]
		}]
	}],
	villageEvents:[{
		_id:false,
		id:{type:String, required:true},
		startTime:{type:Number, required:true},
		finishTime:{type:Number, required:true},
		playerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			},
			dragon:{
				type:{type:String, required:true}
			},
			soldiers:[{
				_id:false,
				name:{type:String, required:true},
				count:{type:Number, required:true}
			}],
			woundedSoldiers:[{
				_id:false,
				name:{type:String, required:true},
				count:{type:Number, required:true}
			}],
			rewards:[{
				_id:false,
				type:{type:String, required:true},
				name:{type:String, required:true},
				count:{type:Number, required:true}
			}]
		},
		villageData:{
			id:{type:String, required:true},
			type:{type:String, required:true},
			level:{type:Number, required:true},
			collectTotal:{type:Number, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		}
	}],
	fightRequests:[String],
	allianceFight:{
		type:{
			mergeStyle:{type:String, required:true},
			attackAllianceId:{type:String, required:true},
			defenceAllianceId:{type:String, required:true},
			attackPlayerKills:[{
				id:{type:Number, required:true},
				name:{type:Number, required:true},
				kill:{type:Number, required:true}
			}],
			attackAllianceCountData:{
				kill:{type:Number, required:true},
				routCount:{type:Number, required:true},
				strikeCount:{type:Number, required:true},
				strikeSuccessCount:{type:Number, required:true},
				attackCount:{type:Number, required:true},
				attackSuccessCount:{type:Number, required:true}
			},
			defencePlayerKills:[{
				id:{type:Number, required:true},
				name:{type:Number, required:true},
				kill:{type:Number, required:true}
			}],
			defenceAllianceCountData:{
				kill:{type:Number, required:true},
				routCount:{type:Number, required:true},
				strikeCount:{type:Number, required:true},
				strikeSuccessCount:{type:Number, required:true},
				attackCount:{type:Number, required:true},
				attackSuccessCount:{type:Number, required:true}
			}
		},
		required:false
	},
	allianceFightReports:[{
		_id:false,
		id:{type:String, required:true},
		mergeStyle:{type:String, required:true},
		attackAllianceId:{type:String, required:true},
		defenceAllianceId:{type:String, required:true},
		fightResult:{type:String, required:true},
		fightTime:{type:Number, required:true},
		attackAlliance:{
			name:{type:String, required:true},
			tag:{type:String, required:true},
			flag:{type:String, required:true},
			kill:{type:Number, required:true},
			routCount:{type:Number, required:true},
			strikeCount:{type:Number, required:true},
			strikeSuccessCount:{type:Number, required:true},
			attackCount:{type:Number, required:true},
			attackSuccessCount:{type:Number, required:true}
		},
		defenceAlliance:{
			name:{type:String, required:true},
			tag:{type:String, required:true},
			flag:{type:String, required:true},
			kill:{type:Number, required:true},
			routCount:{type:Number, required:true},
			strikeCount:{type:Number, required:true},
			strikeSuccessCount:{type:Number, required:true},
			attackCount:{type:Number, required:true},
			attackSuccessCount:{type:Number, required:true}
		}
	}],
	strikeMarchEvents:[{
		_id:false,
		id:{type:String, required:true},
		marchType:{type:String, required:true},
		startTime:{type:Number, required:true},
		arriveTime:{type:Number, required:true},
		attackPlayerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			dragon:{
				type:{type:String, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		},
		defencePlayerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		},
		defenceVillageData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		}
	}],
	strikeMarchReturnEvents:[{
		_id:false,
		id:{type:String, required:true},
		marchType:{type:String, required:true},
		startTime:{type:Number, required:true},
		arriveTime:{type:Number, required:true},
		attackPlayerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			dragon:{
				type:{type:String, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			},
			rewards:[{
				_id:false,
				type:{type:String, required:true},
				name:{type:String, required:true},
				count:{type:Number, required:true}
			}]
		},
		defencePlayerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		},
		defenceVillageData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		}
	}],
	attackMarchEvents:[{
		_id:false,
		id:{type:String, required:true},
		marchType:{type:String, required:true},
		startTime:{type:Number, required:true},
		arriveTime:{type:Number, required:true},
		attackPlayerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			dragon:{
				type:{type:String, required:true}
			},
			soldiers:[{
				_id:false,
				name:{type:String, required:true},
				count:{type:Number, required:true}
			}],
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		},
		defencePlayerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		},
		defenceVillageData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:Number, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		},
		defenceShrineData:{
			shrineEventId:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		}
	}],
	attackMarchReturnEvents:[{
		_id:false,
		id:{type:String, required:true},
		marchType:{type:String, required:true},
		startTime:{type:Number, required:true},
		arriveTime:{type:Number, required:true},
		attackPlayerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			dragon:{
				type:{type:String, required:true}
			},
			soldiers:[{
				_id:false,
				name:{type:String, required:true},
				count:{type:Number, required:true}
			}],
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			},
			woundedSoldiers:[{
				_id:false,
				name:{type:String, required:true},
				count:{type:Number, required:true}
			}],
			rewards:[{
				_id:false,
				type:{type:String, required:true},
				name:{type:String, required:true},
				count:{type:Number, required:true}
			}]
		},
		defencePlayerData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			cityName:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		},
		defenceVillageData:{
			id:{type:String, required:true},
			name:{type:String, required:true},
			level:{type:String, required:true},
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		},
		defenceShrineData:{
			location:{
				x:{type:Number, required:true},
				y:{type:Number, required:true}
			},
			alliance:{
				id:{type:String, required:true},
				name:{type:String, required:true},
				tag:{type:String, required:true}
			}
		}
	}],
	items:[{
		_id:false,
		name:{type:String, required:true},
		count:{type:Number, required:true}
	}],
	itemLogs:[{
		_id:false,
		type:{type:String, required:true},
		playerName:{type:String, required:true},
		itemName:{type:String, required:true},
		itemCount:{type:Number, required:true},
		time:{type:Number, required:true}
	}]
})

module.exports = mongoose.model('alliance', AllianceSchema)