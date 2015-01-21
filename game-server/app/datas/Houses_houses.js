"use strict"

var houses = {}
module.exports = houses

houses["dwelling"] = {
	type:"dwelling",
	width:1,
	height:1,
	output:"citizen",
	limitBy:"townHall",
	desc:"住宅"
}
houses["woodcutter"] = {
	type:"woodcutter",
	width:1,
	height:1,
	output:"wood",
	limitBy:"lumbermill",
	desc:"木工小屋"
}
houses["farmer"] = {
	type:"farmer",
	width:1,
	height:1,
	output:"food",
	limitBy:"mill",
	desc:"农夫小屋"
}
houses["quarrier"] = {
	type:"quarrier",
	width:1,
	height:1,
	output:"stone",
	limitBy:"stoneMason",
	desc:"石匠小屋"
}
houses["miner"] = {
	type:"miner",
	width:1,
	height:1,
	output:"iron",
	limitBy:"foundry",
	desc:"矿工小屋"
}
