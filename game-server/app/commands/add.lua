local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local objectString = KEYS[2]
local object = cjson.decode(objectString)
local fullKey = modelName .. ":" .. object._id
assert(not redis.call("get", fullKey), "add:object " .. modelName .. "[" .. object._id .. "]" .. " already exist")
redis.call("set", fullKey, objectString)