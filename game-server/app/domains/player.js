/**
 * Created by modun on 14-7-22.
 */
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var GameDatas = require("../datas/GameDatas")

var LocationInitData = GameDatas.LocationInitData.locations

var playerSchema = new Schema({
	basicInfo:{
		deviceId:{type:String, index:true, unique:true, required:true},
		registerTime:{type:Number, required:true, default:Date.now()},
		lastLoginTime:{type:Number, required:true, default:Date.now()},
		name:{type:String, index:true, unique:true, required:true},
		icon:{type:String, required:true},
		level:{type:Number, required:true, default:1},
		levelExp:{type:Number, required:true, default:0},
		power:{type:Number, required:true, default:0},
		vip:{type:Number, required:true, default:1},
		vipExp:{type:Number, required:true, default:0},
		gem:{type:Number, required:true, default:2000}
	},
	resource:{
		wood:{type:Number, required:true, default:5000},
		stone:{type:Number, required:true, default:5000},
		iron:{type:Number, required:true, default:5000},
		population:{type:Number, required:true, default:5000},
		food:{type:Number, required:true, default:5000},
		gold:{type:Number, required:true, default:5000}
	},
	buildings:{
		location_1:{//城堡
			type:{type:String, required:true, default:LocationInitData[1].type},
			level:{type:Number, required:true, default:1},
			location:{type:Number, required:true, default:1},
			updateTime:{type:Number, required:true, default:0}
		},
		location_2:{//瞭望塔
			type:{type:String, required:true, default:LocationInitData[2].type},
			level:{type:Number, required:true, default:1},
			location:{type:Number, required:true, default:1},
			updateTime:{type:Number, required:true, default:0}
		},
		location_3:{//资源仓库
			type:{type:String, required:true, default:LocationInitData[3].type},
			level:{type:Number, required:true, default:1},
			location:{type:Number, required:true, default:3},
			updateTime:{type:Number, required:true, default:0}
		},
		location_4:{//龙巢
			type:{type:String, required:true, default:LocationInitData[4].type},
			level:{type:Number, required:true, default:1},
			location:{type:Number, required:true, default:4},
			updateTime:{type:Number, required:true, default:0}
		},
		location_5:{//医院
			type:{type:String, required:true, default:LocationInitData[5].type},
			level:{type:Number, required:true, default:0},
			location:{type:Number, required:true, default:5},
			updateTime:{type:Number, required:true, default:0}
		},
		location_6:{//材料库房
			type:{type:String, required:true, default:LocationInitData[6].type},
			level:{type:Number, required:true, default:0},
			location:{type:Number, required:true, default:6},
			updateTime:{type:Number, required:true, default:0}
		},
		location_7:{//军用帐篷
			type:{type:String, required:true, default:LocationInitData[7].type},
			level:{type:Number, required:true, default:0},
			location:{type:Number, required:true, default:7},
			updateTime:{type:Number, required:true, default:0}
		},
		location_8:{//兵营
			type:{type:String, required:true, default:LocationInitData[8].type},
			level:{type:Number, required:true, default:0},
			location:{type:Number, required:true, default:8},
			updateTime:{type:Number, required:true, default:0}
		},
		location_9:{//铁匠铺
			type:{type:String, required:true, default:LocationInitData[9].type},
			level:{type:Number, required:true, default:0},
			location:{type:Number, required:true, default:9},
			updateTime:{type:Number, required:true, default:0}
		},
		location_10:{//锻造工坊
			type:{type:String, required:true, default:LocationInitData[10].type},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:10},
			updateTime:{type:Number, required:true, default:0}
		},
		location_11:{//石匠工坊
			type:{type:String, required:true, default:LocationInitData[11].type},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:11},
			updateTime:{type:Number, required:true, default:0}
		},
		location_12:{//锯木工房
			type:{type:String, required:true, default:LocationInitData[12].type},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:12},
			updateTime:{type:Number, required:true, default:0}
		},
		location_13:{//磨坊
			type:{type:String, required:true, default:LocationInitData[13].type},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:13},
			updateTime:{type:Number, required:true, default:0}
		},
		location_14:{//工具作坊
			type:{type:String, required:true, default:LocationInitData[14].type},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:14},
			updateTime:{type:Number, required:true, default:0}
		},
		location_15:{//市政厅
			type:{type:String, required:true, default:LocationInitData[15].type},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:15},
			updateTime:{type:Number, required:true, default:0}
		},
		location_16:{//学院
			type:{type:String, required:true, default:LocationInitData[16].type},
			level:{type:Number, required:true, default:-1},
			location:{type:Number, required:true, default:16},
			updateTime:{type:Number, required:true, default:0}
		}
	}
})

module.exports = mongoose.model('player', playerSchema)