/**
 * Created by modun on 14-7-22.
 */
var mongoose = require("mongoose")
var Schema = mongoose.Schema

var playerSchema = new Schema({
	// basic info
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
	gem:{type:Number, required:true, default:0},
	// resources
	wood:{type:Number, required:true, default:0},
	stone:{type:Number, required:true, default:0},
	iron:{type:Number, required:true, default:0},
	population:{type:Number, required:true, default:0},
	food:{type:Number, required:true, default:0},
	gold:{type:Number, required:true, default:0}
})

module.exports = mongoose.model('player', playerSchema)