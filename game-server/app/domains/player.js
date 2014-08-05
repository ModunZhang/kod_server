/**
 * Created by modun on 14-7-22.
 */
var mongoose = require("mongoose")
var Schema = mongoose.Schema

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
		keep:{//城堡
			name:{type:String, required:true, default:"keep"},
			level:{type:Number, required:true, default:1},
			updateTime:{type:Number, required:true, default:0}
		},
		watchTower:{//瞭望塔
			name:{type:String, required:true, default:"watchTower"},
			level:{type:Number, required:true, default:1},
			updateTime:{type:Number, required:true, default:0}
		},
		hospital:{//医院
			name:{type:String, required:true, default:"hospital"},
			level:{type:Number, required:true, default:0},
			updateTime:{type:Number, required:true, default:0}
		},
		foundry:{//锻造工坊
			name:{type:String, required:true, default:"foundry"},
			level:{type:Number, required:true, default:-1},
			updateTime:{type:Number, required:true, default:0}
		},
		dragonEyire:{//龙巢
			name:{type:String, required:true, default:"dragonEyire"},
			level:{type:Number, required:true, default:1}
		},
		warehouse:{//资源仓库
			name:{type:String, required:true, default:"warehouse"},
			level:{type:Number, required:true, default:1},
			updateTime:{type:Number, required:true, default:0}
		},
		materialDepot:{//材料库房
			name:{type:String, required:true, default:"materialDepot"},
			level:{type:Number, required:true, default:0},
			updateTime:{type:Number, required:true, default:0}
		},
		stoneMason:{//石匠工坊
			name:{type:String, required:true, default:"stoneMason"},
			level:{type:Number, required:true, default:-1},
			updateTime:{type:Number, required:true, default:0}
		},
		blackSmith:{//铁匠铺
			name:{type:String, required:true, default:"blackSmith"},
			level:{type:Number, required:true, default:1},
			updateTime:{type:Number, required:true, default:0}
		},
		barracks:{//兵营
			name:{type:String, required:true, default:"barracks"},
			level:{type:Number, required:true, default:1},
			updateTime:{type:Number, required:true, default:0}
		},
		armyCamp:{//军用帐篷
			name:{type:String, required:true, default:"armyCamp"},
			level:{type:Number, required:true, default:0},
			updateTime:{type:Number, required:true, default:0}
		},
		lumbermill:{//锯木工房
			name:{type:String, required:true, default:"lumbermill"},
			level:{type:Number, required:true, default:-1},
			updateTime:{type:Number, required:true, default:0}
		},
		academy:{//学院
			name:{type:String, required:true, default:"academy"},
			level:{type:Number, required:true, default:-1},
			updateTime:{type:Number, required:true, default:0}
		},
		townHall:{//市政厅
			name:{type:String, required:true, default:"townHall"},
			level:{type:Number, required:true, default:-1},
			updateTime:{type:Number, required:true, default:0}
		},
		toolShop:{//工具作坊
			name:{type:String, required:true, default:"toolShop"},
			level:{type:Number, required:true, default:-1},
			updateTime:{type:Number, required:true, default:0}
		},
		mill:{//磨坊
			name:{type:String, required:true, default:"mill"},
			level:{type:Number, required:true, default:-1},
			updateTime:{type:Number, required:true, default:0}
		}
	}
})

module.exports = mongoose.model('player', playerSchema)