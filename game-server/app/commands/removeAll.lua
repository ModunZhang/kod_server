local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local indexs = ARGV
local keys = modelName .. ":*"
local fullKeys = redis.call("keys", keys)
if not fullKeys or #fullKeys == 0 then return end
for i,v in ipairs(fullKeys) do
	local fullKey = v
	local lockKey = "lock." .. fullKey
	local objectString = redis.call("get", fullKey)
	local object = cjson.decode(objectString)
	for _, index in ipairs(indexs) do
	    local value = object
	    local levels = split(index, ".")
	    for _, current in ipairs(levels) do
	        value = value[current]
	    end
	    local key = modelName .. "." .. index .. ":" .. value
	    redis.call("del", key)
	end
	redis.call("del", fullKey)
	redis.call("del", lockKey)
end