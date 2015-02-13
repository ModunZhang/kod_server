"use strict"

var houses = {}
module.exports = houses

houses["dwelling"] = {
	type:"dwelling",
	width:1,
	height:1,
	output:"citizen",
	limitBy:"townHall",
	preCondition:"building_keep_1",
	desc:"住宅"
}
houses["woodcutter"] = {
	type:"woodcutter",
	width:1,
	height:1,
	output:"wood",
	limitBy:"lumbermill",
	preCondition:"house_dwelling_1",
	desc:"木工小屋"
}
houses["farmer"] = {
	type:"farmer",
	width:1,
	height:1,
	output:"food",
	limitBy:"mill",
	preCondition:"house_dwelling_1",
	desc:"农夫小屋"
}
houses["quarrier"] = {
	type:"quarrier",
	width:1,
	height:1,
	output:"stone",
	limitBy:"stoneMason",
	preCondition:"house_dwelling_1",
	desc:"石匠小屋"
}
houses["miner"] = {
	type:"miner",
	width:1,
	height:1,
	output:"iron",
	limitBy:"foundry",
	preCondition:"house_dwelling_1",
	desc:"矿工小屋"
}
