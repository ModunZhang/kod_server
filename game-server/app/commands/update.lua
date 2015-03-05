local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local objectStringNew = KEYS[2]
local objectNew = cjson.decode(objectStringNew)
local fullKey = modelName .. ":" .. objectNew._id
local lockKey = "lock." .. fullKey
assert(redis.call("get", lockKey), "update:" .. modelName .. "[" .. objectNew._id .. "]" ..  "can not update a object directly")
local objectStringOld = redis.call("get", fullKey)
assert(objectStringOld, "update:object not exist")
redis.call("set", fullKey, objectStringNew)
return redis.call("del", lockKey)