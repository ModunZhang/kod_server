local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local index = KEYS[2]
local value = KEYS[3]
local indexs = ARGV
local fullIndex = modelName .. "." .. index .. ":" .. value
local objectId = redis.call("get", fullIndex)
if not objectId then return end
local fullKey = modelName .. ":" .. objectId
local lockKey = "lock." .. fullKey
assert(not redis.call("get", lockKey), "removeByIndex:" .. modelName .. "[" .. objectId .. "]" ..  " object is locked")
local objectString = redis.call("get", fullKey)
assert(objectString, "removeByIndex:" .. modelName .. "[" .. objectId .. "]" ..  " object not exist")
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
return redis.call("del", fullKey)