local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local lockSeconds = 2 * 1000
local modelName = KEYS[1]
local objectString = KEYS[2]
local now = tonumber(KEYS[3])
local expireTime = now + lockSeconds
local object = cjson.decode(objectString)
local fullKey = modelName .. ":" .. object._id
local lockKey = "lock." .. fullKey
assert(not redis.call("get", fullKey), "add:object " .. modelName .. "[" .. object._id .. "]" .. " already exist")
redis.call("set", fullKey, objectString)
redis.call("set", lockKey, expireTime)